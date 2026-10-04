"use client";

import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";

import { BADGES } from "@/data/badges";
import { PLANS } from "@/data/plans";
import { celebrate, type Celebration, type Origin } from "@/lib/celebrations";
import { BOOKS } from "@/lib/canon";
import { dayKey, type DayKey } from "@/lib/day";
import {
  DAILY_GOAL,
  MASTERED_BOX,
  levelFor,
  nextReview,
  streakInfo,
  xpFor,
  type Action,
  type DayLog,
  type GameSnapshot,
  type LevelInfo,
  type StreakInfo,
} from "@/lib/game";

// Everything personal lives in this browser only. One versioned key, Zod-checked on
// read so a corrupted or hand-edited value falls back to empty instead of crashing.
// v2 fields all have defaults, so v1 data loads unchanged.

const STORAGE_KEY = "selah:v1";

const memorySchema = z.object({
  reference: z.string(),
  text: z.string().max(2000),
  translation: z.string(),
  verseIds: z.array(z.string()).min(1).max(3),
  box: z.number().int().min(1).max(MASTERED_BOX),
  due: z.string(),
  addedAt: z.string(),
});

const studySchema = z.object({
  highlights: z.record(z.string(), z.object({ createdAt: z.string() })).default({}),
  notes: z.record(z.string(), z.object({ text: z.string().max(5000), updatedAt: z.string() })).default({}),
  planProgress: z.record(z.string(), z.array(z.number().int())).default({}),
  activePlan: z.string().nullable().default(null),
  lastRead: z.object({ translation: z.string(), chapterId: z.string() }).nullable().default(null),
  translation: z.string().default("bsb"),
  // ── v2: game ──
  xp: z.number().int().min(0).default(0),
  days: z
    .record(z.string(), z.object({ xp: z.number().int().min(0), by: z.record(z.string(), z.number()), chapters: z.array(z.string()).default([]) }))
    .default({}),
  chaptersRead: z.record(z.string(), z.string()).default({}),
  memory: z.record(z.string(), memorySchema).default({}),
  quiz: z.record(z.string(), z.object({ correct: z.boolean(), answer: z.string() })).default({}),
  badges: z.record(z.string(), z.string()).default({}),
});

export type StudyState = z.infer<typeof studySchema>;
export type Highlights = StudyState["highlights"];
export type MemoryCard = z.infer<typeof memorySchema>;

const EMPTY: StudyState = studySchema.parse({});

let cache: StudyState | null = null;
const listeners = new Set<() => void>();

function readStorage(): StudyState {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return EMPTY;
    const result = studySchema.safeParse(JSON.parse(rawValue));
    return result.success ? result.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): StudyState {
  if (cache === null) cache = readStorage();
  return cache;
}

function getServerSnapshot(): StudyState {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY) return;
    cache = readStorage();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: StudyState): void {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota: keep the in-memory state so the session still works.
  }
  listeners.forEach((listener) => listener());
}

export function useStudy(): StudyState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── Derived game view ─────────────────────────────────────────────

export function booksComplete(chaptersRead: Record<string, string>): Set<string> {
  return new Set(
    BOOKS.filter((book) => {
      for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
        if (!chaptersRead[`${book.id}.${chapter}`]) return false;
      }
      return true;
    }).map((book) => book.id),
  );
}

function snapshotOf(state: StudyState, today: DayKey): GameSnapshot {
  const streak = streakInfo(state.days, today);
  return {
    chaptersRead: new Set(Object.keys(state.chaptersRead)),
    booksComplete: booksComplete(state.chaptersRead),
    notes: Object.keys(state.notes).length,
    mastered: Object.values(state.memory).filter((card) => card.box >= MASTERED_BOX).length,
    quizCorrect: Object.values(state.quiz).filter((entry) => entry.correct).length,
    longestStreak: streak.longest,
    perfectWeeks: streak.perfectWeeks,
    plansComplete: PLANS.filter((plan) => (state.planProgress[plan.id] ?? []).length >= plan.days.length).length,
  };
}

export interface GameView {
  today: DayKey;
  todayXp: number;
  goalProgress: number;
  level: LevelInfo;
  streak: StreakInfo;
  dueCount: number;
}

export function useGame(): GameView & { state: StudyState } {
  const state = useStudy();
  return useMemo(() => {
    const today = dayKey();
    const todayXp = state.days[today]?.xp ?? 0;
    return {
      state,
      today,
      todayXp,
      goalProgress: Math.min(1, todayXp / DAILY_GOAL),
      level: levelFor(state.xp),
      streak: streakInfo(state.days, today),
      dueCount: Object.values(state.memory).filter((card) => card.box < MASTERED_BOX && card.due <= today).length,
    };
  }, [state]);
}

// ── The one write path: change state, award XP, detect celebrations ──

function applyAward(state: StudyState, action: Action, today: DayKey): { state: StudyState; gained: number } {
  const log: DayLog = state.days[today] ?? { xp: 0, by: {} };
  const gained = xpFor(action, log);
  if (gained === 0) return { state, gained };
  const day = state.days[today];
  return {
    gained,
    state: {
      ...state,
      xp: state.xp + gained,
      days: {
        ...state.days,
        [today]: {
          xp: (day?.xp ?? 0) + gained,
          by: { ...(day?.by ?? {}), [action]: (day?.by[action] ?? 0) + gained },
          chapters: day?.chapters ?? [],
        },
      },
    },
  };
}

function mutate(recipe: (state: StudyState, today: DayKey) => StudyState, awards: Action[] = [], origin: Origin | null = null): void {
  const today = dayKey();
  const before = getSnapshot();
  let next = recipe(before, today);
  let gained = 0;
  for (const action of awards) {
    const result = applyAward(next, action, today);
    next = result.state;
    gained += result.gained;
  }

  const snapshot = snapshotOf(next, today);
  const newBadges = BADGES.filter((badge) => !next.badges[badge.id] && badge.earned(snapshot));
  if (newBadges.length > 0) {
    const stamp = new Date().toISOString();
    next = { ...next, badges: { ...next.badges, ...Object.fromEntries(newBadges.map((badge) => [badge.id, stamp])) } };
  }
  write(next);

  const events: Celebration[] = [];
  if (gained > 0) events.push({ kind: "xp", amount: gained, origin });
  const xpBefore = before.days[today]?.xp ?? 0;
  const xpAfter = next.days[today]?.xp ?? 0;
  if (xpBefore < DAILY_GOAL && xpAfter >= DAILY_GOAL) events.push({ kind: "goal" });
  const booksBefore = booksComplete(before.chaptersRead);
  for (const bookId of snapshot.booksComplete) if (!booksBefore.has(bookId)) events.push({ kind: "book", bookId });
  const levelBefore = levelFor(before.xp).index;
  const levelAfter = levelFor(next.xp).index;
  if (levelAfter > levelBefore) events.push({ kind: "level", levelIndex: levelAfter });
  for (const badge of newBadges) events.push({ kind: "badge", badgeId: badge.id });
  celebrate(events);
}

// ── Highlights ────────────────────────────────────────────────────

/**
 * Group toggle: if every selected verse is already highlighted, clear them all;
 * otherwise highlight the whole selection (keeping existing createdAt stamps).
 */
export function applyHighlight(current: Highlights, selected: string[], now: string): Highlights {
  const next = { ...current };
  const allHighlighted = selected.every((verseId) => Boolean(current[verseId]));
  for (const verseId of selected) {
    if (allHighlighted) delete next[verseId];
    else next[verseId] = current[verseId] ?? { createdAt: now };
  }
  return next;
}

export function highlightVerses(selected: string[], origin: Origin | null = null): void {
  const current = getSnapshot().highlights;
  const added = selected.filter((verseId) => !current[verseId]).length;
  const removing = selected.every((verseId) => Boolean(current[verseId]));
  mutate(
    (state) => ({ ...state, highlights: applyHighlight(state.highlights, selected, new Date().toISOString()) }),
    removing ? [] : Array<Action>(added).fill("highlight"),
    origin,
  );
}

// ── Notes ─────────────────────────────────────────────────────────

export function saveNote(verseId: string, text: string, origin: Origin | null = null): void {
  const isNew = !getSnapshot().notes[verseId];
  const trimmed = text.trim().slice(0, 5000);
  mutate(
    (state) => {
      const notes = { ...state.notes };
      if (trimmed) notes[verseId] = { text: trimmed, updatedAt: new Date().toISOString() };
      else delete notes[verseId];
      return { ...state, notes };
    },
    isNew && trimmed ? ["note"] : [],
    origin,
  );
}

// ── Chapters ──────────────────────────────────────────────────────

/** Called when the reader reaches the end of a chapter after a real read. */
export function markChapterRead(chapterId: string): void {
  const today = dayKey();
  if (getSnapshot().days[today]?.chapters.includes(chapterId)) return;
  mutate(
    (state) => {
      const day = state.days[today] ?? { xp: 0, by: {}, chapters: [] };
      return {
        ...state,
        chaptersRead: state.chaptersRead[chapterId] ? state.chaptersRead : { ...state.chaptersRead, [chapterId]: new Date().toISOString() },
        days: { ...state.days, [today]: { ...day, chapters: [...day.chapters, chapterId] } },
      };
    },
    ["chapter"],
  );
}

export function checkIn(origin: Origin | null = null): void {
  mutate((state) => state, ["checkin"], origin);
}

// ── Memory ────────────────────────────────────────────────────────

export function memorize(card: Omit<MemoryCard, "box" | "due" | "addedAt">): string {
  const id = card.verseIds.join("+");
  mutate((state, today) =>
    state.memory[id]
      ? state
      : { ...state, memory: { ...state.memory, [id]: { ...card, box: 1, due: today, addedAt: new Date().toISOString() } } },
  );
  return id;
}

export function forgetMemory(id: string): void {
  mutate((state) => {
    const memory = { ...state.memory };
    delete memory[id];
    return { ...state, memory };
  });
}

export function recordPractice(id: string, correct: boolean, origin: Origin | null = null): void {
  const card = getSnapshot().memory[id];
  if (!card) return;
  const today = dayKey();
  const review = nextReview(card.box, correct, today);
  const awards: Action[] = correct ? [review.box >= MASTERED_BOX ? "memory-mastered" : "memory-practice"] : [];
  mutate((state) => ({ ...state, memory: { ...state.memory, [id]: { ...card, ...review } } }), awards, origin);
}

// ── Quiz ──────────────────────────────────────────────────────────

export function answerQuiz(quizDay: string, answer: string, correct: boolean, origin: Origin | null = null): void {
  if (getSnapshot().quiz[quizDay]) return;
  mutate(
    (state) => ({ ...state, quiz: { ...state.quiz, [quizDay]: { correct, answer } } }),
    [correct ? "quiz-correct" : "quiz-tried"],
    origin,
  );
}

// ── Reading position, translation & plans ─────────────────────────

export function setLastRead(translation: string, chapterId: string): void {
  const current = getSnapshot();
  if (current.lastRead?.chapterId === chapterId && current.lastRead.translation === translation) return;
  write({ ...current, lastRead: { translation, chapterId }, translation });
}

export function setActivePlan(planId: string | null): void {
  write({ ...getSnapshot(), activePlan: planId });
}

export function togglePlanDay(planId: string, day: number, origin: Origin | null = null): void {
  const checking = !(getSnapshot().planProgress[planId] ?? []).includes(day);
  mutate(
    (state) => {
      const done = new Set(state.planProgress[planId] ?? []);
      if (done.has(day)) done.delete(day);
      else done.add(day);
      return { ...state, planProgress: { ...state.planProgress, [planId]: [...done].sort((a, b) => a - b) } };
    },
    checking ? ["plan-day"] : [],
    origin,
  );
}

// ── Export / import ───────────────────────────────────────────────

export function exportStudy(): string {
  return JSON.stringify(getSnapshot(), null, 2);
}

/** Replaces local data with an exported file. Returns false if the file is invalid. */
export function importStudy(json: string): boolean {
  try {
    const result = studySchema.safeParse(JSON.parse(json));
    if (!result.success) return false;
    write(result.data);
    return true;
  } catch {
    return false;
  }
}

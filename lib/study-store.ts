"use client";

import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";

import { BADGES } from "@/data/badges";
import { PLANS } from "@/data/plans";
import { COSMETICS, DEFAULT_EQUIPPED, getCosmetic, type CosmeticSlot } from "@/data/cosmetics";
import { celebrate, type Celebration, type Origin, type SoundName } from "@/lib/celebrations";
import { BOOKS } from "@/lib/canon";
import { dayKey, type DayKey } from "@/lib/day";
import {
  DAILY_GOAL,
  MASTERED_BOX,
  CHECKPOINT_OIL_PER_STAR,
  OIL_PER_STAR,
  SEARCH_TREASURE_OIL,
  TREASURE_OIL,
  comboMultiplier,
  dayMultiplier,
  isLordsDay,
  levelFor,
  nextCombo,
  nextReview,
  oilFromXp,
  starsFor,
  streakInfo,
  xpFor,
  type Action,
  type DayLog,
  type GameSnapshot,
  type LevelInfo,
  type StreakInfo,
} from "@/lib/game";

// Everything personal lives in this browser only. One versioned key, Zod-checked on
// read. A value that fails the check is backed up untouched, then salvaged field by
// field, so one bad entry never wipes the rest. v2/v3 fields all have defaults.

const STORAGE_KEY = "selah:v1";

const MEMORY_TEXT_MAX = 2000;

const memorySchema = z.object({
  reference: z.string(),
  text: z.string().max(MEMORY_TEXT_MAX),
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
  // ── v3: journey ──
  oil: z.number().int().min(0).default(0),
  stars: z.record(z.string(), z.number().int().min(1).max(3)).default({}),
  combo: z.object({ count: z.number().int().min(1), lastAt: z.number() }).nullable().default(null),
  treasures: z.record(z.string(), z.string()).default({}),
  searchHunts: z.record(z.string(), z.string()).default({}),
  owned: z.array(z.string()).default([]),
  // Merge over the defaults so adding a slot later never invalidates saved data.
  equipped: z
    .preprocess(
      (value) => (typeof value === "object" && value !== null ? { ...DEFAULT_EQUIPPED, ...value } : value),
      z.object({ lamp: z.string(), confetti: z.string(), paper: z.string(), companion: z.string() }),
    )
    .default(DEFAULT_EQUIPPED),
  sound: z.boolean().default(true),
  // ── v3.1: games ──
  games: z.record(z.string(), z.object({ best: z.number().int().min(0), plays: z.number().int().min(0) })).default({}),
  checkpoints: z.record(z.string(), z.number().int().min(1).max(3)).default({}),
});

export type StudyState = z.infer<typeof studySchema>;
export type Highlights = StudyState["highlights"];
export type MemoryCard = z.infer<typeof memorySchema>;
export type Equipped = StudyState["equipped"];

const EMPTY: StudyState = studySchema.parse({});

let cache: StudyState | null = null;
const listeners = new Set<() => void>();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Keeps every field (and every record entry) that still parses, so one bad value can
 * never wipe the rest. Each record entry is checked by running the field's own schema
 * on a one-entry object — no reaching into Zod internals.
 */
export function salvageStudy(raw: unknown): StudyState {
  if (!isPlainObject(raw)) return EMPTY;
  const shape = studySchema.shape;
  const kept: Record<string, unknown> = {};
  for (const key of Object.keys(shape) as Array<keyof typeof shape>) {
    const fieldSchema = shape[key];
    const value = raw[key];
    if (fieldSchema.safeParse(value).success) {
      kept[key] = value;
    } else if (isPlainObject(value) && isPlainObject(EMPTY[key])) {
      kept[key] = Object.fromEntries(
        Object.entries(value).filter(([entryKey, entry]) => fieldSchema.safeParse({ [entryKey]: entry }).success),
      );
    }
  }
  const result = studySchema.safeParse(kept);
  return result.success ? result.data : EMPTY;
}

function readStorage(): StudyState {
  let rawValue: string | null = null;
  try {
    rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return EMPTY;
    const parsed: unknown = JSON.parse(rawValue);
    const result = studySchema.safeParse(parsed);
    if (result.success) return result.data;
    backupRaw(rawValue);
    return salvageStudy(parsed);
  } catch {
    if (rawValue) backupRaw(rawValue);
    return EMPTY;
  }
}

/** Keeps the untouched original before any repaired state can be written over it. */
function backupRaw(rawValue: string): void {
  try {
    window.localStorage.setItem(`${STORAGE_KEY}:backup:${dayKey()}`, rawValue);
  } catch {
    // Quota full: nothing more we can do without risking the main key.
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
    starsTotal: Object.values(state.stars).reduce((sum, value) => sum + value, 0),
    treasures: Object.keys(state.treasures).length,
    cosmeticsOwned: state.owned.length,
  };
}

export interface GameView {
  today: DayKey;
  todayXp: number;
  goalProgress: number;
  level: LevelInfo;
  streak: StreakInfo;
  dueCount: number;
  lordsDay: boolean;
  starsTotal: number;
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
      lordsDay: isLordsDay(today),
      starsTotal: Object.values(state.stars).reduce((sum, value) => sum + value, 0),
    };
  }, [state]);
}

// ── The one write path: change state, award XP, detect celebrations ──

/** Caps are checked on BASE xp (recorded in `by`); multipliers apply afterwards. */
function applyAward(state: StudyState, action: Action, today: DayKey, chapterMultiplier: number): { state: StudyState; gained: number } {
  const log: DayLog = state.days[today] ?? { xp: 0, by: {} };
  const base = xpFor(action, log);
  if (base === 0) return { state, gained: 0 };
  const gained = base * dayMultiplier(today) * (action === "chapter" ? chapterMultiplier : 1);
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
          by: { ...(day?.by ?? {}), [action]: (day?.by[action] ?? 0) + base },
          chapters: day?.chapters ?? [],
        },
      },
    },
  };
}

interface MutateExtras {
  /** Reading-combo multiplier for chapter XP. */
  chapterMultiplier?: number;
  /** Oil granted on top of the 1-per-5-XP conversion (stars, treasure). Negative to spend. */
  oil?: number;
  /** Short label on the XP toast, e.g. "Combo x2". */
  note?: string;
  sound?: SoundName;
}

function mutate(
  recipe: (state: StudyState, today: DayKey) => StudyState,
  awards: Action[] = [],
  origin: Origin | null = null,
  extras: MutateExtras = {},
): void {
  const today = dayKey();
  const before = getSnapshot();
  let next = recipe(before, today);
  let gained = 0;
  for (const action of awards) {
    const result = applyAward(next, action, today, extras.chapterMultiplier ?? 1);
    next = result.state;
    gained += result.gained;
  }
  const oilGained = oilFromXp(before.xp, next.xp) + (extras.oil ?? 0);
  if (oilGained !== 0) next = { ...next, oil: Math.max(0, next.oil + oilGained) };

  const snapshot = snapshotOf(next, today);
  const newBadges = BADGES.filter((badge) => !next.badges[badge.id] && badge.earned(snapshot));
  if (newBadges.length > 0) {
    const stamp = new Date().toISOString();
    next = { ...next, badges: { ...next.badges, ...Object.fromEntries(newBadges.map((badge) => [badge.id, stamp])) } };
  }
  write(next);

  const events: Celebration[] = [];
  const notes = [extras.note, gained > 0 && isLordsDay(today) ? "Lord's Day x2" : undefined].filter(Boolean).join(" · ");
  if (gained > 0 || oilGained > 0) {
    events.push({ kind: "xp", amount: gained, oil: Math.max(0, oilGained), origin, note: notes || undefined, sound: extras.sound });
  }
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
    { sound: "quill" },
  );
}

// ── Chapters ──────────────────────────────────────────────────────

/** Called when the reader reaches the end of a chapter after a real read. */
export function markChapterRead(chapterId: string): void {
  const today = dayKey();
  const current = getSnapshot();
  if (current.days[today]?.chapters.includes(chapterId)) return;
  const combo = nextCombo(current.combo, Date.now());
  const multiplier = comboMultiplier(combo.count);
  const firstStar = current.stars[chapterId] ? 0 : 1;
  mutate(
    (state) => {
      const day = state.days[today] ?? { xp: 0, by: {}, chapters: [] };
      return {
        ...state,
        combo,
        stars: firstStar ? { ...state.stars, [chapterId]: 1 } : state.stars,
        chaptersRead: state.chaptersRead[chapterId] ? state.chaptersRead : { ...state.chaptersRead, [chapterId]: new Date().toISOString() },
        days: { ...state.days, [today]: { ...day, chapters: [...day.chapters, chapterId] } },
      };
    },
    ["chapter"],
    null,
    { chapterMultiplier: multiplier, oil: firstStar * OIL_PER_STAR, note: multiplier > 1 ? `Combo x${multiplier}` : undefined, sound: "page" },
  );
}

/** Records a challenge run; keeps the best stars and pays only for newly earned ones. */
export function recordChallenge(chapterId: string, correct: number, total: number, origin: Origin | null = null): number {
  const earned = starsFor(correct, total);
  const previous = getSnapshot().stars[chapterId] ?? 0;
  const newStars = Math.max(0, earned - previous);
  mutate(
    (state) => ({ ...state, stars: { ...state.stars, [chapterId]: Math.max(previous, earned) } }),
    Array<Action>(newStars).fill("challenge-star"),
    origin,
    { oil: newStars * OIL_PER_STAR, sound: earned === 3 ? "bell" : "chime" },
  );
  return earned;
}

/** Treasure verses pay out once per chapter. Returns false if already found. */
export function claimTreasure(chapterId: string, verseId: string, origin: Origin | null = null): boolean {
  if (getSnapshot().treasures[chapterId]) return false;
  mutate((state) => ({ ...state, treasures: { ...state.treasures, [chapterId]: verseId } }), [], origin, {
    oil: TREASURE_OIL,
    note: "Treasure found!",
    sound: "chime",
  });
  return true;
}

/** Daily search treasure hunt — once per day. */
export function claimSearchHunt(day: string, verseId: string, origin: Origin | null = null): boolean {
  if (getSnapshot().searchHunts[day]) return false;
  mutate((state) => ({ ...state, searchHunts: { ...state.searchHunts, [day]: verseId } }), [], origin, {
    oil: SEARCH_TREASURE_OIL,
    note: "Hunt complete!",
    sound: "chime",
  });
  return true;
}

// ── Games ─────────────────────────────────────────────────────────

export type GameMode = "trivia" | "match" | "order" | "lightning";

/**
 * Records a finished game run. `correct` earns XP (2 each, capped daily);
 * `score` is what "best" tracks (correct answers, or pairs/time-based score).
 * Returns true when it's a new personal best.
 */
export function recordGame(mode: GameMode, correct: number, score: number, origin: Origin | null = null): boolean {
  const previous = getSnapshot().games[mode];
  const isBest = !previous || score > previous.best;
  mutate(
    (state) => ({
      ...state,
      games: { ...state.games, [mode]: { best: Math.max(previous?.best ?? 0, score), plays: (previous?.plays ?? 0) + 1 } },
    }),
    Array<Action>(Math.max(0, correct)).fill("game"),
    origin,
    { note: isBest && previous ? "New best!" : undefined, sound: isBest ? "bell" : "chime" },
  );
  return isBest;
}

/** Checkpoint review on the trail: keeps best stars, pays oil for new ones. */
export function recordCheckpoint(key: string, correct: number, total: number, origin: Origin | null = null): number {
  const earned = starsFor(correct, total);
  const previous = getSnapshot().checkpoints[key] ?? 0;
  const newStars = Math.max(0, earned - previous);
  mutate(
    (state) => ({ ...state, checkpoints: { ...state.checkpoints, [key]: Math.max(previous, earned) } }),
    Array<Action>(Math.max(0, correct)).fill("game"),
    origin,
    { oil: newStars * CHECKPOINT_OIL_PER_STAR, note: "Checkpoint!", sound: earned === 3 ? "bell" : "chime" },
  );
  return earned;
}

// ── Workshop ──────────────────────────────────────────────────────

export function buyCosmetic(id: string, origin: Origin | null = null): boolean {
  const item = getCosmetic(id);
  const state = getSnapshot();
  if (!item || item.price === 0 || state.owned.includes(id) || state.oil < item.price) return false;
  mutate(
    (current) => ({ ...current, owned: [...current.owned, id], equipped: { ...current.equipped, [item.slot]: id } }),
    [],
    origin,
    { oil: -item.price, sound: "pour" },
  );
  return true;
}

export function equipCosmetic(id: string): void {
  const item = getCosmetic(id);
  const state = getSnapshot();
  if (!item || (item.price > 0 && !state.owned.includes(id))) return;
  write({ ...state, equipped: { ...state.equipped, [item.slot]: id } });
}

export function equippedItem(equipped: Equipped, slot: CosmeticSlot): string {
  const id = equipped[slot];
  return COSMETICS.some((item) => item.id === id && item.slot === slot) ? id : DEFAULT_EQUIPPED[slot];
}

export function setSound(on: boolean): void {
  write({ ...getSnapshot(), sound: on });
}

export function soundEnabled(): boolean {
  return getSnapshot().sound;
}

export function checkIn(origin: Origin | null = null): void {
  mutate((state) => state, ["checkin"], origin);
}

// ── Memory ────────────────────────────────────────────────────────

export function memorize(card: Omit<MemoryCard, "box" | "due" | "addedAt">): string {
  const id = card.verseIds.join("+");
  // Stay inside the schema's limits so a long passage can't fail validation on the next load.
  const safeCard = { ...card, text: card.text.slice(0, MEMORY_TEXT_MAX), verseIds: card.verseIds.slice(0, 3) };
  mutate((state, today) =>
    state.memory[id]
      ? state
      : { ...state, memory: { ...state.memory, [id]: { ...safeCard, box: 1, due: today, addedAt: new Date().toISOString() } } },
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

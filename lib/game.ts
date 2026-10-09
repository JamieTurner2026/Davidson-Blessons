// Selah's game rules — pure functions only, so they can be reasoned about and tested
// without React or storage. Principle: encourage, never punish.

import { addDays, dayNumber, fromDayNumber, weekday, type DayKey } from "@/lib/day";

// ── XP ────────────────────────────────────────────────────────────

export type Action =
  | "chapter"
  | "highlight"
  | "note"
  | "plan-day"
  | "memory-practice"
  | "memory-mastered"
  | "quiz-correct"
  | "quiz-tried"
  | "checkin"
  | "challenge-star"
  | "game";

interface XpRule {
  xp: number;
  /** Max XP this action can earn in one day. */
  dailyCap?: number;
}

export const XP_RULES: Record<Action, XpRule> = {
  chapter: { xp: 10, dailyCap: 50 },
  highlight: { xp: 2, dailyCap: 10 },
  note: { xp: 5, dailyCap: 25 },
  "plan-day": { xp: 15, dailyCap: 45 },
  "memory-practice": { xp: 10, dailyCap: 50 },
  "memory-mastered": { xp: 25 },
  "quiz-correct": { xp: 15, dailyCap: 15 },
  "quiz-tried": { xp: 5, dailyCap: 5 },
  checkin: { xp: 10, dailyCap: 10 },
  "challenge-star": { xp: 5, dailyCap: 60 },
  game: { xp: 2, dailyCap: 60 },
};

/** One chapter (or a paper-Bible check-in) lights the lamp. */
export const DAILY_GOAL = 10;

export interface DayLog {
  xp: number;
  /** XP earned today per action — used for daily caps. */
  by: Record<string, number>;
}

/** XP this action is worth right now, given what's already been earned today. */
export function xpFor(action: Action, today: DayLog | undefined): number {
  const rule = XP_RULES[action];
  if (rule.dailyCap === undefined) return rule.xp;
  const earned = today?.by[action] ?? 0;
  return Math.max(0, Math.min(rule.xp, rule.dailyCap - earned));
}

// ── Levels ────────────────────────────────────────────────────────

export const LEVELS: ReadonlyArray<{ name: string; xp: number }> = [
  { name: "Seed", xp: 0 },
  { name: "Sprout", xp: 100 },
  { name: "Seedling", xp: 250 },
  { name: "Sapling", xp: 500 },
  { name: "Young Tree", xp: 1000 },
  { name: "Fruitful Tree", xp: 2000 },
  { name: "Olive Tree", xp: 4000 },
  { name: "Cedar of Lebanon", xp: 8000 },
];

export interface LevelInfo {
  index: number;
  name: string;
  floor: number;
  next: number | null;
  /** 0–1 progress toward the next level (1 at max level). */
  progress: number;
}

export function levelFor(xp: number): LevelInfo {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) if (xp >= LEVELS[i].xp) index = i;
  const floor = LEVELS[index].xp;
  const next = LEVELS[index + 1]?.xp ?? null;
  return {
    index,
    name: LEVELS[index].name,
    floor,
    next,
    progress: next === null ? 1 : (xp - floor) / (next - floor),
  };
}

// ── Streaks ───────────────────────────────────────────────────────

/** One rest day inside any 7-day window keeps the streak alive. */
export const REST_WINDOW = 7;

export interface StreakInfo {
  current: number;
  longest: number;
  litToday: boolean;
  /** True when the current streak is being carried by a rest day. */
  restingNow: boolean;
  perfectWeeks: number;
  /** Lit state for Sun…Sat of the current week. */
  thisWeek: boolean[];
}

/** Study actions that light a day. Games and the quiz are fun, but don't keep a streak alone. */
const LIGHTING_ACTIONS: ReadonlyArray<Action> = ["chapter", "highlight", "note", "plan-day", "memory-practice", "memory-mastered", "checkin"];
/** Days before this keep the original rule (any XP), so nobody's existing streak breaks. */
const STRICT_LIT_FROM: DayKey = "2026-10-10";

export function isLit(days: Record<DayKey, DayLog>, key: DayKey): boolean {
  const log = days[key];
  if (!log) return false;
  if (key < STRICT_LIT_FROM) return log.xp > 0;
  return LIGHTING_ACTIONS.some((action) => (log.by[action] ?? 0) > 0);
}

export function streakInfo(days: Record<DayKey, DayLog>, today: DayKey): StreakInfo {
  const litKeys = Object.keys(days).filter((key) => isLit(days, key));
  const weekStart = addDays(today, -weekday(today));
  const thisWeek = Array.from({ length: 7 }, (_, index) => isLit(days, addDays(weekStart, index)));
  if (litKeys.length === 0) {
    return { current: 0, longest: 0, litToday: false, restingNow: false, perfectWeeks: 0, thisWeek };
  }

  const first = Math.min(...litKeys.map(dayNumber));
  const end = dayNumber(today);
  let chain = 0;
  let longest = 0;
  let lastRest = Number.NEGATIVE_INFINITY;

  for (let day = first; day <= end; day += 1) {
    const key = fromDayNumber(day);
    if (isLit(days, key)) {
      chain += 1;
      longest = Math.max(longest, chain);
    } else if (day === end) {
      // Today isn't over yet — an unlit today is pending, not a miss.
    } else if (chain > 0 && day - lastRest >= REST_WINDOW) {
      lastRest = day; // a grace rest day
    } else {
      chain = 0;
      lastRest = Number.NEGATIVE_INFINITY;
    }
  }

  const yesterday = addDays(today, -1);
  const restingNow = chain > 0 && !isLit(days, yesterday) && !isLit(days, today);

  // Perfect weeks: complete Sun–Sat weeks with every day lit.
  let perfectWeeks = 0;
  for (let sunday = first - weekday(fromDayNumber(first)); sunday + 6 <= end; sunday += 7) {
    let perfect = true;
    for (let offset = 0; offset < 7 && perfect; offset += 1) perfect = isLit(days, fromDayNumber(sunday + offset));
    if (perfect) perfectWeeks += 1;
  }

  return { current: chain, longest, litToday: isLit(days, today), restingNow, perfectWeeks, thisWeek };
}

// ── Memory (Leitner boxes) ────────────────────────────────────────

/** Days to wait after being promoted INTO box N (index = box): 1, 2, 4, 8. Box 6 = mastered. */
export const BOX_INTERVALS = [0, 0, 1, 2, 4, 8] as const;
export const MASTERED_BOX = 6;

export type PracticeMode = "scramble" | "blanks" | "first-letter";

export function modeForBox(box: number): PracticeMode {
  if (box <= 2) return "scramble";
  if (box <= 4) return "blanks";
  return "first-letter";
}

/** Mastered verses come back for a light refresh so they stay mastered. */
export const MASTERED_REFRESH_DAYS = 30;

export function nextReview(box: number, correct: boolean, today: DayKey): { box: number; due: DayKey } {
  if (!correct) return { box: Math.max(1, box - 1), due: today };
  if (box >= MASTERED_BOX) return { box: MASTERED_BOX, due: addDays(today, MASTERED_REFRESH_DAYS) };
  const nextBox = Math.min(MASTERED_BOX, box + 1);
  const wait = nextBox >= MASTERED_BOX ? 16 : BOX_INTERVALS[nextBox];
  return { box: nextBox, due: addDays(today, wait) };
}

// ── Snapshot used by badge rules ──────────────────────────────────

export interface GameSnapshot {
  chaptersRead: ReadonlySet<string>;
  starsTotal: number;
  treasures: number;
  cosmeticsOwned: number;
  booksComplete: ReadonlySet<string>;
  notes: number;
  mastered: number;
  quizCorrect: number;
  longestStreak: number;
  perfectWeeks: number;
  plansComplete: number;
}

// ── Bonuses (applied AFTER daily caps, so nothing becomes farmable) ──

/** Chapters finished within this gap of each other build a reading combo. */
export const COMBO_WINDOW_MS = 45 * 60_000;

export interface Combo {
  count: number;
  lastAt: number;
}

export function nextCombo(previous: Combo | null, now: number): Combo {
  if (previous && now - previous.lastAt <= COMBO_WINDOW_MS) return { count: previous.count + 1, lastAt: now };
  return { count: 1, lastAt: now };
}

/** x1 → x2 from the 3rd chapter in a row → x3 from the 5th. Chapter XP only. */
export function comboMultiplier(count: number): number {
  if (count >= 5) return 3;
  if (count >= 3) return 2;
  return 1;
}

/** The Lord's Day: all XP doubled on Sundays. */
export function isLordsDay(key: DayKey): boolean {
  return weekday(key) === 0;
}

export function dayMultiplier(key: DayKey): number {
  return isLordsDay(key) ? 2 : 1;
}

// ── Oil (the currency) ────────────────────────────────────────────

export const XP_PER_OIL = 5;
export const OIL_PER_STAR = 3;
export const TREASURE_OIL = 15;
export const SEARCH_TREASURE_OIL = 10;

/** Oil earned by moving total XP from `before` to `after` (1 per 5 XP, no rounding drift). */
export function oilFromXp(before: number, after: number): number {
  return Math.floor(after / XP_PER_OIL) - Math.floor(before / XP_PER_OIL);
}

// ── Stars (per chapter stop) ──────────────────────────────────────

export const MAX_STARS = 3;

/** 1 star for finishing, +1 at ≥60% right, +1 at ≥90% right. Works for any number of rounds. */
export function starsFor(correct: number, total: number): number {
  if (total <= 0) return 1;
  const ratio = correct / total;
  return 1 + (ratio >= 0.6 ? 1 : 0) + (ratio >= 0.9 ? 1 : 0);
}

// ── Treasure verses ───────────────────────────────────────────────

/** Small stable string hash (FNV-1a) so treasure placement is the same for everyone. */
export function hashString(text: string): number {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

/** About 1 in 4 chapters hides a treasure verse. Returns its verse number, or null. */
export function treasureVerse(chapterId: string, verseNumbers: ReadonlyArray<number>): number | null {
  if (verseNumbers.length === 0) return null;
  const hash = hashString(`treasure:${chapterId}`);
  if (hash % 4 !== 0) return null;
  return verseNumbers[Math.floor(hash / 4) % verseNumbers.length];
}

// ── Pilgrim ───────────────────────────────────────────────────────

/** Four life stages across the eight levels. */
export function pilgrimStage(levelIndex: number): number {
  return Math.max(0, Math.min(3, Math.floor(levelIndex / 2)));
}

// ── Checkpoints (every 5 stops on a trail) ────────────────────────

export const CHECKPOINT_EVERY = 5;
export const CHECKPOINT_OIL_PER_STAR = 5;

/** Chapter numbers a checkpoint after stop `at` reviews, e.g. at=10 → 6..10. */
export function checkpointRange(at: number): { from: number; to: number } {
  return { from: Math.max(1, at - CHECKPOINT_EVERY + 1), to: at };
}

// Merges two copies of a reader's state: this browser's and the account's. Pure.
//
// Pulls always merge (never overwrite), so the rules must be safe to apply in any order
// and any number of times: merge(a, merge(a, b)) === merge(a, b). Most fields only grow
// (union) or only improve (max), which gives that for free. XP is a running total, so it is
// rebuilt from the merged day logs instead — `applyAward` always adds to both together.

import type { MemoryCard, StudyState } from "@/lib/study-store";

type DayLog = StudyState["days"][string];

/** Union of two id → ISO-timestamp maps, keeping the earliest time (first read, first earned). */
export function unionEarliest(a: Record<string, string>, b: Record<string, string>): Record<string, string> {
  const out = { ...a };
  for (const [key, value] of Object.entries(b)) if (!(key in out) || value < out[key]) out[key] = value;
  return out;
}

/** Union of two maps of objects; on a clash `pick` decides. */
export function unionWith<T>(a: Record<string, T>, b: Record<string, T>, pick: (left: T, right: T) => T): Record<string, T> {
  const out = { ...a };
  for (const [key, value] of Object.entries(b)) out[key] = key in out ? pick(out[key], value) : value;
  return out;
}

/** Union of two id → number maps, keeping the higher number (best stars, checkpoint stars). */
export function maxPerKey(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  return unionWith(a, b, (left, right) => Math.max(left, right));
}

/** Per day: the larger XP and per-action totals (they can't be added — some may be the same work), all chapters. */
export function mergeDays(a: Record<string, DayLog>, b: Record<string, DayLog>): Record<string, DayLog> {
  return unionWith(a, b, (left, right) => ({
    xp: Math.max(left.xp, right.xp),
    by: unionWith(left.by, right.by, (x, y) => Math.max(x, y)),
    chapters: [...new Set([...left.chapters, ...right.chapters])].sort(),
  }));
}

/**
 * The same memory verse saved on both devices, practised differently. Which copy wins?
 *
 * Fields: `box` (1–6, higher = better known), `due` ("YYYY-MM-DD", when it's next reviewed),
 * `addedAt` (ISO time it was first saved). Things to weigh:
 *   - Higher box rewards the device where it was practised more — but a verse failed
 *     yesterday on one device (box dropped, due today) would be hidden by an older pass.
 *   - Earlier `due` brings it back for review sooner — safer for learning, a little nagging.
 *   - Whatever you pick must give the same answer whichever argument is local.
 */
export function resolveMemoryCard(local: MemoryCard, remote: MemoryCard): MemoryCard {
  // The copy that needs review sooner wins, so a verse missed on one device is never
  // hidden by an older, better result from another. Tie: the better-known copy.
  if (local.due !== remote.due) return local.due < remote.due ? local : remote;
  return local.box >= remote.box ? local : remote;
}

function sumDays(days: Record<string, DayLog>): number {
  return Object.values(days).reduce((total, day) => total + day.xp, 0);
}

export function mergeStudy(local: StudyState, remote: StudyState): StudyState {
  const days = mergeDays(local.days, remote.days);
  return {
    ...local,
    // Grows only: union.
    chaptersRead: unionEarliest(local.chaptersRead, remote.chaptersRead),
    badges: unionEarliest(local.badges, remote.badges),
    treasures: unionEarliest(local.treasures, remote.treasures),
    searchHunts: unionEarliest(local.searchHunts, remote.searchHunts),
    highlights: unionWith(local.highlights, remote.highlights, (left, right) => (left.createdAt <= right.createdAt ? left : right)),
    notes: unionWith(local.notes, remote.notes, (left, right) => (left.updatedAt >= right.updatedAt ? left : right)),
    // The most recently edited copy of each chapter's reflection wins.
    journal: unionWith(local.journal, remote.journal, (left, right) => (left.updatedAt >= right.updatedAt ? left : right)),
    quiz: unionWith(local.quiz, remote.quiz, (left, right) => (left.answer <= right.answer ? left : right)),
    owned: [...new Set([...local.owned, ...remote.owned])].sort(),
    memory: unionWith(local.memory, remote.memory, resolveMemoryCard),
    // Improves only: max.
    stars: maxPerKey(local.stars, remote.stars),
    checkpoints: maxPerKey(local.checkpoints, remote.checkpoints),
    games: unionWith(local.games, remote.games, (left, right) => ({ best: Math.max(left.best, right.best), plays: Math.max(left.plays, right.plays) })),
    // Running totals.
    days,
    xp: Math.max(sumDays(days), local.xp, remote.xp),
    // Oil is spent as well as earned, so neither side's number is "the" total. The larger
    // balance is the kind choice; a spend made offline can be undone by an older, higher
    // balance from another device. Acceptable: oil only buys cosmetics.
    oil: Math.max(local.oil, remote.oil),
    // Preferences and "where I was": this device keeps its own.
    lastRead: local.lastRead ?? remote.lastRead,
    translation: local.translation,
    equipped: local.equipped,
    sound: local.sound,
    combo: local.combo,
  };
}

/** Key-order-independent JSON, to tell whether a merge changed anything. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>) // plain JSON object from the store
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

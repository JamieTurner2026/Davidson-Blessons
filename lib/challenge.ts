// Rounds generated from a chapter's own verses — no AI, no network.
// Pure and seeded: the same chapter + attempt always produces the same questions.

import { hashString } from "@/lib/game";

export interface ChapterVerse {
  number: number;
  text: string;
}

/** Any multiple-choice round (generated or from the curated bank). */
export interface ChoiceRound {
  kind: "finish" | "next" | "blank" | "trivia" | "who";
  prompt: string;
  /** Text shown above the options (verse, quote or question). */
  clue: string;
  options: string[];
  answer: number;
  /** Optional verse reference revealed after answering. */
  reference?: string;
}

export interface OrderRound {
  kind: "order";
  prompt: string;
  /** Items in the correct order. */
  items: string[];
  /** Display order (indices into `items`). */
  shuffled: number[];
}

export interface MatchRound {
  kind: "match";
  prompt: string;
  pairs: Array<{ left: string; right: string }>;
  /** Display order of the right-hand column (indices into `pairs`). */
  shuffled: number[];
}

export type Question = ChoiceRound | OrderRound | MatchRound;

const MIN_WORDS = 6;
const MAX_QUESTIONS = 3;
const STOP_WORDS = new Set([
  "about", "above", "after", "again", "among", "because", "before", "being", "could", "every", "might", "never", "other",
  "shall", "should", "their", "there", "these", "those", "through", "under", "until", "where", "which", "while", "whom",
  "whose", "would", "yourselves", "themselves", "therefore",
]);

export function words(text: string): string[] {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

export function clip(text: string, max: number): string {
  const list = words(text);
  return list.length <= max ? list.join(" ") : `${list.slice(0, max).join(" ")}…`;
}

function bare(word: string): string {
  return word.replace(/[^\p{L}'’-]/gu, "");
}

export function seededRandom(seed: string): () => number {
  let value = hashString(seed) || 1;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function shuffle<T>(items: T[], rand: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick<T>(items: T[], rand: () => number): T | undefined {
  return items[Math.floor(rand() * items.length)];
}

/** A shuffled display order that is never already solved. */
export function scrambledOrder(length: number, rand: () => number): number[] {
  const identity = Array.from({ length }, (_, index) => index);
  if (length < 2) return identity;
  const order = shuffle(identity, rand);
  return order.every((value, index) => value === index) ? [...identity.slice(1), identity[0]] : order;
}

/** Shuffles `correct` in among distractors; returns options + the answer's index. */
function withDistractors(correct: string, distractors: string[], rand: () => number, count = 2): { options: string[]; answer: number } {
  const unique = [...new Set(distractors.filter((text) => text !== correct))].slice(0, count);
  const options = shuffle([correct, ...unique], rand);
  return { options, answer: options.indexOf(correct) };
}

type Maker = (verses: ChapterVerse[], rand: () => number, used: Set<number>) => Question | null;

const finishQuestion: Maker = (verses, rand, used) => {
  const eligible = verses.filter((verse) => words(verse.text).length >= MIN_WORDS + 2 && !used.has(verse.number));
  if (eligible.length < 3) return null;
  const target = pick(eligible, rand);
  if (!target) return null;
  const split = (verse: ChapterVerse): { head: string; tail: string } => {
    const list = words(verse.text);
    const cut = Math.ceil(list.length / 2);
    return { head: list.slice(0, cut).join(" "), tail: list.slice(cut).join(" ") };
  };
  const { head, tail } = split(target);
  const others = shuffle(eligible.filter((verse) => verse.number !== target.number), rand).map((verse) => clip(split(verse).tail, 16));
  const { options, answer } = withDistractors(clip(tail, 16), others, rand);
  if (options.length < 3) return null;
  used.add(target.number);
  return { kind: "finish", prompt: `Finish verse ${target.number}`, clue: `${head} …`, options, answer };
};

const nextQuestion: Maker = (verses, rand, used) => {
  if (verses.length < 4) return null;
  const starts = verses.slice(0, -1).filter((verse) => !used.has(verse.number) && words(verse.text).length >= 3);
  const start = pick(starts, rand);
  if (!start) return null;
  const following = verses[verses.indexOf(start) + 1];
  const others = shuffle(
    verses.filter((verse) => verse.number !== start.number && verse.number !== following.number),
    rand,
  ).map((verse) => clip(verse.text, 14));
  const { options, answer } = withDistractors(clip(following.text, 14), others, rand);
  if (options.length < 3) return null;
  used.add(start.number);
  return { kind: "next", prompt: `What comes after verse ${start.number}?`, clue: clip(start.text, 30), options, answer };
};

const orderQuestion: Maker = (verses, rand, used) => {
  const runs: ChapterVerse[][] = [];
  for (let i = 0; i + 2 < verses.length; i += 1) {
    const run = verses.slice(i, i + 3);
    if (run.every((verse) => words(verse.text).length >= MIN_WORDS && !used.has(verse.number))) runs.push(run);
  }
  const run = pick(runs, rand);
  if (!run) return null;
  const items = run.map((verse) => clip(verse.text, 7));
  if (new Set(items).size < items.length) return null;
  run.forEach((verse) => used.add(verse.number));
  return { kind: "order", prompt: `Put verses ${run[0].number}–${run[2].number} in order`, items, shuffled: scrambledOrder(3, rand) };
};

/** A meaningful word worth hiding: 5+ letters and not a filler word. */
function keyWords(text: string): string[] {
  return words(text)
    .map(bare)
    .filter((word) => word.length >= 5 && !STOP_WORDS.has(word.toLowerCase()));
}

const blankQuestion: Maker = (verses, rand, used) => {
  const eligible = verses.filter((verse) => words(verse.text).length >= MIN_WORDS + 2 && !used.has(verse.number) && keyWords(verse.text).length > 0);
  const target = pick(eligible, rand);
  if (!target) return null;
  const candidates = keyWords(target.text);
  const hidden = candidates.reduce((longest, word) => (word.length > longest.length ? word : longest), candidates[0]);
  const pool = verses
    .filter((verse) => verse.number !== target.number)
    .flatMap((verse) => keyWords(verse.text))
    .filter((word) => word.toLowerCase() !== hidden.toLowerCase());
  const distinct = [...new Map(pool.map((word) => [word.toLowerCase(), word])).values()];
  if (distinct.length < 2) return null;
  const { options, answer } = withDistractors(hidden, shuffle(distinct, rand), rand);
  let replaced = false;
  const clue = words(target.text)
    .map((word) => {
      if (!replaced && bare(word) === hidden) {
        replaced = true;
        return word.replace(hidden, "_____");
      }
      return word;
    })
    .join(" ");
  used.add(target.number);
  return { kind: "blank", prompt: `Fill in the missing word · verse ${target.number}`, clue, options, answer };
};

const matchQuestion: Maker = (verses, rand, used) => {
  const eligible = verses.filter((verse) => words(verse.text).length >= MIN_WORDS && !used.has(verse.number));
  if (eligible.length < 3) return null;
  const chosen = shuffle(eligible, rand)
    .slice(0, 3)
    .sort((a, b) => a.number - b.number);
  const pairs = chosen.map((verse) => ({ left: `Verse ${verse.number}`, right: clip(verse.text, 8) }));
  if (new Set(pairs.map((pair) => pair.right)).size < pairs.length) return null;
  chosen.forEach((verse) => used.add(verse.number));
  return { kind: "match", prompt: "Match each verse to its words", pairs, shuffled: scrambledOrder(3, rand) };
};

const ALL_MAKERS: Maker[] = [finishQuestion, nextQuestion, orderQuestion, blankQuestion, matchQuestion];

/** Up to `max` varied rounds from these verses. Short passages get fewer (or none). */
export function generateRounds(seed: string, verses: ChapterVerse[], max: number): Question[] {
  const rand = seededRandom(seed);
  const used = new Set<number>();
  const makers = shuffle(ALL_MAKERS, rand);
  const questions: Question[] = [];
  for (const make of [...makers, blankQuestion, finishQuestion, nextQuestion]) {
    if (questions.length >= max) break;
    const question = make(verses, rand, used);
    if (question) questions.push(question);
  }
  return questions;
}

/** Post-chapter challenge (reader): up to three rounds across the whole chapter. */
export function generateChallenge(chapterId: string, verses: ChapterVerse[], attempt = 0): Question[] {
  return generateRounds(`${chapterId}#${attempt}`, verses, MAX_QUESTIONS);
}

/** Splits a chapter into up to `maxCards` consecutive passage cards of similar size. */
export function segmentVerses(verses: ChapterVerse[], maxCards = 4, target = 7): ChapterVerse[][] {
  if (verses.length === 0) return [];
  const count = Math.max(1, Math.min(maxCards, Math.round(verses.length / target)));
  const size = Math.ceil(verses.length / count);
  const segments: ChapterVerse[][] = [];
  for (let i = 0; i < verses.length; i += size) segments.push(verses.slice(i, i + size));
  return segments;
}

/** Flattens normalised chapter blocks into numbered verses. */
export function versesFromBlocks(blocks: ReadonlyArray<{ kind: string; segments?: ReadonlyArray<{ verseId: string | null; text: string }> }>): ChapterVerse[] {
  const map = new Map<number, string>();
  for (const block of blocks) {
    for (const segment of block.segments ?? []) {
      if (!segment.verseId) continue;
      const number = Number(segment.verseId.split(".")[2]);
      if (!Number.isFinite(number)) continue;
      const previous = map.get(number) ?? "";
      // Runs split at paragraph/quote boundaries can lack a joining space ("water.”So").
      const needsSpace = previous !== "" && !/\s$/.test(previous) && !/^[\s,.;:!?’”)\]]/.test(segment.text);
      map.set(number, `${previous}${needsSpace ? " " : ""}${segment.text}`);
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, text]) => ({ number, text: text.replace(/\s+/g, " ").trim() }));
}

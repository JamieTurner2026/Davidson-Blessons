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

/** Rounds aim for 4 options; short passages may fall back to 3, never fewer. */
const DISTRACTORS = 3;
const MIN_OPTIONS = 3;

/** Shuffles `correct` in among distractors; returns options + the answer's index. */
function withDistractors(correct: string, distractors: string[], rand: () => number, count = DISTRACTORS): { options: string[]; answer: number } {
  const seen = new Set([correct.toLowerCase()]);
  const unique: string[] = [];
  for (const text of distractors) {
    if (unique.length >= count) break;
    if (seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    unique.push(text);
  }
  const options = shuffle([correct, ...unique], rand);
  return { options, answer: options.indexOf(correct) };
}

/**
 * Cuts every option to the same word count and ends them all with "…", so length and
 * punctuation never give the answer away. Returns null if the shared length is too short.
 */
function evenOptions(texts: string[], max: number, min = 4): string[] | null {
  const length = Math.min(max, ...texts.map((text) => words(text).length));
  if (length < min) return null;
  return texts.map((text) => `${words(text).slice(0, length).join(" ").replace(/[\s,.;:!?—–-]+$/u, "")} …`);
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
  const others = shuffle(eligible.filter((verse) => verse.number !== target.number), rand)
    .slice(0, DISTRACTORS)
    .map((verse) => split(verse).tail);
  const even = evenOptions([tail, ...others], 16);
  if (!even) return null;
  const { options, answer } = withDistractors(even[0], even.slice(1), rand);
  if (options.length < MIN_OPTIONS) return null;
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
    verses.filter((verse) => verse.number !== start.number && verse.number !== following.number && words(verse.text).length >= 4),
    rand,
  )
    .slice(0, DISTRACTORS)
    .map((verse) => verse.text);
  const even = evenOptions([following.text, ...others], 14);
  if (!even) return null;
  const { options, answer } = withDistractors(even[0], even.slice(1), rand);
  if (options.length < MIN_OPTIONS) return null;
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

/**
 * Splits a verse into tokens, keeping whitespace and dashes as their own tokens so the
 * text can be rebuilt exactly. BSB/NIV join clauses with unspaced em dashes
 * ("morning—the"), which must never be treated as one word.
 */
function tokens(text: string): string[] {
  return text.split(/(\s+|[—–])/u).filter((token) => token !== "");
}

interface KeyWord {
  word: string;
  /** Index into `tokens(text)`. */
  index: number;
}

/**
 * Words worth hiding: 5+ letters, not filler, appearing only once in the verse
 * (so the answer isn't left visible elsewhere), and contiguous inside their token
 * (so the blank can actually be cut out).
 */
function keyWords(text: string): KeyWord[] {
  const list = tokens(text);
  const counts = new Map<string, number>();
  for (const token of list) {
    const word = bare(token).toLowerCase();
    if (word) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return list.flatMap((token, index) => {
    const word = bare(token);
    const ok = word.length >= 5 && !STOP_WORDS.has(word.toLowerCase()) && counts.get(word.toLowerCase()) === 1 && token.includes(word);
    return ok ? [{ word, index }] : [];
  });
}

function isCapitalized(word: string): boolean {
  return /^\p{Lu}/u.test(word);
}

const blankQuestion: Maker = (verses, rand, used) => {
  const eligible = verses.filter((verse) => words(verse.text).length >= MIN_WORDS + 2 && !used.has(verse.number) && keyWords(verse.text).length > 0);
  const target = pick(eligible, rand);
  if (!target) return null;
  const candidates = keyWords(target.text);
  const hidden = candidates.reduce((longest, entry) => (entry.word.length > longest.word.length ? entry : longest), candidates[0]);
  const distinct = [
    ...new Map(
      verses
        .filter((verse) => verse.number !== target.number)
        .flatMap((verse) => keyWords(verse.text).map((entry) => entry.word))
        .filter((word) => word.toLowerCase() !== hidden.word.toLowerCase())
        .map((word) => [word.toLowerCase(), word]),
    ).values(),
  ];
  // Same capitalisation as the answer, so a lone proper noun (or lone lowercase word) can't give it away.
  const sameCase = distinct.filter((word) => isCapitalized(word) === isCapitalized(hidden.word));
  if (sameCase.length < MIN_OPTIONS - 1) return null;
  const { options, answer } = withDistractors(hidden.word, shuffle(sameCase, rand), rand);
  const list = tokens(target.text);
  list[hidden.index] = list[hidden.index].replace(hidden.word, "_____");
  const clue = list.join("");
  if (!clue.includes("_____")) return null;
  used.add(target.number);
  return { kind: "blank", prompt: `Fill in the missing word · verse ${target.number}`, clue, options, answer };
};

/** Joins each verse's beginning to its ending — tests the words, not the verse numbers. */
const matchQuestion: Maker = (verses, rand, used) => {
  const eligible = verses.filter((verse) => words(verse.text).length >= MIN_WORDS + 4 && !used.has(verse.number));
  if (eligible.length < 3) return null;
  const chosen = shuffle(eligible, rand).slice(0, 3);
  const pairs = chosen.map((verse) => {
    const list = words(verse.text);
    const cut = Math.ceil(list.length / 2);
    const head = list.slice(Math.max(0, cut - 6), cut);
    return {
      left: `${cut > 6 ? "… " : ""}${head.join(" ")}`,
      right: `${list.slice(cut, cut + 6).join(" ")}${list.length > cut + 6 ? " …" : ""}`,
    };
  });
  if (new Set(pairs.map((pair) => pair.right)).size < pairs.length) return null;
  chosen.forEach((verse) => used.add(verse.number));
  return { kind: "match", prompt: "Join each beginning to its ending", pairs, shuffled: scrambledOrder(3, rand) };
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

/** Runs split at paragraph/quote boundaries can lack a joining space ("water.”So"). */
export function appendRun(previous: string, text: string): string {
  const needsSpace = previous !== "" && !/\s$/.test(previous) && !/^[\s,.;:!?’”)\]]/.test(text);
  return `${previous}${needsSpace ? " " : ""}${text}`;
}

/** Flattens normalised chapter blocks into numbered verses. */
export function versesFromBlocks(blocks: ReadonlyArray<{ kind: string; segments?: ReadonlyArray<{ verseId: string | null; text: string }> }>): ChapterVerse[] {
  const map = new Map<number, string>();
  for (const block of blocks) {
    for (const segment of block.segments ?? []) {
      if (!segment.verseId) continue;
      const number = Number(segment.verseId.split(".")[2]);
      if (!Number.isFinite(number)) continue;
      map.set(number, appendRun(map.get(number) ?? "", segment.text));
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, text]) => ({ number, text: text.replace(/\s+/g, " ").trim() }));
}

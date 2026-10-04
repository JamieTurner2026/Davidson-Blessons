// Turns curated bank items (data/trivia.ts) and the canon into playable rounds. Pure.

import { PAIRS, TIMELINES, TRIVIA, WHO_SAID, type PairItem, type TriviaItem, type WhoItem } from "@/data/trivia";
import { BOOKS, getBook, parseVerseId, verseLabel } from "@/lib/canon";
import { scrambledOrder, shuffle, type ChoiceRound, type MatchRound, type OrderRound, type Question } from "@/lib/challenge";

type Rand = () => number;

function choice(kind: "trivia" | "who", prompt: string, clue: string, answer: string, wrong: string[], ref: string, rand: Rand): ChoiceRound {
  const options = shuffle([answer, ...wrong], rand);
  return { kind, prompt, clue, options, answer: options.indexOf(answer), reference: verseLabel(ref) };
}

export function triviaRound(item: TriviaItem, rand: Rand): ChoiceRound {
  return choice("trivia", "Bible trivia", item.q, item.a, item.wrong, item.ref, rand);
}

export function whoRound(item: WhoItem, rand: Rand): ChoiceRound {
  return choice("who", "Who said it?", item.quote, item.a, item.wrong, item.ref, rand);
}

export function timelineRound(rand: Rand): OrderRound {
  const timeline = TIMELINES[Math.floor(rand() * TIMELINES.length)];
  return {
    kind: "order",
    prompt: `Put in order · ${timeline.title}`,
    items: timeline.events.map((event) => event.text),
    shuffled: scrambledOrder(timeline.events.length, rand),
  };
}

/** Four books in canonical order, scrambled. */
export function bookOrderRound(rand: Rand, bookIds?: string[]): OrderRound {
  let books = bookIds?.map((id) => getBook(id)).filter((book) => book !== undefined) ?? [];
  if (books.length < 4) {
    const start = Math.floor(rand() * (BOOKS.length - 4));
    books = BOOKS.slice(start, start + 4);
  }
  return {
    kind: "order",
    prompt: "Put these books in Bible order",
    items: books.map((book) => book.name),
    shuffled: scrambledOrder(books.length, rand),
  };
}

export function pairMatchRound(rand: Rand, count = 3, pool: ReadonlyArray<PairItem> = PAIRS): MatchRound {
  const chosen = shuffle([...pool], rand).slice(0, count);
  return {
    kind: "match",
    prompt: "Match each person to their story",
    pairs: chosen.map((item) => ({ left: item.left, right: item.right })),
    shuffled: scrambledOrder(chosen.length, rand),
  };
}

function chapterOf(ref: string): string | null {
  const place = parseVerseId(ref);
  return place ? `${place.bookId}.${place.chapter}` : null;
}

/** Bank questions about a specific chapter (for lessons). */
export function bankRoundsForChapter(chapterId: string, rand: Rand): ChoiceRound[] {
  return [
    ...TRIVIA.filter((item) => chapterOf(item.ref) === chapterId).map((item) => triviaRound(item, rand)),
    ...WHO_SAID.filter((item) => chapterOf(item.ref) === chapterId).map((item) => whoRound(item, rand)),
  ];
}

/** Bank questions about a book (optionally a chapter range) — for checkpoints. */
export function bankRoundsForRange(bookId: string, from: number, to: number, rand: Rand): ChoiceRound[] {
  const inRange = (ref: string): boolean => {
    const place = parseVerseId(ref);
    return place !== null && place.bookId === bookId && place.chapter >= from && place.chapter <= to;
  };
  return shuffle(
    [
      ...TRIVIA.filter((item) => inRange(item.ref)).map((item) => triviaRound(item, rand)),
      ...WHO_SAID.filter((item) => inRange(item.ref)).map((item) => whoRound(item, rand)),
    ],
    rand,
  );
}

/** Same-division questions to top up a checkpoint when a book has few of its own. */
export function bankRoundsForDivision(bookId: string, rand: Rand): ChoiceRound[] {
  const division = getBook(bookId)?.division;
  const sameDivision = (ref: string): boolean => {
    const place = parseVerseId(ref);
    return place !== null && getBook(place.bookId)?.division === division;
  };
  return shuffle(
    [
      ...TRIVIA.filter((item) => sameDivision(item.ref)).map((item) => triviaRound(item, rand)),
      ...WHO_SAID.filter((item) => sameDivision(item.ref)).map((item) => whoRound(item, rand)),
    ],
    rand,
  );
}

/** A mixed trivia + who-said-it run. */
export function triviaRun(rand: Rand, count: number): Question[] {
  const pool: Question[] = [...TRIVIA.map((item) => triviaRound(item, rand)), ...WHO_SAID.map((item) => whoRound(item, rand))];
  return shuffle(pool, rand).slice(0, count);
}

// ── Lightning round: quick true/false + two-way choices ───────────

export interface LightningCard {
  statement: string;
  /** Labels for the two buttons. */
  options: [string, string];
  answer: 0 | 1;
}

export function lightningCard(rand: Rand): LightningCard {
  const roll = rand();
  if (roll < 0.45) {
    const item = TRIVIA[Math.floor(rand() * TRIVIA.length)];
    const truthful = rand() < 0.5;
    const shown = truthful ? item.a : item.wrong[Math.floor(rand() * 3)];
    return { statement: `${item.q} — ${shown}`, options: ["True", "False"], answer: truthful ? 0 : 1 };
  }
  if (roll < 0.65) {
    const item = WHO_SAID[Math.floor(rand() * WHO_SAID.length)];
    const truthful = rand() < 0.5;
    const shown = truthful ? item.a : item.wrong[Math.floor(rand() * 3)];
    return { statement: `“${item.quote}” — said by ${shown}`, options: ["True", "False"], answer: truthful ? 0 : 1 };
  }
  if (roll < 0.82) {
    const book = BOOKS[Math.floor(rand() * BOOKS.length)];
    return { statement: book.name, options: ["Old Testament", "New Testament"], answer: book.testament === "OT" ? 0 : 1 };
  }
  const first = Math.floor(rand() * (BOOKS.length - 1));
  let second = Math.floor(rand() * BOOKS.length);
  if (second === first) second = (first + 1) % BOOKS.length;
  const [a, b] = rand() < 0.5 ? [first, second] : [second, first];
  return { statement: "Which comes first?", options: [BOOKS[a].name, BOOKS[b].name], answer: a < b ? 0 : 1 };
}

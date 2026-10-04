import { QUIZ_POOL } from "@/data/quiz";
import { BOOKS, getBook, parseVerseId } from "@/lib/canon";
import { localDayNumber, sharedDayKey } from "@/lib/votd";

export interface DailyQuiz {
  /** Shared calendar day this quiz belongs to — the key answers are stored under. */
  day: string;
  verseId: string;
  answer: string;
  /** Four book IDs, shuffled, one of which is `answer`. */
  options: string[];
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/** Same quiz for everyone on a given day; offset from the verse of the day so they never match. */
export function dailyQuiz(date: Date): DailyQuiz {
  const dayNumber = localDayNumber(date);
  const verseId = QUIZ_POOL[(dayNumber * 7 + 3) % QUIZ_POOL.length];
  const answer = parseVerseId(verseId)?.bookId ?? "JHN";
  const testament = getBook(answer)?.testament ?? "NT";
  const random = seededRandom(dayNumber);

  const pool = BOOKS.filter((book) => book.testament === testament && book.id !== answer).map((book) => book.id);
  const distractors: string[] = [];
  while (distractors.length < 3 && pool.length > 0) {
    distractors.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  const options = [answer, ...distractors];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { day: sharedDayKey(date), verseId, answer, options };
}

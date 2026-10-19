import { QUIZ_POOL } from "@/data/quiz";
import { VOTD_POOL } from "@/data/votd";
import { BOOKS, getBook, parseVerseId } from "@/lib/canon";
import { localDayNumber, pickVerseOfDay, sharedDayKey } from "@/lib/votd";

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

/** Same quiz for everyone on a given day; steps past the verse of the day so the two never match. */
export function dailyQuiz(date: Date): DailyQuiz {
  const dayNumber = localDayNumber(date);
  const verseOfDay = pickVerseOfDay(date, VOTD_POOL);
  const slot = (dayNumber * 7 + 3) % QUIZ_POOL.length;
  const verseId = QUIZ_POOL[slot] === verseOfDay ? QUIZ_POOL[(slot + 1) % QUIZ_POOL.length] : QUIZ_POOL[slot];
  const answer = parseVerseId(verseId)?.bookId ?? "JHN";
  const book = getBook(answer);
  const testament = book?.testament ?? "NT";
  const random = seededRandom(dayNumber);

  // Wrong answers from the same section first (a prophet among prophets), so the kind of
  // book doesn't give it away; top up from the same testament for Acts / Revelation.
  const draw = (pool: string[], count: number): string[] => {
    const picked: string[] = [];
    while (picked.length < count && pool.length > 0) picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    return picked;
  };
  const sameSection = BOOKS.filter((entry) => entry.division === book?.division && entry.id !== answer).map((entry) => entry.id);
  const distractors = draw(sameSection, 3);
  const rest = BOOKS.filter((entry) => entry.testament === testament && entry.id !== answer && !distractors.includes(entry.id)).map((entry) => entry.id);
  distractors.push(...draw(rest, 3 - distractors.length));
  const options = [answer, ...distractors];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { day: sharedDayKey(date), verseId, answer, options };
}

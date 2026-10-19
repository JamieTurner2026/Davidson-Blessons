// Static 66-book Protestant canon. Lets the picker, prev/next and URL validation
// work without spending API.Bible quota. IDs are the USFM codes API.Bible uses.

export type DivisionId =
  | "law"
  | "history"
  | "wisdom"
  | "prophets"
  | "gospels"
  | "acts"
  | "letters"
  | "revelation";

export interface Book {
  id: string;
  name: string;
  chapters: number;
  testament: "OT" | "NT";
  division: DivisionId;
}

const raw: ReadonlyArray<[string, string, number, DivisionId]> = [
  ["GEN", "Genesis", 50, "law"],
  ["EXO", "Exodus", 40, "law"],
  ["LEV", "Leviticus", 27, "law"],
  ["NUM", "Numbers", 36, "law"],
  ["DEU", "Deuteronomy", 34, "law"],
  ["JOS", "Joshua", 24, "history"],
  ["JDG", "Judges", 21, "history"],
  ["RUT", "Ruth", 4, "history"],
  ["1SA", "1 Samuel", 31, "history"],
  ["2SA", "2 Samuel", 24, "history"],
  ["1KI", "1 Kings", 22, "history"],
  ["2KI", "2 Kings", 25, "history"],
  ["1CH", "1 Chronicles", 29, "history"],
  ["2CH", "2 Chronicles", 36, "history"],
  ["EZR", "Ezra", 10, "history"],
  ["NEH", "Nehemiah", 13, "history"],
  ["EST", "Esther", 10, "history"],
  ["JOB", "Job", 42, "wisdom"],
  ["PSA", "Psalms", 150, "wisdom"],
  ["PRO", "Proverbs", 31, "wisdom"],
  ["ECC", "Ecclesiastes", 12, "wisdom"],
  ["SNG", "Song of Songs", 8, "wisdom"],
  ["ISA", "Isaiah", 66, "prophets"],
  ["JER", "Jeremiah", 52, "prophets"],
  ["LAM", "Lamentations", 5, "prophets"],
  ["EZK", "Ezekiel", 48, "prophets"],
  ["DAN", "Daniel", 12, "prophets"],
  ["HOS", "Hosea", 14, "prophets"],
  ["JOL", "Joel", 3, "prophets"],
  ["AMO", "Amos", 9, "prophets"],
  ["OBA", "Obadiah", 1, "prophets"],
  ["JON", "Jonah", 4, "prophets"],
  ["MIC", "Micah", 7, "prophets"],
  ["NAM", "Nahum", 3, "prophets"],
  ["HAB", "Habakkuk", 3, "prophets"],
  ["ZEP", "Zephaniah", 3, "prophets"],
  ["HAG", "Haggai", 2, "prophets"],
  ["ZEC", "Zechariah", 14, "prophets"],
  ["MAL", "Malachi", 4, "prophets"],
  ["MAT", "Matthew", 28, "gospels"],
  ["MRK", "Mark", 16, "gospels"],
  ["LUK", "Luke", 24, "gospels"],
  ["JHN", "John", 21, "gospels"],
  ["ACT", "Acts", 28, "acts"],
  ["ROM", "Romans", 16, "letters"],
  ["1CO", "1 Corinthians", 16, "letters"],
  ["2CO", "2 Corinthians", 13, "letters"],
  ["GAL", "Galatians", 6, "letters"],
  ["EPH", "Ephesians", 6, "letters"],
  ["PHP", "Philippians", 4, "letters"],
  ["COL", "Colossians", 4, "letters"],
  ["1TH", "1 Thessalonians", 5, "letters"],
  ["2TH", "2 Thessalonians", 3, "letters"],
  ["1TI", "1 Timothy", 6, "letters"],
  ["2TI", "2 Timothy", 4, "letters"],
  ["TIT", "Titus", 3, "letters"],
  ["PHM", "Philemon", 1, "letters"],
  ["HEB", "Hebrews", 13, "letters"],
  ["JAS", "James", 5, "letters"],
  ["1PE", "1 Peter", 5, "letters"],
  ["2PE", "2 Peter", 3, "letters"],
  ["1JN", "1 John", 5, "letters"],
  ["2JN", "2 John", 1, "letters"],
  ["3JN", "3 John", 1, "letters"],
  ["JUD", "Jude", 1, "letters"],
  ["REV", "Revelation", 22, "revelation"],
];

export const BOOKS: ReadonlyArray<Book> = raw.map(([id, name, chapters, division], index) => ({
  id,
  name,
  chapters,
  division,
  testament: index < 39 ? "OT" : "NT",
}));

const byId = new Map(BOOKS.map((book) => [book.id, book]));

export function getBook(bookId: string): Book | undefined {
  return byId.get(bookId);
}

export interface ChapterRef {
  bookId: string;
  chapter: number;
}

const CHAPTER_ID = /^([1-3A-Z]{3})\.(\d{1,3})$/;
const VERSE_ID = /^([1-3A-Z]{3}\.\d{1,3})\.(\d{1,3})$/;

/** Parses "JHN.3" → { bookId: "JHN", chapter: 3 }, or null if not a real chapter. */
export function parseChapterId(chapterId: string): ChapterRef | null {
  const match = chapterId.match(CHAPTER_ID);
  if (!match) return null;
  const book = byId.get(match[1]);
  const chapter = Number(match[2]);
  if (!book || chapter < 1 || chapter > book.chapters) return null;
  return { bookId: book.id, chapter };
}

/** Parses "JHN.3.16" → chapter ref + verse number, or null. */
export function parseVerseId(verseId: string): (ChapterRef & { verse: number }) | null {
  const match = verseId.match(VERSE_ID);
  if (!match) return null;
  const ref = parseChapterId(match[1]);
  return ref ? { ...ref, verse: Number(match[2]) } : null;
}

export function chapterLabel(ref: ChapterRef): string {
  return `${getBook(ref.bookId)?.name ?? ref.bookId} ${ref.chapter}`;
}

export function verseLabel(verseId: string): string {
  const ref = parseVerseId(verseId);
  return ref ? `${chapterLabel(ref)}:${ref.verse}` : verseId;
}

/** Previous / next chapter across book boundaries; null at Genesis 1 / Revelation 22. */
export function adjacentChapter(ref: ChapterRef, direction: -1 | 1): string | null {
  const index = BOOKS.findIndex((book) => book.id === ref.bookId);
  if (index === -1) return null;
  const target = ref.chapter + direction;
  if (target >= 1 && target <= BOOKS[index].chapters) return `${ref.bookId}.${target}`;
  const neighbour = BOOKS[index + direction];
  if (!neighbour) return null;
  return `${neighbour.id}.${direction === 1 ? 1 : neighbour.chapters}`;
}

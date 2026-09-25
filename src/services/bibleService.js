// Centralized Bible service. Every screen that needs Scripture or book/
// chapter metadata must go through this module — never fetch("/api/bible/...")
// directly from a component. This is also the single place a translation
// could theoretically be swapped; per product requirement there is no
// translation selector anywhere in the UI, and every call here is NIV only.
//
// IMPORTANT: this app never fabricates, substitutes, or falls back to another
// translation. If NIV access isn't configured, getPassage()/getChapter() and
// friends resolve to a { available: false, reason, message } result and the
// UI must show that message as-is (see components/NivConfigNotice) rather
// than inventing text.

let accessStatusCache = null;
let accessStatusPromise = null;

async function fetchJson(path) {
  let res;
  try {
    res = await fetch(path, { headers: { Accept: "application/json" } });
  } catch (networkErr) {
    return {
      ok: false,
      reason: "NETWORK_ERROR",
      message: "Unable to load NIV Scripture right now. Please try again."
    };
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // fall through with body = null
  }

  if (!res.ok) {
    return {
      ok: false,
      reason: body?.reason || `HTTP_${res.status}`,
      message:
        body?.message ||
        "Unable to load NIV Scripture right now. Please try again."
    };
  }

  return { ok: true, ...body };
}

/** Checks (and memoizes) whether this deployment has verified NIV access. */
export async function getNivBible() {
  if (accessStatusCache) return accessStatusCache;
  if (!accessStatusPromise) {
    accessStatusPromise = fetchJson("/api/bible/verify-access").then((result) => {
      accessStatusCache = result;
      return result;
    });
  }
  return accessStatusPromise;
}

/** Clears the memoized access check (e.g. after an admin updates the App Key). */
export function resetNivAccessCache() {
  accessStatusCache = null;
  accessStatusPromise = null;
}

/** All 66 books with testament and chapter count. Always available — this is
 * bibliographic metadata, not Scripture text, so it doesn't require NIV
 * access to be configured. */
export async function getBooks() {
  return fetchJson("/api/bible/books");
}

export async function getBook(bookName) {
  const { books, ok, ...rest } = await getBooks();
  if (!ok) return { ok, ...rest };
  const book = books.find((b) => b.name.toLowerCase() === String(bookName).toLowerCase());
  if (!book) return { ok: false, reason: "UNKNOWN_BOOK", message: `"${bookName}" is not a recognized book.` };
  return { ok: true, book };
}

/** Chapter numbers for a book, derived from the static book list above. */
export async function getChapters(bookName) {
  const { ok, book, ...rest } = await getBook(bookName);
  if (!ok) return { ok, ...rest };
  return { ok: true, chapters: Array.from({ length: book.chapters }, (_, i) => i + 1) };
}

/** Full NIV chapter text. Requires verified NIV access — no fallback. */
export async function getChapter(bookName, chapterNumber) {
  return fetchJson(
    `/api/bible/passage?book=${encodeURIComponent(bookName)}&chapter=${encodeURIComponent(chapterNumber)}`
  );
}

/** A single NIV verse. Requires verified NIV access — no fallback. */
export async function getVerse(bookName, chapterNumber, verseNumber) {
  return fetchJson(
    `/api/bible/passage?book=${encodeURIComponent(bookName)}&chapter=${encodeURIComponent(chapterNumber)}&verse=${encodeURIComponent(verseNumber)}`
  );
}

/** Alias of getChapter/getVerse depending on whether verseNumber is given. */
export async function getPassage(bookName, chapterNumber, verseNumber) {
  return verseNumber
    ? getVerse(bookName, chapterNumber, verseNumber)
    : getChapter(bookName, chapterNumber);
}

/** Not yet backed by a confirmed YouVersion "daily verse" endpoint (the
 * public API reference doesn't document one). Rather than inventing an
 * endpoint, this deterministically rotates through a fixed reference list by
 * day-of-year and fetches that single passage through the real, licensed
 * NIV passage endpoint — so the text itself is still never fabricated. */
const DAILY_REFERENCES = [
  { book: "Psalms", chapter: 23, verse: 1 },
  { book: "John", chapter: 3, verse: 16 },
  { book: "Philippians", chapter: 4, verse: 6 },
  { book: "Proverbs", chapter: 3, verse: 5 },
  { book: "Romans", chapter: 8, verse: 28 },
  { book: "Isaiah", chapter: 41, verse: 10 },
  { book: "Joshua", chapter: 1, verse: 9 }
];

export async function getDailyVerse(date = new Date()) {
  const dayOfYear = Math.floor(
    (date - new Date(date.getFullYear(), 0, 0)) / 86400000
  );
  const ref = DAILY_REFERENCES[dayOfYear % DAILY_REFERENCES.length];
  const result = await getVerse(ref.book, ref.chapter, ref.verse);
  return { ...result, reference: ref };
}

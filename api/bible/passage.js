import { getPassage, YouVersionError } from "../../lib/youversion.js";
import { findBookByName } from "../../lib/usfmBooks.js";

const ERROR_STATUS = {
  MISSING_APP_KEY: 500,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  PROVIDER_ERROR: 502,
  NETWORK_ERROR: 502,
  NIV_NOT_FOUND: 500,
  NIV_NOT_LICENSED: 403,
  UNKNOWN_BOOK: 400
};

// GET /api/bible/passage?book=John&chapter=3[&verse=16]
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { book, chapter, verse } = req.query;
  if (!book || !chapter) {
    return res.status(400).json({
      reason: "MISSING_PARAMS",
      message: "book and chapter query params are required."
    });
  }

  const bookEntry = findBookByName(book);
  if (!bookEntry) {
    return res.status(400).json({
      reason: "UNKNOWN_BOOK",
      message: `"${book}" is not a recognized Bible book name.`
    });
  }

  const reference = verse
    ? `${bookEntry.usfm}.${chapter}.${verse}`
    : `${bookEntry.usfm}.${chapter}`;

  try {
    const passage = await getPassage(reference);
    return res.status(200).json({
      book: bookEntry.name,
      chapter: Number(chapter),
      verse: verse ? Number(verse) : null,
      ...passage
    });
  } catch (err) {
    if (err instanceof YouVersionError) {
      console.error(`[bible/passage] ${err.code}:`, err.detail || err.message);
      return res.status(ERROR_STATUS[err.code] || 500).json({
        reason: err.code,
        message: err.publicMessage
      });
    }
    console.error("[bible/passage] unexpected error:", err);
    return res.status(500).json({
      reason: "UNKNOWN_ERROR",
      message: "Unable to load NIV Scripture right now. Please try again."
    });
  }
}

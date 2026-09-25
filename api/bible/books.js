import { BOOKS } from "../../lib/usfmBooks.js";

// Book names and chapter counts are public bibliographic facts (not
// Scripture text), so this list is always available for navigation even
// before YVP_APP_KEY is configured or NIV access is confirmed. Actual
// Scripture text always goes through /api/bible/passage, which has no
// fallback and requires a verified NIV license.
export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed." });
  }
  return res.status(200).json({
    books: BOOKS.map(({ name, testament, chapters }) => ({
      name,
      testament,
      chapters
    })),
    totalChapters: BOOKS.reduce((sum, b) => sum + b.chapters, 0)
  });
}

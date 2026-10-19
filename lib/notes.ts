import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { BOOKS, type ChapterRef } from "@/lib/canon";

// Study notes ("what it means, three takeaways, a question to reflect on") are written ahead
// of time by the owner's NotebookLM bridge (bridge/) and exported by bridge/publish_static.py
// into public/data/notes/<book-slug>/<chapter>.json. That folder is generated per deploy and
// never committed, so a chapter without a file simply has no notes yet.

// The bridge names files after these book names. Both lists follow canon order.
const BRIDGE_NAMES = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
  "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
  "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum",
  "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
  "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
  "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

const NOTES_DIR = path.join(process.cwd(), "public", "data", "notes");

export function noteSlug(bookId: string): string | null {
  const index = BOOKS.findIndex((book) => book.id === bookId);
  const name = BRIDGE_NAMES[index];
  return name ? name.toLowerCase().replace(/ /g, "-") : null;
}

/** The written study notes (light markdown) for a chapter, or null if none exist yet. */
export async function getStudyNotes(place: ChapterRef): Promise<string | null> {
  const slug = noteSlug(place.bookId);
  if (!slug) return null;
  try {
    const raw = await readFile(path.join(NOTES_DIR, slug, `${place.chapter}.json`), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "explanation" in parsed) {
      const text = (parsed as { explanation: unknown }).explanation;
      return typeof text === "string" && text.trim() ? text : null;
    }
  } catch {
    // No file (not written yet, or local dev without the export) — not an error.
  }
  return null;
}

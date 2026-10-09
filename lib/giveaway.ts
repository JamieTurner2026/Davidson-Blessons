// "Which book?" fairness rule. A daily-quiz verse is a giveaway if its own text names the
// book it comes from ("But Ruth replied…", "For Ezra had set his heart…"). Pure, so both
// the verifier (scripts/verify-trivia.ts) and any future runtime filter can share it.

import { getBook } from "@/lib/canon";

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when `verseText` names the book `bookId` comes from, so the quiz answers itself.
 *
 * Book names come from the canon (`getBook(bookId)?.name`), e.g. "Ruth", "1 Samuel",
 * "Song of Songs", "Psalms", "Numbers", "Acts". Things to decide:
 *   - Numbered books: should "Samuel" alone count for "1 Samuel"? (It does give it away.)
 *   - Common words: "numbers", "judges", "kings", "acts", "proverbs", "lamentations",
 *     "revelation", "job" all appear as ordinary words. Match them only when capitalised
 *     mid-sentence, always, or never?
 *   - Whole words only: "Johnson" must not match "John"; "Ruth's" should match "Ruth".
 */
export function namesItsBook(verseText: string, bookId: string): boolean {
  const name = getBook(bookId)?.name;
  if (!name) return false;
  // TODO(Mike Norman, 2026-10-09): implement the giveaway rule (5–10 lines).
  void verseText;
  return false;
}

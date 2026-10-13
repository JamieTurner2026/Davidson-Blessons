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
  // "1 Samuel" → "Samuel": the bare name gives it away just as well.
  const base = name.replace(/^\d\s+/, "");
  const stems = base === "Psalms" ? ["Psalm"] : base === "Song of Songs" ? ["Song of Songs", "Solomon"] : [base];
  // Case-sensitive, so ordinary words ("judges", "numbers", "acts", "job") don't count,
  // while names ("Ruth", "Ruth's") do. Whole words only: "Johnson" isn't "John".
  return stems.some((stem) => new RegExp(`(^|[^\\p{L}])${escapeRegExp(stem)}(?:['’]s)?(?![\\p{L}])`, "u").test(verseText));
}

// The verse rolls over at local midnight for readers, not UTC midnight on the server.
const VOTD_TIME_ZONE = "America/New_York";

/** Days since 1970-01-01 for the calendar date `date` falls on in VOTD_TIME_ZONE. */
function localDayNumber(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VOTD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // "2026-10-04"
  const [year, month, day] = parts.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/**
 * Picks today's verse from the curated pool.
 *
 * Same verse for everyone on a given day. Uses a continuous day count (not day-of-year),
 * so the rotation walks the whole pool with no repeats until it's exhausted and doesn't
 * jump back to the start every 1 January.
 */
export function pickVerseOfDay(date: Date, verseIds: ReadonlyArray<string>): string {
  return verseIds[localDayNumber(date) % verseIds.length];
}

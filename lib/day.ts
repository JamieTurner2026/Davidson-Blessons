// Calendar-day helpers for the reader's own timezone. Day keys are "YYYY-MM-DD" and
// all arithmetic happens on UTC-noon dates so DST shifts can't skip or repeat a day.

export type DayKey = string;

export function dayKey(date: Date = new Date()): DayKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toUtcNoon(key: DayKey): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function dayNumber(key: DayKey): number {
  return Math.floor(toUtcNoon(key).getTime() / 86_400_000);
}

export function fromDayNumber(value: number): DayKey {
  return new Date(value * 86_400_000 + 43_200_000).toISOString().slice(0, 10);
}

export function addDays(key: DayKey, amount: number): DayKey {
  return fromDayNumber(dayNumber(key) + amount);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(key: DayKey): number {
  return toUtcNoon(key).getUTCDay();
}

import { getBook } from "@/lib/canon";

export interface PlanDay {
  day: number;
  /** Chapter IDs to read that day, e.g. ["MAT.1", "MAT.2"]. */
  chapters: string[];
}

export interface ReadingPlan {
  id: string;
  title: string;
  summary: string;
  days: PlanDay[];
}

function chaptersOf(bookIds: string[]): string[] {
  return bookIds.flatMap((bookId) => {
    const book = getBook(bookId);
    return book ? Array.from({ length: book.chapters }, (_, index) => `${bookId}.${index + 1}`) : [];
  });
}

/** Spreads chapters as evenly as possible across `dayCount` days. */
function spread(chapters: string[], dayCount: number): PlanDay[] {
  return Array.from({ length: dayCount }, (_, index) => {
    const start = Math.round((index * chapters.length) / dayCount);
    const end = Math.round(((index + 1) * chapters.length) / dayCount);
    return { day: index + 1, chapters: chapters.slice(start, end) };
  });
}

export const PLANS: ReadonlyArray<ReadingPlan> = [
  {
    id: "gospels-30",
    title: "The Gospels in 30 days",
    summary: "Matthew, Mark, Luke and John — about three chapters a day.",
    days: spread(chaptersOf(["MAT", "MRK", "LUK", "JHN"]), 30),
  },
  {
    id: "wisdom-31",
    title: "Proverbs & Psalms in 31 days",
    summary: "One proverb a day, alongside five psalms.",
    days: Array.from({ length: 31 }, (_, index) => ({
      day: index + 1,
      chapters: [
        `PRO.${index + 1}`,
        ...Array.from({ length: 5 }, (_, offset) => `PSA.${index * 5 + offset + 1}`).filter(
          (id) => Number(id.split(".")[1]) <= 150,
        ),
      ],
    })),
  },
];

export function getPlan(planId: string): ReadingPlan | undefined {
  return PLANS.find((plan) => plan.id === planId);
}

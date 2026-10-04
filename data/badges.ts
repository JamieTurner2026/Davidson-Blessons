import type { GameSnapshot } from "@/lib/game";

export interface Badge {
  id: string;
  name: string;
  /** Shown on locked badges — how to earn it. */
  hint: string;
  /** Shown when earned. */
  blurb: string;
  image: string;
  earned: (snapshot: GameSnapshot) => boolean;
}

const GOSPELS = ["MAT", "MRK", "LUK", "JHN"];

export const BADGES: ReadonlyArray<Badge> = [
  {
    id: "first-light",
    name: "First Light",
    hint: "Finish reading your first chapter.",
    blurb: "Your first chapter, read to the end.",
    image: "/badges/first-light.webp",
    earned: (s) => s.chaptersRead.size >= 1,
  },
  {
    id: "kindled",
    name: "Kindled",
    hint: "Keep a 3-day streak.",
    blurb: "Three days in the Word. The fire's catching.",
    image: "/badges/kindled.webp",
    earned: (s) => s.longestStreak >= 3,
  },
  {
    id: "steadfast",
    name: "Steadfast",
    hint: "Keep a 7-day streak.",
    blurb: "A whole week, anchored.",
    image: "/badges/steadfast.webp",
    earned: (s) => s.longestStreak >= 7,
  },
  {
    id: "faithful",
    name: "Faithful",
    hint: "Keep a 30-day streak.",
    blurb: "Thirty days — rooted like a cedar.",
    image: "/badges/faithful.webp",
    earned: (s) => s.longestStreak >= 30,
  },
  {
    id: "perfect-week",
    name: "Perfect Week",
    hint: "Light your lamp every day from Sunday to Saturday.",
    blurb: "Seven days, seven lamps.",
    image: "/badges/perfect-week.webp",
    earned: (s) => s.perfectWeeks >= 1,
  },
  {
    id: "gospel-reader",
    name: "Gospel Reader",
    hint: "Finish Matthew, Mark, Luke and John.",
    blurb: "All four Gospels, start to finish.",
    image: "/badges/gospel-reader.webp",
    earned: (s) => GOSPELS.every((id) => s.booksComplete.has(id)),
  },
  {
    id: "psalmist",
    name: "Psalmist",
    hint: "Read 30 Psalms.",
    blurb: "Thirty songs prayed through.",
    image: "/badges/psalmist.webp",
    earned: (s) => [...s.chaptersRead].filter((id) => id.startsWith("PSA.")).length >= 30,
  },
  {
    id: "hidden-heart",
    name: "Hidden in the Heart",
    hint: "Master your first memory verse.",
    blurb: "“I have hidden your word in my heart.”",
    image: "/badges/hidden-heart.webp",
    earned: (s) => s.mastered >= 1,
  },
  {
    id: "scribe",
    name: "Scribe",
    hint: "Write 10 notes.",
    blurb: "Ten reflections written down.",
    image: "/badges/scribe.webp",
    earned: (s) => s.notes >= 10,
  },
  {
    id: "seeker",
    name: "Seeker",
    hint: "Answer 7 daily quizzes correctly.",
    blurb: "Seven right answers. Keep seeking.",
    image: "/badges/seeker.webp",
    earned: (s) => s.quizCorrect >= 7,
  },
  {
    id: "bookworm",
    name: "Bookworm",
    hint: "Finish 10 books of the Bible.",
    blurb: "Ten books on your shelf.",
    image: "/badges/bookworm.webp",
    earned: (s) => s.booksComplete.size >= 10,
  },
  {
    id: "finisher",
    name: "Finisher",
    hint: "Complete a reading plan.",
    blurb: "You finished the race you started.",
    image: "/badges/finisher.webp",
    earned: (s) => s.plansComplete >= 1,
  },
  {
    id: "trailblazer",
    name: "Trailblazer",
    hint: "Earn 50 stars on the journey map.",
    blurb: "Fifty stars along the trail.",
    image: "/badges/trailblazer.webp",
    earned: (s) => s.starsTotal >= 50,
  },
  {
    id: "treasure-seeker",
    name: "Treasure Seeker",
    hint: "Find 10 treasure verses.",
    blurb: "“Where your treasure is, there your heart will be also.”",
    image: "/badges/treasure-seeker.webp",
    earned: (s) => s.treasures >= 10,
  },
  {
    id: "collector",
    name: "Collector",
    hint: "Own 4 items from the Workshop.",
    blurb: "A well-stocked shelf of lamps and keepsakes.",
    image: "/badges/collector.webp",
    earned: (s) => s.cosmeticsOwned >= 4,
  },
];

export function getBadge(id: string): Badge | undefined {
  return BADGES.find((badge) => badge.id === id);
}

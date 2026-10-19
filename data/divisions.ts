import type { DivisionId } from "@/lib/canon";

export interface Division {
  id: DivisionId;
  title: string;
  span: string;
  /** Hand-drawn illustration in /public/art (generated with Magnific). */
  art: string;
  /** Chapter the card opens to. */
  start: string;
}

export const DIVISIONS: ReadonlyArray<Division> = [
  { id: "law", title: "The Law", span: "Genesis – Deuteronomy", art: "/art/law.webp", start: "GEN.1" },
  { id: "history", title: "History", span: "Joshua – Esther", art: "/art/history.webp", start: "JOS.1" },
  { id: "wisdom", title: "Poetry & Wisdom", span: "Job – Song of Songs", art: "/art/wisdom.webp", start: "PSA.1" },
  { id: "prophets", title: "The Prophets", span: "Isaiah – Malachi", art: "/art/prophets.webp", start: "ISA.1" },
  { id: "gospels", title: "The Gospels", span: "Matthew – John", art: "/art/gospels.webp", start: "MAT.1" },
  { id: "acts", title: "Acts", span: "The early church", art: "/art/acts.webp", start: "ACT.1" },
  { id: "letters", title: "The Letters", span: "Romans – Jude", art: "/art/letters.webp", start: "ROM.1" },
  { id: "revelation", title: "Revelation", span: "The final vision", art: "/art/revelation.webp", start: "REV.1" },
];

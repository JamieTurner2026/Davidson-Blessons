"use client";

import type { ReactNode } from "react";

import { ProgressFill } from "@/components/motion/ProgressFill";
import { BOOKS } from "@/lib/canon";
import { useStudy } from "@/lib/study-store";

const TOTAL_CHAPTERS = BOOKS.reduce((sum, book) => sum + book.chapters, 0);

/** How much of the Bible has been read, plus how many chapters have study notes written. */
export function ProgressCandle({ notesReady }: { notesReady: number }): ReactNode {
  const { chaptersRead } = useStudy();
  const learned = Object.keys(chaptersRead).length;

  return (
    <section className="tile">
      <span className="ws-muted">Chapters read</span>
      <span className="tile__big">
        {learned.toLocaleString()} of {TOTAL_CHAPTERS.toLocaleString()}
      </span>
      <ProgressFill value={learned / TOTAL_CHAPTERS} label="Chapters read across the Bible" />
      <span className="ws-muted">
        Study notes written so far: {notesReady.toLocaleString()} of {TOTAL_CHAPTERS.toLocaleString()} chapters (outlined in the chapter picker)
      </span>
    </section>
  );
}

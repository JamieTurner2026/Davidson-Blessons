"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { JourneyPicker } from "@/components/map/JourneyPicker";
import { Trail } from "@/components/map/Trail";
import { parseChapterId } from "@/lib/canon";
import { useStudy } from "@/lib/study-store";

const STARTER_JOURNEY = "JHN";

/** The book you're travelling: explicit choice → last-read book → John. */
export function useCurrentJourney(explicit: string | null): string {
  const { lastRead } = useStudy();
  if (explicit) return explicit;
  return (lastRead && parseChapterId(lastRead.chapterId)?.bookId) || STARTER_JOURNEY;
}

export function MapClient({ book: bookParam, from }: { book: string | null; from: string | null }): ReactNode {
  const { translation } = useStudy();
  const fromRef = from ? parseChapterId(from) : null;
  const [picked, setPicked] = useState<string | null>(bookParam ?? fromRef?.bookId ?? null);
  const [choosing, setChoosing] = useState(false);
  const book = useCurrentJourney(picked);

  return (
    <div className="ws-stack" style={{ paddingBlock: 0, gap: 30 }}>
      <div className="ws-pills">
        <button type="button" className="ws-pill" aria-expanded={choosing} onClick={() => setChoosing((value) => !value)}>
          {choosing ? "Back to the trail" : "Choose a journey"}
        </button>
        <Link href="/library" className="ws-pill">
          Library
        </Link>
        <Link href="/workshop" className="ws-pill">
          Workshop
        </Link>
      </div>

      {choosing ? (
        <JourneyPicker
          current={book}
          onPick={(bookId) => {
            setPicked(bookId);
            setChoosing(false);
          }}
        />
      ) : (
        <Trail
          key={book}
          bookId={book}
          translation={translation}
          walkFrom={fromRef && fromRef.bookId === book ? fromRef.chapter : null}
        />
      )}
    </div>
  );
}

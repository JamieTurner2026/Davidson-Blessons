"use client";

import type { ReactNode } from "react";

import { DIVISIONS } from "@/data/divisions";
import { BOOKS } from "@/lib/canon";
import { useStudy } from "@/lib/study-store";

function MiniRing({ progress }: { progress: number }): ReactNode {
  const radius = 13;
  const length = 2 * Math.PI * radius;
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" style={{ flex: "none" }}>
      <circle cx="16" cy="16" r={radius} fill="none" stroke="var(--ws-border)" strokeWidth="3" />
      <circle
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke={progress >= 1 ? "var(--ws-accent)" : "var(--ws-fg)"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - progress)}
        transform="rotate(-90 16 16)"
      />
    </svg>
  );
}

/** All 66 journeys, grouped by division, with progress and stars. */
export function JourneyPicker({ current, onPick }: { current: string; onPick: (bookId: string) => void }): ReactNode {
  const { chaptersRead, stars } = useStudy();

  return (
    <div className="journeys">
      {DIVISIONS.map((division) => (
        <section key={division.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 className="ws-label" style={{ margin: 0 }}>
            {division.title}
          </h3>
          <div className="journeys__row">
            {BOOKS.filter((book) => book.division === division.id).map((book) => {
              let read = 0;
              let starCount = 0;
              for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
                if (chaptersRead[`${book.id}.${chapter}`]) read += 1;
                starCount += stars[`${book.id}.${chapter}`] ?? 0;
              }
              return (
                <button key={book.id} type="button" className="journey-chip" aria-current={book.id === current} onClick={() => onPick(book.id)}>
                  <MiniRing progress={read / book.chapters} />
                  <span className="journey-chip__meta">
                    <span>{book.name}</span>
                    <span>
                      {read}/{book.chapters} · ★ {starCount}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

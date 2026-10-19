"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useCurrentJourney } from "@/components/map/MapClient";
import { Trail } from "@/components/map/Trail";
import { getBook } from "@/lib/canon";
import { useStudy } from "@/lib/study-store";

/** Home's slice of the journey: a few stops around where the pilgrim stands. */
export function HomeTrail(): ReactNode {
  const { translation } = useStudy();
  const book = useCurrentJourney(null);

  return (
    <section className="home-trail" aria-label="Your trail">
      <div className="ws-row">
        <h2 className="ws-heading">Your trail · {getBook(book)?.name}</h2>
        <Link href={`/map?book=${book}`} className="ws-pill">
          Open the map →
        </Link>
      </div>
      <Trail key={book} bookId={book} translation={translation} windowSize={5} showLandmark={false} />
    </section>
  );
}

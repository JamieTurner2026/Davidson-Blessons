"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { Star } from "@/components/ChallengeSheet";
import { Pilgrim } from "@/components/map/Pilgrim";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { DIVISIONS } from "@/data/divisions";
import { getBook } from "@/lib/canon";
import { CHECKPOINT_EVERY, MAX_STARS } from "@/lib/game";
import { useStudy } from "@/lib/study-store";

// A winding, hand-inked trail of chapter "stops" for one book. Scripture is never locked:
// every stop is a link; the trail just shows where you've been and where you're headed.

const WIDTH = 320;
const ROW = 108;
const TOP = 56;
const AMPLITUDE = 92;
const NODE = 58;

interface Point {
  x: number;
  y: number;
}

/** Rounded so server (Node) and browser Math.sin agree exactly — avoids hydration mismatches. */
function pointAt(index: number): Point {
  return { x: Math.round((WIDTH / 2 + AMPLITUDE * Math.sin(index * 1.15)) * 10) / 10, y: TOP + index * ROW };
}

function trailPath(points: Point[]): string {
  if (points.length === 0) return "";
  return points.reduce((d, point, index) => {
    if (index === 0) return `M${point.x} ${point.y}`;
    const previous = points[index - 1];
    return `${d} C${previous.x} ${previous.y + ROW / 2} ${point.x} ${point.y - ROW / 2} ${point.x} ${point.y}`;
  }, "");
}

/** Where the pilgrim stands beside a stop — on the side with more room. */
function standingSpot(point: Point): Point {
  const side = point.x > WIDTH / 2 ? -1 : 1;
  return { x: point.x + side * (NODE / 2 + 34), y: point.y + NODE / 2 - 4 };
}

interface Props {
  bookId: string;
  translation: string;
  /** Max stops shown at once; long books page through windows. */
  windowSize?: number;
  /** Chapter number the pilgrim just finished — he walks from there to the next stop. */
  walkFrom?: number | null;
  showLandmark?: boolean;
}

export function Trail({ bookId, translation, windowSize = 30, walkFrom = null, showLandmark = true }: Props): ReactNode {
  const { chaptersRead, stars, checkpoints } = useStudy();
  const book = getBook(bookId);
  const total = book?.chapters ?? 0;
  const firstUnread = useMemo(() => {
    for (let chapter = 1; chapter <= total; chapter += 1) if (!chaptersRead[`${bookId}.${chapter}`]) return chapter;
    return null;
  }, [bookId, chaptersRead, total]);
  const next = firstUnread ?? total;
  const defaultStart = Math.max(1, Math.min(next - Math.floor(windowSize / 3), total - windowSize + 1));
  const [start, setStart] = useState<number | null>(null);
  const from = start ?? defaultStart;
  const end = Math.min(total, from + windowSize - 1);
  const chapters = useMemo(() => Array.from({ length: Math.max(0, end - from + 1) }, (_, index) => from + index), [from, end]);
  const points = useMemo(() => chapters.map((_, index) => pointAt(index)), [chapters]);
  const nextIndex = chapters.indexOf(next);
  const travelled = trailPath(points.slice(0, Math.max(1, nextIndex + 1)));
  const fullPath = trailPath(points);
  const root = useRef<HTMLDivElement>(null);
  const division = DIVISIONS.find((item) => item.id === book?.division);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(".trail__walked", { drawSVG: "0%", duration: 1.4, ease: "power2.inOut", delay: 0.2 });
        gsap.to(".trail__pulse", { scale: 1.35, autoAlpha: 0, duration: 1.4, ease: "power1.out", repeat: -1 });
      });
    },
    { scope: root, dependencies: [from, bookId], revertOnUpdate: true },
  );

  if (!book) return null;

  const walkStartIndex = walkFrom !== null ? chapters.indexOf(walkFrom) : -1;
  const pilgrimPoint = nextIndex >= 0 ? standingSpot(points[nextIndex]) : null;
  const walkPoints =
    walkStartIndex >= 0 && nextIndex > walkStartIndex
      ? points.slice(walkStartIndex, nextIndex + 1).map(standingSpot)
      : null;
  const height = TOP + Math.max(0, chapters.length - 1) * ROW + NODE + 40;

  return (
    <div ref={root} className="trail">
      {showLandmark && division && (
        <div className="trail__landmark">
          <Image src={division.art} alt="" width={600} height={400} />
          <span className="ws-muted">{division.title}</span>
          <h2 className="ws-heading">{book.name}</h2>
          <span className="ws-muted">
            {Object.keys(chaptersRead).filter((id) => id.startsWith(`${bookId}.`)).length}/{total} stops ·{" "}
            {chapters.length > 0 ? `showing ${from}–${end}` : ""}
          </span>
        </div>
      )}

      {from > 1 && (
        <div className="ws-pills">
          <button type="button" className="ws-pill ws-pill--sm" onClick={() => setStart(Math.max(1, from - windowSize))}>
            ↑ Earlier stops
          </button>
        </div>
      )}

      <div className="trail__canvas" style={{ width: WIDTH, height }}>
        <svg className="trail__svg" width={WIDTH} height={height} viewBox={`0 0 ${WIDTH} ${height}`} aria-hidden="true">
          <path d={fullPath} className="trail__ahead" />
          <path d={travelled} className="trail__walked" />
        </svg>

        {chapters.map((chapter, index) => {
          const point = points[index];
          const done = Boolean(chaptersRead[`${bookId}.${chapter}`]);
          const isNext = chapter === firstUnread;
          const count = stars[`${bookId}.${chapter}`] ?? 0;
          return (
            <Link
              key={chapter}
              href={`/lesson/${translation}/${bookId}.${chapter}`}
              className={`trail__node ${done ? "is-done" : isNext ? "is-next" : ""}`}
              style={{ left: point.x - NODE / 2, top: point.y - NODE / 2, width: NODE, height: NODE, ["--i" as string]: index }}
              aria-label={`${book.name} ${chapter}${done ? `, read, ${count} stars` : isNext ? ", next stop" : ""}`}
            >
              {isNext && <span className="trail__pulse" aria-hidden="true" />}
              <span className="trail__number">{chapter}</span>
              {done && (
                <span className="trail__stars" aria-hidden="true">
                  {Array.from({ length: MAX_STARS }, (_, starIndex) => (
                    <Star key={starIndex} filled={starIndex < count} size={14} />
                  ))}
                </span>
              )}
            </Link>
          );
        })}

        {chapters.map((chapter, index) => {
          if (chapter % CHECKPOINT_EVERY !== 0) return null;
          const here = points[index];
          const after = points[index + 1] ?? { x: here.x, y: here.y + ROW };
          const spot = { x: (here.x + after.x) / 2 + (here.x > WIDTH / 2 ? -46 : 46), y: (here.y + after.y) / 2 };
          const done = checkpoints[`${bookId}:${chapter}`] ?? 0;
          return (
            <Link
              key={`checkpoint-${chapter}`}
              href={`/play?book=${bookId}&at=${chapter}`}
              className={`trail__checkpoint ${done ? "is-done" : ""}`}
              style={{ left: spot.x, top: spot.y }}
              aria-label={`Checkpoint after ${book.name} ${chapter}${done ? `, ${done} stars` : ""}`}
              title={`Checkpoint · chapters ${Math.max(1, chapter - CHECKPOINT_EVERY + 1)}–${chapter}`}
            >
              <span aria-hidden="true">✦</span>
            </Link>
          );
        })}

        {pilgrimPoint && <Pilgrim at={pilgrimPoint} walkPath={walkPoints} />}
      </div>

      {end < total && (
        <div className="ws-pills">
          <button type="button" className="ws-pill ws-pill--sm" onClick={() => setStart(Math.min(total - windowSize + 1, from + windowSize))}>
            Later stops ↓
          </button>
        </div>
      )}

      {firstUnread === null && (
        <p className="ws-muted" style={{ textAlign: "center", margin: 0 }}>
          Journey complete — every stop in {book.name} visited.
        </p>
      )}
    </div>
  );
}

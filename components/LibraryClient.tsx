"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";

import { CountUp } from "@/components/motion/CountUp";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { DIVISIONS } from "@/data/divisions";
import { BOOKS, type Book } from "@/lib/canon";
import { useStudy } from "@/lib/study-store";

function readCount(book: Book, chaptersRead: Record<string, string>): number {
  let count = 0;
  for (let chapter = 1; chapter <= book.chapters; chapter += 1) if (chaptersRead[`${book.id}.${chapter}`]) count += 1;
  return count;
}

/** First unread chapter, so tapping a spine continues where you left off. */
function nextChapter(book: Book, chaptersRead: Record<string, string>): number {
  for (let chapter = 1; chapter <= book.chapters; chapter += 1) if (!chaptersRead[`${book.id}.${chapter}`]) return chapter;
  return 1;
}

export function LibraryClient(): ReactNode {
  const { chaptersRead, translation } = useStudy();
  const root = useRef<HTMLDivElement>(null);
  const totalChapters = BOOKS.reduce((sum, book) => sum + book.chapters, 0);
  const totalRead = Object.keys(chaptersRead).length;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(".spine", { y: 30, autoAlpha: 0, duration: 0.5, ease: "back.out(1.8)", stagger: { each: 0.012, from: "start" } });
        gsap.from(".spine__fill", { scaleY: 0, duration: 1.1, ease: "power3.out", stagger: 0.012, delay: 0.3 });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="ws-stack" style={{ paddingBlock: 0, gap: 48 }}>
      <p className="ws-muted" style={{ margin: 0, textAlign: "center" }}>
        <CountUp value={totalRead} /> of {totalChapters.toLocaleString()} chapters read. Each spine fills as you finish its chapters.
      </p>
      {DIVISIONS.map((division) => {
        const books = BOOKS.filter((book) => book.division === division.id);
        const done = books.filter((book) => readCount(book, chaptersRead) === book.chapters).length;
        return (
          <section key={division.id} className="shelf">
            <div className="ws-row">
              <h2 className="ws-heading">{division.title}</h2>
              <span className="ws-muted">
                {done}/{books.length} books
              </span>
            </div>
            <div className="shelf__row">
              {books.map((book) => {
                const count = readCount(book, chaptersRead);
                const complete = count === book.chapters;
                const size = book.chapters <= 5 ? "spine spine--short" : book.chapters >= 40 ? "spine spine--tall" : "spine";
                return (
                  <Link
                    key={book.id}
                    href={`/read/${translation}/${book.id}.${nextChapter(book, chaptersRead)}`}
                    className={complete ? `${size} is-complete` : size}
                    title={`${book.name} — ${count}/${book.chapters} chapters`}
                    aria-label={`${book.name}, ${count} of ${book.chapters} chapters read`}
                  >
                    <span className="spine__fill" style={{ height: `${(count / book.chapters) * 100}%` }} />
                    <span className="spine__label">{book.name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";

import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { originOf } from "@/lib/celebrations";
import { getBook, parseVerseId } from "@/lib/canon";
import { answerQuiz, useStudy } from "@/lib/study-store";

interface Props {
  day: string;
  verseId: string;
  text: string;
  answer: string;
  options: string[];
  translation: string;
}

export function QuizCard({ day, verseId, text, answer, options, translation }: Props): ReactNode {
  const { quiz } = useStudy();
  const result = quiz[day];
  const root = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: root });
  const ref = parseVerseId(verseId);

  const choose = contextSafe((bookId: string, button: HTMLButtonElement) => {
    if (result) return;
    const correct = bookId === answer;
    answerQuiz(day, bookId, correct, originOf(button));
    if (!window.matchMedia(MOTION_OK).matches) return;
    if (correct) gsap.fromTo(button, { scale: 1.15 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    else gsap.fromTo(button, { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1.2, 0.25)" });
  });

  return (
    <div ref={root} className="tile" style={{ gap: 14 }}>
      <div className="ws-row">
        <span className="ws-muted">Daily quiz · Which book?</span>
        {result && <span className="ws-label">{(result.xp ?? (result.correct ? 15 : 5)) > 0 ? `+${result.xp ?? (result.correct ? 15 : 5)} XP` : "Answered"}</span>}
      </div>
      <p className="quiz__verse">“{text}”</p>
      <div className="quiz__choices" role="group" aria-label="Choose the book">
        {options.map((bookId) => {
          const isAnswer = bookId === answer;
          const picked = result?.answer === bookId;
          const className = [
            "ws-pill",
            result && isAnswer ? "is-active" : "",
            result && picked && !isAnswer ? "is-wrong" : "",
          ].join(" ");
          return (
            <button
              key={bookId}
              type="button"
              className={className}
              disabled={Boolean(result) && !isAnswer && !picked}
              aria-pressed={picked}
              onClick={(event) => choose(bookId, event.currentTarget)}
            >
              {getBook(bookId)?.name ?? bookId}
            </button>
          );
        })}
      </div>
      {result && ref && (
        <span className="ws-muted">
          {result.correct ? "Right! " : "Not quite — "}
          <Link href={`/read/${translation}/${ref.bookId}.${ref.chapter}#${verseId}`}>
            Read it in context →
          </Link>
        </span>
      )}
    </div>
  );
}

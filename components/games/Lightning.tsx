"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { RunResult } from "@/components/games/GameShell";
import { MOTION_OK, gsap } from "@/components/motion/gsap";
import { lightningCard, type LightningCard } from "@/lib/bank";
import { play } from "@/lib/sound";

const SECONDS = 60;

/** 60 seconds of rapid-fire two-button questions. Score = right − wrong, so mashing a button scores nothing. */
export function Lightning({ rand, onFinish }: { rand: () => number; onFinish: (result: RunResult) => void }): ReactNode {
  // Pin the generator for the whole run so a parent re-render can't replay the sequence.
  const randRef = useRef(rand);
  const [card, setCard] = useState<LightningCard>(() => lightningCard(rand));
  const [left, setLeft] = useState(SECONDS);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [flash, setFlash] = useState<"right" | "wrong" | null>(null);
  const totals = useRef({ correct: 0, answered: 0 });
  const finished = useRef(false);
  // Keep the latest callback without restarting the 60-second timer on every render.
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          if (!finished.current) {
            finished.current = true;
            const { correct: right, answered: total } = totals.current;
            const score = Math.max(0, right - (total - right));
            window.setTimeout(
              () => onFinishRef.current({ correct: score, score, summary: `${score} points · ${right} right, ${total - right} wrong in ${SECONDS} seconds` }),
              0,
            );
          }
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const answer = (choice: 0 | 1): void => {
    if (left <= 0 || flash) return;
    const right = choice === card.answer;
    totals.current = { correct: totals.current.correct + (right ? 1 : 0), answered: totals.current.answered + 1 };
    setCorrect(totals.current.correct);
    setAnswered(totals.current.answered);
    setFlash(right ? "right" : "wrong");
    play(right ? "tick" : "thud");
    if (window.matchMedia(MOTION_OK).matches) {
      const target = root.current?.querySelector(".lightning__card");
      if (target) {
        if (right) gsap.fromTo(target, { scale: 1.04 }, { scale: 1, duration: 0.25 });
        else gsap.fromTo(target, { x: -8 }, { x: 0, duration: 0.35, ease: "elastic.out(1.2, 0.25)" });
      }
    }
    window.setTimeout(() => {
      setFlash(null);
      setCard(lightningCard(randRef.current));
    }, right ? 220 : 650);
  };

  return (
    <div ref={root} className="lesson__round">
      <div className="ws-row">
        <span className="lightning__clock" aria-live="off">
          {left}s
        </span>
        <span className="ws-muted">
          {Math.max(0, correct - (answered - correct))} points · {answered} answered
        </span>
      </div>
      <div className="lesson__progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${left / SECONDS})`, transition: "transform 1s linear" }} />
      </div>
      <div className={`lightning__card ${flash ? `is-${flash}` : ""}`}>
        <p className="challenge__clue challenge__clue--question" style={{ textAlign: "center" }}>
          {card.statement}
        </p>
        <div className="lightning__buttons">
          {card.options.map((option, index) => (
            <button
              key={option}
              type="button"
              className={`ws-pill challenge__option ${flash && index === card.answer ? "is-active" : ""}`}
              onClick={() => answer(index === 0 ? 0 : 1)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

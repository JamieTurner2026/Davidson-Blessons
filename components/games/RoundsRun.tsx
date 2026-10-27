"use client";

import { useState, type ReactNode } from "react";

import type { RunResult } from "@/components/games/GameShell";
import { RoundRenderer } from "@/components/rounds/RoundRenderer";
import type { Question } from "@/lib/challenge";

/** Plays a fixed list of rounds with a progress bar, then reports correct/total. */
export function RoundsRun({ rounds, onFinish }: { rounds: Question[]; onFinish: (result: RunResult) => void }): ReactNode {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const round = rounds[index];

  const done = (wasCorrect: boolean): void => {
    const next = correct + (wasCorrect ? 1 : 0);
    setCorrect(next);
    if (index + 1 < rounds.length) setIndex(index + 1);
    else onFinish({ correct: next, score: next, summary: `${next} of ${rounds.length} right` });
  };

  if (!round) return null;
  return (
    <div className="lesson__round">
      <div className="challenge__progress" aria-hidden="true">
        {rounds.map((_, step) => (
          <span key={step} className={step < index ? "is-done" : step === index ? "is-now" : ""} />
        ))}
      </div>
      <span className="ws-label">{round.prompt}</span>
      <RoundRenderer key={index} round={round} onDone={done} />
    </div>
  );
}

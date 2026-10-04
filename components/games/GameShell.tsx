"use client";

import { useRef, useState, type ReactNode } from "react";

import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { originOf } from "@/lib/celebrations";
import { recordGame, useStudy, type GameMode } from "@/lib/study-store";

export interface RunResult {
  correct: number;
  score: number;
  /** Short summary, e.g. "7 of 8 right". */
  summary: string;
}

interface Props {
  mode: GameMode;
  title: string;
  blurb: string;
  scoreLabel: string;
  onExit: () => void;
  /** Renders a run; call `finish` exactly once. `runKey` changes on every new run. */
  children: (finish: (result: RunResult) => void, runKey: number) => ReactNode;
}

/** Intro → play → results, with best-score tracking. Shared by every game mode. */
export function GameShell({ mode, title, blurb, scoreLabel, onExit, children }: Props): ReactNode {
  const { games } = useStudy();
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [isBest, setIsBest] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const best = games[mode]?.best ?? 0;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(root.current, { y: 24, autoAlpha: 0, duration: 0.45, ease: "power3.out" });
      });
    },
    { dependencies: [phase, runKey], revertOnUpdate: true },
  );

  const start = (): void => {
    setRunKey((value) => value + 1);
    setResult(null);
    setPhase("play");
  };

  const finish = (run: RunResult): void => {
    setResult(run);
    // Query the DOM (not the ref) — this callback is handed to children during render.
    setIsBest(recordGame(mode, run.correct, run.score, originOf(document.querySelector(".game__stage"))));
    setPhase("done");
  };

  return (
    <div className="game">
      <div className="lesson__top">
        <button type="button" className="ws-pill ws-pill--sm" onClick={onExit} aria-label="Back to games">
          ←
        </button>
        <span className="ws-label" style={{ flex: 1 }}>
          {title}
        </span>
        <span className="ws-muted">
          Best {best} {scoreLabel}
        </span>
      </div>
      <div ref={root} className="game__stage">
        {phase === "intro" && (
          <div className="challenge__results">
            <h2 className="ws-heading">{title}</h2>
            <p className="ws-muted" style={{ margin: 0, maxWidth: 420 }}>
              {blurb}
            </p>
            <button type="button" className="ws-pill ws-pill--primary" onClick={start} autoFocus>
              Start
            </button>
          </div>
        )}
        {phase === "play" && children(finish, runKey)}
        {phase === "done" && result && (
          <div className="challenge__results">
            <span className="game__score">{result.score}</span>
            <span className="ws-muted">{scoreLabel}</span>
            <h2 className="ws-heading">{isBest && result.score > 0 ? "New personal best!" : "Nicely played."}</h2>
            <span className="ws-muted">{result.summary}</span>
            <div className="ws-pills">
              <button type="button" className="ws-pill ws-pill--primary" onClick={start}>
                Play again
              </button>
              <button type="button" className="ws-pill" onClick={onExit}>
                All games
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

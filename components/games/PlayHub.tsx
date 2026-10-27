"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { Star } from "@/components/ChallengeSheet";
import { GameShell } from "@/components/games/GameShell";
import { Lightning } from "@/components/games/Lightning";
import { MemoryMatch, buildDeck } from "@/components/games/MemoryMatch";
import { RoundsRun } from "@/components/games/RoundsRun";
import { Reveal } from "@/components/motion/Reveal";
import { bankRoundsForRange, bookOrderRound, timelineRound, triviaRun } from "@/lib/bank";
import { BOOKS, getBook } from "@/lib/canon";
import { originOf } from "@/lib/celebrations";
import { seededRandom, type Question } from "@/lib/challenge";
import { dayKey } from "@/lib/day";
import { MAX_STARS, checkpointRange } from "@/lib/game";
import { recordCheckpoint, useStudy, type GameMode } from "@/lib/study-store";

type Screen = GameMode | "daily" | "hub";

interface ModeInfo {
  mode: GameMode;
  title: string;
  blurb: string;
  unit: string;
}

const MODES: ModeInfo[] = [
  { mode: "trivia", title: "Trivia", blurb: "Eight questions on people, places, events — and who said it.", unit: "right" },
  { mode: "match", title: "Memory match", blurb: "Flip cards to pair people with their stories (and your memory verses).", unit: "points" },
  { mode: "order", title: "Order up", blurb: "Put books of the Bible and great events in the right order.", unit: "right" },
  { mode: "lightning", title: "Lightning round", blurb: "60 seconds of rapid-fire true/false. Right +1, wrong −1 — no guessing!", unit: "points" },
];

/** Book-order round built around a given book (its neighbours in the canon). */
function neighbourOrder(bookId: string, rand: () => number): Question {
  const index = BOOKS.findIndex((book) => book.id === bookId);
  const start = Math.max(0, Math.min(BOOKS.length - 4, index - 1));
  return bookOrderRound(rand, BOOKS.slice(start, start + 4).map((book) => book.id));
}

function Checkpoint({ bookId, at, onExit }: { bookId: string; at: number; onExit: () => void }): ReactNode {
  const { checkpoints } = useStudy();
  const key = `${bookId}:${at}`;
  const [attempt, setAttempt] = useState(0);
  const [stars, setStars] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const { from, to } = checkpointRange(at);
  const rounds = useMemo(() => {
    const rand = seededRandom(`checkpoint:${key}:${attempt}`);
    // Only ask about this book, up to this checkpoint — chapters the trail has already walked.
    const own = bankRoundsForRange(bookId, from, to, rand).slice(0, 4);
    const earlier = from > 1 ? bankRoundsForRange(bookId, 1, from - 1, rand) : [];
    const list: Question[] = [...own, ...earlier].slice(0, 5);
    return [...list, neighbourOrder(bookId, rand)];
  }, [attempt, bookId, from, key, to]);
  const book = getBook(bookId);

  return (
    <div className="game" ref={root}>
      <div className="lesson__top">
        <button type="button" className="ws-pill ws-pill--sm" onClick={onExit} aria-label="Back">
          ←
        </button>
        <span className="ws-label" style={{ flex: 1 }}>
          Checkpoint · {book?.name} {from}–{to}
        </span>
        <span className="lesson__best">
          {Array.from({ length: MAX_STARS }, (_, i) => (
            <Star key={i} filled={i < (checkpoints[key] ?? 0)} size={16} />
          ))}
        </span>
      </div>
      <div className="game__stage">
        {stars === null ? (
          <RoundsRun
            key={attempt}
            rounds={rounds}
            onFinish={(result) => setStars(recordCheckpoint(key, result.correct, rounds.length, originOf(root.current)))}
          />
        ) : (
          <div className="challenge__results">
            <div className="challenge__stars">
              {Array.from({ length: MAX_STARS }, (_, i) => (
                <Star key={i} filled={i < stars} size={52} />
              ))}
            </div>
            <h2 className="ws-heading">Checkpoint cleared</h2>
            <div className="ws-pills">
              <Link href={`/map?book=${bookId}`} className="ws-pill ws-pill--primary">
                Back to the trail →
              </Link>
              {stars < MAX_STARS && (
                <button
                  type="button"
                  className="ws-pill"
                  onClick={() => {
                    setAttempt((value) => value + 1);
                    setStars(null);
                  }}
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PlayHub({ checkpoint }: { checkpoint: { bookId: string; at: number } | null }): ReactNode {
  const { games, memory } = useStudy();
  const [screen, setScreen] = useState<Screen>("hub");
  const [inCheckpoint, setInCheckpoint] = useState(checkpoint !== null);
  const memoryCards = useMemo(() => Object.values(memory).map((card) => ({ reference: card.reference, text: card.text })), [memory]);
  const exit = (): void => setScreen("hub");

  if (inCheckpoint && checkpoint) {
    return <Checkpoint bookId={checkpoint.bookId} at={checkpoint.at} onExit={() => setInCheckpoint(false)} />;
  }

  // Seeds vary by play count, so every run is fresh without randomness during render.
  const seedFor = (mode: string, runKey: number): string => `${mode}:${games[mode]?.plays ?? 0}:${runKey}`;

  if (screen === "trivia" || screen === "daily") {
    const daily = screen === "daily";
    return (
      <GameShell
        mode="trivia"
        title={daily ? "Daily mix" : "Trivia"}
        blurb={daily ? "Today's eight questions — a fresh mix each day." : MODES[0].blurb}
        scoreLabel="right"
        onExit={exit}
      >
        {(finish, runKey) => (
          <RoundsRun key={runKey} rounds={triviaRun(seededRandom(daily ? `daily:${dayKey()}` : seedFor("trivia", runKey)), 8)} onFinish={finish} />
        )}
      </GameShell>
    );
  }
  if (screen === "match") {
    return (
      <GameShell mode="match" title="Memory match" blurb={MODES[1].blurb} scoreLabel="points" onExit={exit}>
        {(finish, runKey) => <MemoryMatch key={runKey} deck={buildDeck(seededRandom(seedFor("match", runKey)), memoryCards)} onFinish={finish} />}
      </GameShell>
    );
  }
  if (screen === "order") {
    return (
      <GameShell mode="order" title="Order up" blurb={MODES[2].blurb} scoreLabel="right" onExit={exit}>
        {(finish, runKey) => {
          const rand = seededRandom(seedFor("order", runKey));
          return <RoundsRun key={runKey} rounds={[bookOrderRound(rand), timelineRound(rand), bookOrderRound(rand), timelineRound(rand)]} onFinish={finish} />;
        }}
      </GameShell>
    );
  }
  if (screen === "lightning") {
    return (
      <GameShell mode="lightning" title="Lightning round" blurb={MODES[3].blurb} scoreLabel="right" onExit={exit}>
        {(finish, runKey) => <Lightning key={runKey} rand={seededRandom(seedFor("lightning", runKey))} onFinish={finish} />}
      </GameShell>
    );
  }

  return (
    <Reveal className="ws-stack" style={{ paddingBlock: 0, gap: 30 }}>
      <div className="ws-pills">
        <button type="button" className="ws-pill ws-pill--primary" onClick={() => setScreen("daily")}>
          ☀ Play today&apos;s daily mix
        </button>
      </div>
      <div className="play-grid">
        {MODES.map((info) => (
          <button key={info.mode} type="button" className="play-card" onClick={() => setScreen(info.mode)}>
            <span className="tile__big">{info.title}</span>
            <span className="ws-muted">{info.blurb}</span>
            <span className="play-card__meta">
              {games[info.mode] ? `Best ${games[info.mode].best} ${info.unit} · ${games[info.mode].plays} plays` : "Not played yet"}
            </span>
          </button>
        ))}
      </div>
    </Reveal>
  );
}

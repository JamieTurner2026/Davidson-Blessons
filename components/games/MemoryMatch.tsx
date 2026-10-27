"use client";

import { useRef, useState, type ReactNode } from "react";

import type { RunResult } from "@/components/games/GameShell";
import { MOTION_OK, gsap } from "@/components/motion/gsap";
import { PAIRS } from "@/data/trivia";
import { shuffle } from "@/lib/challenge";
import { play } from "@/lib/sound";

export interface MatchCard {
  id: number;
  pair: number;
  text: string;
}

const PAIR_COUNT = 6;

/** Builds a shuffled 12-card deck: curated pairs, plus your memory verses when you have them. */
export function buildDeck(rand: () => number, memory: Array<{ reference: string; text: string }>): MatchCard[] {
  const fromMemory = shuffle(memory, rand)
    .slice(0, 2)
    .map((card) => ({ left: card.reference, right: card.text.split(" ").slice(0, 5).join(" ") + "…" }));
  const curated = shuffle([...PAIRS], rand).slice(0, PAIR_COUNT - fromMemory.length);
  const pairs = [...fromMemory, ...curated.map((item) => ({ left: item.left, right: item.right }))];
  const cards = pairs.flatMap((pair, index) => [
    { pair: index, text: pair.left },
    { pair: index, text: pair.right },
  ]);
  return shuffle(cards, rand).map((card, id) => ({ ...card, id }));
}

/** Classic flip-two memory game. Score rewards fewer flips; there's no fail state. */
export function MemoryMatch({ deck, onFinish }: { deck: MatchCard[]; onFinish: (result: RunResult) => void }): ReactNode {
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const celebrate = (ids: number[]): void => {
    if (!window.matchMedia(MOTION_OK).matches) return;
    ids.forEach((id) => {
      const el = root.current?.querySelector(`[data-card="${id}"]`);
      if (el) gsap.fromTo(el, { scale: 1.1 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
    });
  };

  const flip = (card: MatchCard): void => {
    if (locked || open.includes(card.id) || matched.includes(card.id)) return;
    const next = [...open, card.id];
    setOpen(next);
    if (next.length < 2) return;
    const totalMoves = moves + 1;
    setMoves(totalMoves);
    const [first, second] = next.map((id) => deck.find((item) => item.id === id));
    if (first && second && first.pair === second.pair) {
      play("tick");
      const nowMatched = [...matched, first.id, second.id];
      setMatched(nowMatched);
      setOpen([]);
      requestAnimationFrame(() => celebrate([first.id, second.id]));
      if (nowMatched.length === deck.length) {
        const pairs = deck.length / 2;
        const score = Math.max(10, 100 - (totalMoves - pairs) * 8);
        // XP follows skill: a clean board earns all pairs, lots of misses earns 1.
        const earned = Math.max(1, Math.round((pairs * score) / 100));
        window.setTimeout(() => onFinish({ correct: earned, score, summary: `All ${pairs} pairs in ${totalMoves} flips` }), 700);
      }
    } else {
      play("thud");
      setLocked(true);
      window.setTimeout(() => {
        setOpen([]);
        setLocked(false);
      }, 900);
    }
  };

  return (
    <div ref={root} className="lesson__round">
      <div className="ws-row">
        <span className="ws-muted">Find the matching pairs</span>
        <span className="ws-muted">{moves} flips</span>
      </div>
      <div className="flip-grid">
        {deck.map((card) => {
          const faceUp = open.includes(card.id) || matched.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              data-card={card.id}
              className={`flip ${faceUp ? "is-up" : ""} ${matched.includes(card.id) ? "is-matched" : ""}`}
              onClick={() => flip(card)}
              aria-label={faceUp ? card.text : "Hidden card"}
            >
              <span className="flip__inner">
                <span className="flip__back" aria-hidden="true">
                  ✦
                </span>
                <span className="flip__front">{card.text}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

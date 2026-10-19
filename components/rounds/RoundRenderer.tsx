"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";

import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import type { ChoiceRound, MatchRound, OrderRound, Question } from "@/lib/challenge";
import { play } from "@/lib/sound";

// One renderer for every round type, used by lessons, challenges, checkpoints and games.
// Wrong answers never block: they show the right answer and move on.

function useFeedback(): { root: RefObject<HTMLDivElement | null>; pop: (el: Element | null) => void; shake: (el: Element | null) => void } {
  const root = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: root });
  const motionOk = (): boolean => window.matchMedia(MOTION_OK).matches;
  return {
    root,
    pop: contextSafe((el: Element | null) => {
      play("tick");
      if (el && motionOk()) gsap.fromTo(el, { scale: 1.08 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
    }),
    shake: contextSafe((el: Element | null) => {
      play("thud");
      if (el && motionOk()) gsap.fromTo(el, { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1.2, 0.25)" });
    }),
  };
}

function Choice({ round, onDone, fast }: { round: ChoiceRound; onDone: (correct: boolean) => void; fast: boolean }): ReactNode {
  const { root, pop, shake } = useFeedback();
  const [picked, setPicked] = useState<number | null>(null);

  const choose = (index: number, button: HTMLButtonElement): void => {
    if (picked !== null) return;
    setPicked(index);
    const correct = index === round.answer;
    if (correct) pop(button);
    else shake(button);
    window.setTimeout(() => onDone(correct), fast ? 450 : correct ? 750 : 1500);
  };

  return (
    <div ref={root} className="challenge__question">
      <p className={round.kind === "trivia" ? "challenge__clue challenge__clue--question" : "challenge__clue"}>
        {round.kind === "trivia" ? round.clue : `“${round.clue}”`}
      </p>
      <div className="challenge__options">
        {round.options.map((option, index) => {
          const state = picked === null ? "" : index === round.answer ? "is-active" : index === picked ? "is-wrong" : "";
          return (
            <button
              key={index}
              type="button"
              className={`ws-pill challenge__option ${state}`}
              disabled={picked !== null && index !== picked && index !== round.answer}
              onClick={(event) => choose(index, event.currentTarget)}
            >
              {option}
            </button>
          );
        })}
      </div>
      {picked !== null && round.reference && <span className="ws-muted">{round.reference}</span>}
    </div>
  );
}

function Order({ round, onDone }: { round: OrderRound; onDone: (correct: boolean) => void }): ReactNode {
  const { root, pop, shake } = useFeedback();
  const [placed, setPlaced] = useState(0);
  const [slipped, setSlipped] = useState(false);

  const tap = (index: number, button: HTMLButtonElement): void => {
    if (index === placed) {
      const next = placed + 1;
      setPlaced(next);
      requestAnimationFrame(() => pop(root.current?.querySelector(`[data-placed="${index}"]`) ?? null));
      if (next === round.items.length) window.setTimeout(() => onDone(!slipped), 650);
    } else {
      setSlipped(true);
      shake(button);
    }
  };

  return (
    <div ref={root} className="challenge__question">
      <ol className="challenge__ordered">
        {round.items.slice(0, placed).map((item, index) => (
          <li key={index} data-placed={index}>
            {item}
          </li>
        ))}
      </ol>
      <div className="challenge__options">
        {round.shuffled
          .filter((index) => index >= placed)
          .map((index) => (
            <button key={index} type="button" className="ws-pill challenge__option" onClick={(event) => tap(index, event.currentTarget)}>
              {round.items[index]}
            </button>
          ))}
      </div>
    </div>
  );
}

function Match({ round, onDone }: { round: MatchRound; onDone: (correct: boolean) => void }): ReactNode {
  const { root, pop, shake } = useFeedback();
  const [left, setLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [slips, setSlips] = useState(0);

  const tapRight = (pairIndex: number, button: HTMLButtonElement): void => {
    if (left === null || matched.includes(pairIndex)) return;
    if (pairIndex === left) {
      const next = [...matched, pairIndex];
      setMatched(next);
      setLeft(null);
      pop(button);
      if (next.length === round.pairs.length) window.setTimeout(() => onDone(slips === 0), 650);
    } else {
      setSlips((value) => value + 1);
      shake(button);
    }
  };

  return (
    <div ref={root} className="challenge__question">
      <span className="ws-muted">Tap one on the left, then its match on the right.</span>
      <div className="match">
        <div className="match__col">
          {round.pairs.map((pair, index) => (
            <button
              key={index}
              type="button"
              className={`ws-pill challenge__option ${matched.includes(index) ? "is-active" : ""}`}
              aria-pressed={left === index}
              disabled={matched.includes(index)}
              onClick={() => setLeft(index)}
            >
              {pair.left}
            </button>
          ))}
        </div>
        <div className="match__col">
          {round.shuffled.map((index) => (
            <button
              key={index}
              type="button"
              className={`ws-pill challenge__option ${matched.includes(index) ? "is-active" : ""}`}
              disabled={matched.includes(index)}
              onClick={(event) => tapRight(index, event.currentTarget)}
            >
              {round.pairs[index].right}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Renders any round; calls `onDone(correct)` once when it's finished. */
export function RoundRenderer({ round, onDone, fast = false }: { round: Question; onDone: (correct: boolean) => void; fast?: boolean }): ReactNode {
  if (round.kind === "order") return <Order round={round} onDone={onDone} />;
  if (round.kind === "match") return <Match round={round} onDone={onDone} />;
  return <Choice round={round} onDone={onDone} fast={fast} />;
}

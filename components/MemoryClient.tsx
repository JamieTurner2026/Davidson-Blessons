"use client";

import { useState, type ReactNode } from "react";

import { MemoryPractice } from "@/components/MemoryPractice";
import { Reveal } from "@/components/motion/Reveal";
import { MASTERED_BOX } from "@/lib/game";
import { forgetMemory, useGame } from "@/lib/study-store";

function Boxes({ box }: { box: number }): ReactNode {
  return (
    <span className="memory-boxes" aria-label={box >= MASTERED_BOX ? "Mastered" : `Stage ${box} of ${MASTERED_BOX - 1}`}>
      {Array.from({ length: MASTERED_BOX - 1 }, (_, index) => (
        <span key={index} className={index < box ? "is-on" : undefined} />
      ))}
    </span>
  );
}

export function MemoryClient(): ReactNode {
  const { state, today } = useGame();
  const cards = Object.entries(state.memory);
  // Mastered verses come back every few weeks for a light refresh.
  const due = cards.filter(([, card]) => card.due <= today);
  // The id being practised stays fixed until "Continue", even though the store updates under it.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const queue = due.filter(([id]) => !done.includes(id));
  const activeId = sessionId ?? null;
  const activeCard = activeId ? state.memory[activeId] : undefined;

  const start = (): void => setSessionId(queue[0]?.[0] ?? null);
  const next = (): void => {
    const finished = sessionId ? [...done, sessionId] : done;
    setDone(finished);
    setSessionId(due.find(([id]) => !finished.includes(id))?.[0] ?? null);
  };

  if (cards.length === 0) {
    return (
      <p className="ws-muted" style={{ textAlign: "center" }}>
        Nothing to memorize yet. While reading, tap a verse (or up to three) and choose <strong>Memorize</strong>.
      </p>
    );
  }

  return (
    <div className="reader ws-stack" style={{ paddingBlock: 0, gap: 30 }}>
      {activeId && activeCard ? (
        <MemoryPractice key={activeId} id={activeId} card={activeCard} onNext={next} />
      ) : (
        <div className="memory-card" style={{ alignItems: "center", textAlign: "center" }}>
          <span className="tile__big">{queue.length === 0 ? "All caught up" : `${queue.length} to review today`}</span>
          <span className="ws-muted">
            {queue.length === 0 ? "Spaced review brings each verse back right before you'd forget it." : "A few minutes is all it takes."}
          </span>
          {queue.length > 0 && (
            <button type="button" className="ws-pill ws-pill--primary" onClick={start}>
              Start practice
            </button>
          )}
        </div>
      )}

      <Reveal>
        <ul className="ws-list">
          {cards.map(([id, card]) => (
            <li key={id}>
              <div className="ws-row">
                <span className="ws-label">
                  {card.reference} <span className="ws-muted">· {card.translation.toUpperCase()}</span>
                </span>
                <Boxes box={card.box} />
              </div>
              <span>{card.text}</span>
              <div className="ws-row">
                <span className="ws-muted">
                  {card.box >= MASTERED_BOX ? "Mastered" : card.due <= today ? "Due today" : `Next review ${card.due}`}
                </span>
                <button type="button" className="ws-pill ws-pill--sm" onClick={() => forgetMemory(id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}

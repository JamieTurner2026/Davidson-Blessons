"use client";

import { useMemo, useRef, useState, type ReactNode, type RefObject } from "react";

import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { originOf } from "@/lib/celebrations";
import { BOX_INTERVALS, MASTERED_BOX, modeForBox, type PracticeMode } from "@/lib/game";
import { recordPractice, type MemoryCard } from "@/lib/study-store";

// ── Helpers ───────────────────────────────────────────────────────

function normalise(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "").replace(/'/g, "");
}

/** Small deterministic PRNG so shuffles are stable across renders (no Math.random in render). */
function seeded(seedText: string): () => number {
  let seed = 0;
  for (const char of seedText) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Long verses scramble in short phrases so it's a puzzle, not a chore. */
function chunk(words: string[]): string[] {
  const size = words.length > 30 ? 4 : words.length > 16 ? 3 : 1;
  const out: string[] = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size).join(" "));
  return out;
}

const MODE_LABEL: Record<PracticeMode, string> = {
  scramble: "Put the words in order",
  blanks: "Fill in the missing words",
  "first-letter": "Type the first letter of each word",
};

interface GameProps {
  words: string[];
  seed: string;
  onDone: (correct: boolean) => void;
}

function useFeedback(scope: RefObject<HTMLDivElement | null>): { pop: (el: Element | null) => void; shake: (el: Element | null) => void } {
  const { contextSafe } = useGSAP({ scope });
  const motionOk = (): boolean => window.matchMedia(MOTION_OK).matches;
  return {
    pop: contextSafe((el: Element | null) => {
      if (el && motionOk()) gsap.fromTo(el, { scale: 1.3 }, { scale: 1, duration: 0.45, ease: "back.out(3)" });
    }),
    shake: contextSafe((el: Element | null) => {
      if (el && motionOk()) gsap.fromTo(el, { x: -7 }, { x: 0, duration: 0.5, ease: "elastic.out(1.2, 0.25)" });
    }),
  };
}

// ── Scramble ──────────────────────────────────────────────────────

function Scramble({ words, seed, onDone }: GameProps): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const { pop, shake } = useFeedback(root);
  const pieces = useMemo(() => chunk(words), [words]);
  const bank = useMemo(() => shuffle(pieces.map((text, index) => ({ text, index })), seeded(seed)), [pieces, seed]);
  const [placed, setPlaced] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  const tap = (piece: { text: string; index: number }, button: HTMLButtonElement): void => {
    if (piece.index === placed) {
      const next = placed + 1;
      setPlaced(next);
      requestAnimationFrame(() => pop(root.current?.querySelector(`[data-placed="${piece.index}"]`) ?? null));
      if (next === pieces.length) onDone(mistakes <= 2);
    } else {
      setMistakes((value) => value + 1);
      shake(button);
    }
  };

  return (
    <div ref={root} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="word-line">
        {pieces.slice(0, placed).map((text, index) => (
          <span key={index} className="placed" data-placed={index}>
            {text}
          </span>
        ))}
      </div>
      <div className="word-bank">
        {bank
          .filter((piece) => piece.index >= placed)
          .map((piece) => (
            <button key={piece.index} type="button" className="ws-pill" onClick={(event) => tap(piece, event.currentTarget)}>
              {piece.text}
            </button>
          ))}
      </div>
      <span className="ws-muted" style={{ textAlign: "center" }}>
        {mistakes === 0 ? "Tap the next word." : `${mistakes} slip${mistakes === 1 ? "" : "s"} — no worries.`}
      </span>
    </div>
  );
}

// ── Fill in the blanks ────────────────────────────────────────────

function Blanks({ words, seed, onDone }: GameProps): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const { pop, shake } = useFeedback(root);
  const blanks = useMemo(() => {
    const random = seeded(seed);
    const candidates = words.map((word, index) => ({ word, index })).filter(({ word }) => normalise(word).length > 2);
    const count = Math.max(1, Math.round(candidates.length / 3));
    return new Set(shuffle(candidates, random).slice(0, count).map(({ index }) => index));
  }, [words, seed]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);

  const check = (): void => {
    let right = 0;
    root.current?.querySelectorAll<HTMLInputElement>(".blank-input").forEach((input) => {
      const index = Number(input.dataset.index);
      const ok = normalise(answers[index] ?? "") === normalise(words[index]);
      if (ok) {
        right += 1;
        pop(input);
      } else shake(input);
    });
    setChecked(true);
    onDone(right / blanks.size >= 0.8);
  };

  return (
    <div ref={root} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p className="recall" style={{ margin: 0 }}>
        {words.map((word, index) =>
          blanks.has(index) ? (
            <span key={index}>
              <input
                className={checked && normalise(answers[index] ?? "") === normalise(word) ? "blank-input is-right" : "blank-input"}
                data-index={index}
                aria-label={`Missing word ${index + 1}`}
                value={checked && normalise(answers[index] ?? "") !== normalise(word) ? word : (answers[index] ?? "")}
                readOnly={checked}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                style={{ width: `${Math.max(4, word.length + 1)}ch` }}
                onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !checked) check();
                }}
              />{" "}
            </span>
          ) : (
            <span key={index}>{word} </span>
          ),
        )}
      </p>
      {!checked && (
        <div className="ws-pills">
          <button type="button" className="ws-pill ws-pill--primary" onClick={check}>
            Check
          </button>
        </div>
      )}
    </div>
  );
}

// ── First letter ──────────────────────────────────────────────────

function FirstLetter({ words, onDone }: GameProps): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const { pop, shake } = useFeedback(root);
  const [revealed, setRevealed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const allowed = Math.max(2, Math.round(words.length * 0.1));

  // Handles every character in the event, so paste / mobile autocorrect bursts work too.
  const typeLetters = (input: string): void => {
    let position = revealed;
    let slips = mistakes;
    for (const letter of input.replace(/\s+/g, "")) {
      if (position >= words.length) break;
      const expected = normalise(words[position])[0] ?? "";
      if (letter.toLowerCase() === expected) position += 1;
      else slips += 1;
    }
    const word = (index: number): Element | null => root.current?.querySelector(`[data-word="${index}"]`) ?? null;
    if (position > revealed) requestAnimationFrame(() => pop(word(position - 1)));
    if (slips > mistakes) shake(word(position));
    setRevealed(position);
    setMistakes(slips);
    if (position === words.length && revealed < words.length) onDone(slips <= allowed);
  };

  return (
    <div ref={root} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p className="recall" style={{ margin: 0 }}>
        {words.map((word, index) => (
          <span key={index} data-word={index} style={{ display: "inline-block", marginRight: "0.3em" }} className={index < revealed ? "" : "hidden-word"}>
            {word}
          </span>
        ))}
      </p>
      {revealed < words.length && (
        <input
          className="ws-input"
          aria-label="Type the first letter of the next word"
          placeholder="Type first letters…"
          value=""
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(event) => typeLetters(event.target.value)}
        />
      )}
      <span className="ws-muted" style={{ textAlign: "center" }}>
        {revealed}/{words.length} words · {mistakes} slip{mistakes === 1 ? "" : "s"}
      </span>
    </div>
  );
}

// ── Session wrapper ───────────────────────────────────────────────

export function MemoryPractice({ id, card: liveCard, onNext }: { id: string; card: MemoryCard; onNext: () => void }): ReactNode {
  // Freeze the card for this session — recording the result moves it to a new box.
  const [card] = useState(liveCard);
  const words = useMemo(() => card.text.split(/\s+/).filter(Boolean), [card.text]);
  const mode = modeForBox(card.box);
  const [result, setResult] = useState<boolean | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const finish = (correct: boolean): void => {
    setResult(correct);
    recordPractice(id, correct, originOf(resultRef.current));
  };

  const nextBox = Math.min(MASTERED_BOX, card.box + 1);
  const waitDays = nextBox >= MASTERED_BOX ? null : BOX_INTERVALS[nextBox];

  return (
    <div className="memory-card">
      <div className="ws-row">
        <span className="ws-label">{card.reference}</span>
        <span className="ws-muted">{MODE_LABEL[mode]}</span>
      </div>
      {mode === "scramble" && <Scramble words={words} seed={`${id}:${card.box}`} onDone={finish} />}
      {mode === "blanks" && <Blanks words={words} seed={`${id}:${card.box}`} onDone={finish} />}
      {mode === "first-letter" && <FirstLetter words={words} seed={id} onDone={finish} />}
      <div ref={resultRef} aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        {result === true && (
          <span>{waitDays === null ? "Mastered — it's hidden in your heart." : `Well done. Next review in ${waitDays} day${waitDays === 1 ? "" : "s"}.`}</span>
        )}
        {result === false && <span>Close! We&apos;ll practise this one again soon.</span>}
        {result !== null && (
          <button type="button" className="ws-pill ws-pill--primary" onClick={onNext}>
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

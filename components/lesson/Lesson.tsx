"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { Star } from "@/components/ChallengeSheet";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { RoundRenderer } from "@/components/rounds/RoundRenderer";
import { bankRoundsForChapter } from "@/lib/bank";
import { originOf } from "@/lib/celebrations";
import { generateRounds, segmentVerses, seededRandom, words, type ChapterVerse, type Question } from "@/lib/challenge";
import { MAX_STARS } from "@/lib/game";
import { markChapterRead, recordChallenge, useStudy } from "@/lib/study-store";

type Card = { type: "passage"; verses: ChapterVerse[]; part: number; parts: number } | { type: "round"; round: Question };

const MIN_ROUNDS = 3;
const MAX_BANK_ROUNDS = 2;
/** A fast-but-real reading pace for the "I've read it" gate, clamped to a few seconds. */
const GATE_WORDS_PER_SECOND = 400 / 60;
const GATE_MIN_SECONDS = 4;
const GATE_MAX_SECONDS = 20;

// Different questions on every page load, without Math.random() during render (which
// would break hydration): the server always sees 0, the browser its own load nonce.
const LOAD_NONCE = typeof window === "undefined" ? 0 : Math.floor(Math.random() * 1_000_000);
const noopSubscribe = (): (() => void) => () => undefined;
function useLoadNonce(): number {
  return useSyncExternalStore(noopSubscribe, () => LOAD_NONCE, () => 0);
}

/** Builds the lesson: passage cards, each followed by rounds about what was just read. */
function buildLesson(chapterId: string, verses: ChapterVerse[], attempt: number, translation: string): Card[] {
  const segments = segmentVerses(verses);
  const cards: Card[] = [];
  let roundCount = 0;
  segments.forEach((segment, index) => {
    cards.push({ type: "passage", verses: segment, part: index + 1, parts: segments.length });
    const rounds = generateRounds(`${chapterId}#L${index}#${attempt}`, segment, segment.length >= 5 ? 2 : 1);
    rounds.forEach((round) => cards.push({ type: "round", round }));
    roundCount += rounds.length;
  });
  const rand = seededRandom(`${chapterId}#bank#${attempt}`);
  const bank = bankRoundsForChapter(chapterId, rand, translation).slice(0, MAX_BANK_ROUNDS);
  bank.forEach((round) => cards.push({ type: "round", round }));
  roundCount += bank.length;
  if (roundCount < MIN_ROUNDS) {
    generateRounds(`${chapterId}#extra#${attempt}`, verses, MIN_ROUNDS - roundCount).forEach((round) => cards.push({ type: "round", round }));
  }
  return cards;
}

function gateSeconds(verses: ChapterVerse[]): number {
  const count = verses.reduce((sum, verse) => sum + words(verse.text).length, 0);
  return Math.min(GATE_MAX_SECONDS, Math.max(GATE_MIN_SECONDS, Math.round(count / GATE_WORDS_PER_SECOND)));
}

function Passage({ card, label, gated, onNext }: { card: Extract<Card, { type: "passage" }>; label: string; gated: boolean; onNext: () => void }): ReactNode {
  // Short pause before "I've read it" so a stop can't be clicked through unread.
  const [ready, setReady] = useState(!gated);
  useEffect(() => {
    if (!gated) return;
    const timer = window.setTimeout(() => setReady(true), gateSeconds(card.verses) * 1000);
    return () => window.clearTimeout(timer);
  }, [gated, card.verses]);
  const first = card.verses[0]?.number;
  const last = card.verses.at(-1)?.number;
  return (
    <div className="lesson__passage">
      <span className="ws-muted">
        Read · {label}:{first}
        {last !== first ? `–${last}` : ""} {card.parts > 1 ? `· part ${card.part} of ${card.parts}` : ""}
      </span>
      <div className="scripture lesson__text">
        {card.verses.map((verse) => (
          <span key={verse.number}>
            <sup className="verse__num">{verse.number}</sup>
            {verse.text}{" "}
          </span>
        ))}
      </div>
      <div className="ws-pills">
        <button type="button" className="ws-pill ws-pill--primary" onClick={onNext} disabled={!ready} autoFocus>
          {ready ? <>I&apos;ve read it — play →</> : "Take it in…"}
        </button>
      </div>
    </div>
  );
}

function Results({
  stars,
  correct,
  total,
  chapterId,
  bookId,
  readHref,
  onReplay,
}: {
  stars: number;
  correct: number;
  total: number;
  chapterId: string;
  bookId: string;
  readHref: string;
  onReplay: () => void;
}): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(".challenge__stars .star", { scale: 0, rotation: -40, duration: 0.6, ease: "back.out(3)", stagger: 0.22, delay: 0.2 });
        gsap.from(".lesson__results-text > *", { y: 12, autoAlpha: 0, stagger: 0.08, duration: 0.4, delay: 0.7 });
      });
    },
    { scope: root },
  );
  const message = stars === MAX_STARS ? "A perfect stop!" : stars === 2 ? "Well walked." : "Every step counts.";
  return (
    <div ref={root} className="challenge__results">
      <div className="challenge__stars" aria-label={`${stars} of ${MAX_STARS} stars`}>
        {Array.from({ length: MAX_STARS }, (_, index) => (
          <Star key={index} filled={index < stars} size={58} />
        ))}
      </div>
      <div className="lesson__results-text challenge__results">
        <h2 className="ws-heading">{message}</h2>
        <span className="ws-muted">
          {correct} of {total} right · stars earn oil for the Workshop
        </span>
        <div className="ws-pills">
          <Link href={`/map?book=${bookId}&from=${chapterId}`} className="ws-pill ws-pill--primary">
            Walk on →
          </Link>
          {stars < MAX_STARS && (
            <button type="button" className="ws-pill" onClick={onReplay}>
              Play again
            </button>
          )}
          <Link href={readHref} className="ws-pill">
            Read the full chapter
          </Link>
        </div>
      </div>
    </div>
  );
}

interface Props {
  chapterId: string;
  bookId: string;
  label: string;
  translation: string;
  verses: ChapterVerse[];
}

/** A trail stop as a short lesson: read a few verses, play, repeat — then stars. */
export function Lesson({ chapterId, bookId, label, translation, verses }: Props): ReactNode {
  const { stars: bestStars } = useStudy();
  const [attempt, setAttempt] = useState(0);
  const nonce = useLoadNonce();
  const cards = useMemo(() => buildLesson(chapterId, verses, nonce + attempt, translation), [chapterId, verses, nonce, attempt, translation]);
  const total = cards.filter((card) => card.type === "round").length;
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  // Slide each new card in.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(stage.current, { x: 40, autoAlpha: 0, duration: 0.45, ease: "power3.out" });
      });
    },
    { dependencies: [index, result, attempt], revertOnUpdate: true },
  );

  const finish = (finalCorrect: number): void => {
    markChapterRead(chapterId);
    setResult(recordChallenge(chapterId, finalCorrect, total, originOf(stage.current)));
  };

  const advance = (wasCorrect: boolean | null): void => {
    const nextCorrect = correct + (wasCorrect ? 1 : 0);
    setCorrect(nextCorrect);
    if (index + 1 < cards.length) setIndex(index + 1);
    else finish(nextCorrect);
  };

  const replay = (): void => {
    setAttempt((value) => value + 1);
    setIndex(0);
    setCorrect(0);
    setResult(null);
  };

  const card = cards[index];
  const progress = result !== null ? 1 : index / cards.length;

  return (
    <div className="lesson">
      <div className="lesson__top">
        <Link href={`/map?book=${bookId}`} className="ws-pill ws-pill--sm" aria-label="Leave lesson">
          ✕
        </Link>
        <div className="lesson__progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
        <span className="lesson__best" aria-label={`Best ${bestStars[chapterId] ?? 0} stars`}>
          {Array.from({ length: MAX_STARS }, (_, i) => (
            <Star key={i} filled={i < (bestStars[chapterId] ?? 0)} size={16} />
          ))}
        </span>
      </div>

      <div ref={stage} className="lesson__stage">
        {result !== null ? (
          <Results
            stars={result}
            correct={correct}
            total={total}
            chapterId={chapterId}
            bookId={bookId}
            readHref={`/read/${translation}/${chapterId}`}
            onReplay={replay}
          />
        ) : card?.type === "passage" ? (
          <Passage key={`${attempt}-${index}`} card={card} label={label} gated={attempt === 0} onNext={() => advance(null)} />
        ) : card?.type === "round" ? (
          <div className="lesson__round">
            <span className="ws-label">{card.round.prompt}</span>
            <RoundRenderer key={`${attempt}-${index}`} round={card.round} onDone={advance} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { originOf } from "@/lib/celebrations";
import { RoundRenderer } from "@/components/rounds/RoundRenderer";
import { generateChallenge, type ChapterVerse } from "@/lib/challenge";
import { MAX_STARS, starsFor } from "@/lib/game";
import { recordChallenge, useStudy } from "@/lib/study-store";

interface Props {
  chapterId: string;
  label: string;
  verses: ChapterVerse[];
  onClose: () => void;
}

export function Star({ filled, size = 34 }: { filled: boolean; size?: number }): ReactNode {
  return (
    <svg className="star" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M10 1.5l2.5 5.6 6.1.6-4.6 4.1 1.4 6-5.4-3.2-5.4 3.2 1.4-6L1.4 7.7l6.1-.6z"
        fill={filled ? "var(--ws-accent)" : "var(--ws-bg)"}
        stroke="var(--ws-fg)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Results({ stars, best, onRetry, chapterId }: { stars: number; best: number; onRetry: () => void; chapterId: string }): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(".challenge__stars .star", { scale: 0, rotation: -40, duration: 0.6, ease: "back.out(3)", stagger: 0.22, delay: 0.15 });
      });
    },
    { scope: root },
  );
  const message = stars === MAX_STARS ? "A perfect stop." : stars === 2 ? "Well walked." : "Every step counts.";
  return (
    <div ref={root} className="challenge__results">
      <div className="challenge__stars" aria-label={`${stars} of ${MAX_STARS} stars`}>
        {Array.from({ length: MAX_STARS }, (_, index) => (
          <Star key={index} filled={index < stars} size={52} />
        ))}
      </div>
      <h2 className="ws-heading">{message}</h2>
      <span className="ws-muted">{best > stars ? `Your best here is ${best} stars.` : "Stars earn oil for the Workshop."}</span>
      <div className="ws-pills">
        <Link href={`/map?from=${chapterId}`} className="ws-pill ws-pill--primary">
          Walk on →
        </Link>
        {stars < MAX_STARS && (
          <button type="button" className="ws-pill" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/** Post-chapter challenge: up to 3 questions from the chapter's own verses, scored in stars. */
export function ChallengeSheet({ chapterId, label, verses, onClose }: Props): ReactNode {
  const { stars: bestStars } = useStudy();
  const [attempt, setAttempt] = useState(0);
  const questions = useMemo(() => generateChallenge(chapterId, verses, attempt), [chapterId, verses, attempt]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<number | null>(questions.length === 0 ? starsFor(0, 0) : null);
  const card = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(card.current, { y: 40, autoAlpha: 0, duration: 0.5, ease: "power3.out" });
      });
    },
    { scope: card },
  );

  const answer = (wasCorrect: boolean): void => {
    const total = correct + (wasCorrect ? 1 : 0);
    setCorrect(total);
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    const stars = recordChallenge(chapterId, total, questions.length, originOf(card.current));
    setResult(stars);
  };

  const retry = (): void => {
    setAttempt((value) => value + 1);
    setIndex(0);
    setCorrect(0);
    setResult(null);
  };

  const question = questions[index];

  return (
    <div className="celebration" role="dialog" aria-modal="true" aria-label={`${label} challenge`}>
      <div className="celebration__scrim" onClick={onClose} />
      <div ref={card} className="celebration__card challenge">
        <div className="ws-row" style={{ width: "100%" }}>
          <span className="ws-muted">{label} · stop challenge</span>
          <button type="button" className="ws-pill ws-pill--sm" onClick={onClose} aria-label="Close challenge">
            ✕
          </button>
        </div>
        {result === null && question ? (
          <>
            <div className="challenge__progress" aria-hidden="true">
              {questions.map((_, step) => (
                <span key={step} className={step < index ? "is-done" : step === index ? "is-now" : ""} />
              ))}
            </div>
            <span className="ws-label">{question.prompt}</span>
            <RoundRenderer key={`${attempt}-${index}`} round={question} onDone={answer} />
          </>
        ) : (
          <Results stars={result ?? 1} best={bestStars[chapterId] ?? 0} onRetry={retry} chapterId={chapterId} />
        )}
      </div>
    </div>
  );
}

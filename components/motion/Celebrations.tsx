"use client";

import Image from "next/image";
import { useRef, type ReactNode } from "react";

import { Lamp } from "@/components/motion/Lamp";
import { MOTION_OK, MOTION_REDUCED, gsap, useGSAP } from "@/components/motion/gsap";
import { getBadge } from "@/data/badges";
import { DIVISIONS } from "@/data/divisions";
import { dismiss, useCelebrations, type Celebration, type Origin, type SoundName } from "@/lib/celebrations";
import { getBook } from "@/lib/canon";
import { DAILY_GOAL, LEVELS, pilgrimStage } from "@/lib/game";
import { play } from "@/lib/sound";
import { equippedItem, useStudy } from "@/lib/study-store";

// ── Hand-drawn confetti (marigold, ink, ash — the Woset palette only) ──

const SQUIGGLE = "M2 8c3-6 5 6 8 0s5 6 8 0";
const LEAF = "M10 2c5 3 5 11 0 14C5 13 5 5 10 2z";
const STAR = "M10 1l2.4 6 6.4.4-5 4 1.6 6.3L10 14.3 4.6 17.7l1.6-6.3-5-4 6.4-.4z";
const CROSS = "M4 4l12 12M16 4L4 16";
const DOVE = "M2 11c3-1 5-4 8-4 2 0 3 1 4 2l4-3-1 5c-1 3-4 5-8 5-3 0-5-1-7-5z";
const MOON = "M13 2a8 8 0 1 0 5 13 7 7 0 0 1-5-13z";

/** Shape sets — the Workshop's "Celebrations" slot picks one. */
export const CONFETTI_SETS: Record<string, string[]> = {
  "confetti-squiggles": [SQUIGGLE, LEAF, STAR, CROSS],
  "confetti-leaves": [LEAF, LEAF, SQUIGGLE, LEAF],
  "confetti-doves": [DOVE, LEAF, DOVE, CROSS],
  "confetti-stars": [STAR, MOON, STAR, CROSS],
};
const CONFETTI_COLORS = ["var(--ws-accent)", "var(--ws-fg)", "var(--ws-border)", "var(--ws-accent)"];

function Confetti({ pieces = 34 }: { pieces?: number }): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const { equipped } = useStudy();
  const shapes = CONFETTI_SETS[equippedItem(equipped, "confetti")] ?? CONFETTI_SETS["confetti-squiggles"];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<SVGElement>(".confetti__piece").forEach((piece) => {
          gsap.fromTo(
            piece,
            { x: 0, y: 0, rotation: gsap.utils.random(-90, 90), autoAlpha: 1, scale: gsap.utils.random(0.7, 1.3) },
            {
              duration: gsap.utils.random(1.6, 2.4),
              physics2D: { velocity: gsap.utils.random(320, 640), angle: gsap.utils.random(-150, -30), gravity: 720 },
              rotation: `+=${gsap.utils.random(-540, 540)}`,
              autoAlpha: 0,
              ease: "none",
            },
          );
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="confetti" aria-hidden="true">
      {Array.from({ length: pieces }, (_, index) => {
        const shape = shapes[index % shapes.length];
        const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
        const filled = index % 4 === 1 || index % 4 === 2;
        return (
          <svg key={index} className="confetti__piece" width="20" height="20" viewBox="0 0 20 20">
            <path d={shape} fill={filled ? color : "none"} stroke={filled ? "var(--ws-fg)" : color} strokeWidth={filled ? 1 : 2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      })}
    </div>
  );
}

// ── XP toast ──────────────────────────────────────────────────────

interface ToastProps {
  id: number;
  amount: number;
  oil: number;
  origin: Origin | null;
  note?: string;
  sound?: SoundName;
}

function XpToast({ id, amount, oil, origin, note, sound }: ToastProps): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  useGSAP(
    () => {
      // StrictMode runs effects twice in dev — play once.
      if (!played.current) {
        played.current = true;
        play(sound ?? "chime");
      }
      const done = (): void => dismiss(id);
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ onComplete: done })
          .fromTo(root.current, { y: 8, scale: 0.6, autoAlpha: 0 }, { y: -18, scale: 1, autoAlpha: 1, duration: 0.45, ease: "back.out(2.6)" })
          .to(root.current, { y: -64, autoAlpha: 0, duration: 0.7, ease: "power2.in" }, "+=0.55");
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.delayedCall(1.4, done);
      });
    },
    { scope: root },
  );

  const style = origin
    ? { left: origin.x, top: origin.y }
    : { left: "50%", bottom: 96, top: "auto" as const };

  return (
    <div ref={root} className="xp-toast" style={style} role="status">
      {[amount > 0 ? `+${amount} XP` : null, oil > 0 ? `+${oil} oil` : null].filter(Boolean).join(" · ")}
      {note && <span className="xp-toast__note">{note}</span>}
    </div>
  );
}

// ── Modal celebrations ────────────────────────────────────────────

interface ModalContent {
  eyebrow: string;
  title: string;
  body: string;
  media: ReactNode;
}

function contentFor(event: Celebration): ModalContent | null {
  switch (event.kind) {
    case "badge": {
      const badge = getBadge(event.badgeId);
      if (!badge) return null;
      return {
        eyebrow: "Badge earned",
        title: badge.name,
        body: badge.blurb,
        media: <Image src={badge.image} alt="" width={200} height={200} className="celebration__medallion" />,
      };
    }
    case "level":
      return {
        eyebrow: "You've grown",
        title: LEVELS[event.levelIndex]?.name ?? "New level",
        body:
          pilgrimStage(event.levelIndex) > pilgrimStage(event.levelIndex - 1)
            ? `Level ${event.levelIndex + 1}. A new chapter of your journey — your pilgrim has grown too.`
            : `Level ${event.levelIndex + 1} of ${LEVELS.length}. Keep putting down roots.`,
        media: (
          <Image
            src={`/pilgrim/stage-${pilgrimStage(event.levelIndex) + 1}.webp`}
            alt=""
            width={150}
            height={300}
            className="celebration__pilgrim"
          />
        ),
      };
    case "book": {
      const book = getBook(event.bookId);
      const division = DIVISIONS.find((item) => item.id === book?.division);
      return {
        eyebrow: "Book complete",
        title: book?.name ?? event.bookId,
        body: "Every chapter, read. It's on your shelf now.",
        media: <Image src={division?.art ?? "/art/hero.webp"} alt="" width={300} height={200} className="celebration__art" />,
      };
    }
    case "goal":
      return {
        eyebrow: "Daily goal",
        title: "Today's lamp is lit",
        body: `${DAILY_GOAL} XP today. Rest well — or keep reading for the joy of it.`,
        media: (
          <div className="celebration__lamp">
            <Lamp lit glow={1} size={120} />
          </div>
        ),
      };
    default:
      return null;
  }
}

function CelebrationModal({ id, content }: { id: number; content: ModalContent }): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  const played = useRef(false);
  useGSAP(
    () => {
      if (!played.current) {
        played.current = true;
        play("bell");
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline()
          .from(".celebration__scrim", { autoAlpha: 0, duration: 0.25 })
          .from(".celebration__card", { scale: 0.82, autoAlpha: 0, duration: 0.7, ease: "elastic.out(1, 0.6)" }, "<0.05")
          .from(".celebration__media", { scale: 0.3, rotation: -18, duration: 0.9, ease: "back.out(2.2)" }, "<0.1")
          .from(".celebration__text > *", { y: 14, autoAlpha: 0, stagger: 0.08, duration: 0.45, ease: "power3.out" }, "<0.2");
      });
    },
    { scope: root },
  );

  // Plain event handler: the modal unmounts right after, so there's nothing to clean up.
  const close = (): void => {
    if (window.matchMedia(MOTION_REDUCED).matches || !root.current) {
      dismiss(id);
      return;
    }
    gsap.to(root.current, { autoAlpha: 0, duration: 0.2, onComplete: () => dismiss(id) });
  };

  return (
    <div ref={root} className="celebration" role="dialog" aria-modal="true" aria-labelledby={`celebration-${id}`}>
      <div className="celebration__scrim" onClick={close} />
      <div className="celebration__card">
        <Confetti />
        <div className="celebration__media">{content.media}</div>
        <div className="celebration__text">
          <span className="ws-muted">{content.eyebrow}</span>
          <h2 id={`celebration-${id}`} className="ws-heading">
            {content.title}
          </h2>
          <p style={{ margin: 0 }}>{content.body}</p>
          <div className="ws-pills">
            <button type="button" className="ws-pill ws-pill--primary" onClick={close} autoFocus>
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mounted once in the layout: shows XP toasts and, one at a time, bigger celebrations. */
export function Celebrations(): ReactNode {
  const queue = useCelebrations();
  const toasts = queue.filter((item) => item.event.kind === "xp");
  const modal = queue.find((item) => item.event.kind !== "xp");
  const content = modal ? contentFor(modal.event) : null;

  return (
    <>
      {toasts.map((item) =>
        item.event.kind === "xp" ? (
          <XpToast
            key={item.id}
            id={item.id}
            amount={item.event.amount}
            oil={item.event.oil}
            origin={item.event.origin}
            note={item.event.note}
            sound={item.event.sound}
          />
        ) : null,
      )}
      {modal && content && <CelebrationModal key={modal.id} id={modal.id} content={content} />}
      {modal && !content && <DismissUnknown id={modal.id} />}
    </>
  );
}

function DismissUnknown({ id }: { id: number }): ReactNode {
  useGSAP(() => {
    dismiss(id);
  });
  return null;
}

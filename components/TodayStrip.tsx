"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";

import { CountUp } from "@/components/motion/CountUp";
import { Lamp } from "@/components/motion/Lamp";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { DAILY_GOAL } from "@/lib/game";
import { useGame } from "@/lib/study-store";

const RING_RADIUS = 27;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function GoalRing({ progress }: { progress: number }): ReactNode {
  const fill = useRef<SVGCircleElement>(null);
  useGSAP(
    () => {
      const offset = RING_LENGTH * (1 - progress);
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.to(fill.current, { strokeDashoffset: offset, duration: 1.2, ease: "power3.out" });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(fill.current, { strokeDashoffset: offset });
      });
    },
    { dependencies: [progress] },
  );
  return (
    <svg className="goal-ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle className="goal-ring__track" cx="32" cy="32" r={RING_RADIUS} fill="none" strokeWidth="6" />
      <circle
        ref={fill}
        className="goal-ring__fill"
        cx="32"
        cy="32"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="6"
        strokeDasharray={RING_LENGTH}
        strokeDashoffset={RING_LENGTH}
      />
    </svg>
  );
}

/** Home "Today" strip: goal ring + streak lamp + memory, with the quiz slotted in. */
export function TodayStrip({ quiz }: { quiz: ReactNode }): ReactNode {
  const { todayXp, goalProgress, streak, dueCount, level, lordsDay } = useGame();

  return (
    <>
      {lordsDay && <div className="lords-day">☀ The Lord&apos;s Day — all XP doubled today</div>}
      <section className="today" aria-label="Today">
      <Link href="/journey" className="tile">
        <span className="ws-muted">Today&apos;s lamp</span>
        <div className="tile__row">
          <GoalRing progress={goalProgress} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="tile__big">
              <CountUp value={todayXp} />
              <span className="ws-muted" style={{ fontSize: 15, letterSpacing: "-0.02em" }}>
                {" "}
                / {DAILY_GOAL} XP
              </span>
            </span>
            <span className="ws-muted">{goalProgress >= 1 ? "Lit — well done." : "Read a chapter to light it."}</span>
          </div>
        </div>
        <span className="ws-muted" style={{ marginTop: "auto" }}>
          {level.name} · level {level.index + 1}
        </span>
      </Link>

      <Link href="/journey" className="tile">
        <span className="ws-muted">Streak</span>
        <div className="tile__row">
          <Lamp lit={streak.litToday} glow={Math.min(1, streak.current / 30)} size={64} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="tile__big">
              <CountUp value={streak.current} /> {streak.current === 1 ? "day" : "days"}
            </span>
            <span className="ws-muted">{streak.restingNow ? "Resting — still safe." : `Best ${streak.longest}`}</span>
          </div>
        </div>
        <span className="ws-muted" style={{ marginTop: "auto" }}>
          {dueCount > 0 ? `${dueCount} verse${dueCount === 1 ? "" : "s"} to review →` : "Memory: all caught up"}
        </span>
      </Link>

      {quiz}
      </section>
    </>
  );
}

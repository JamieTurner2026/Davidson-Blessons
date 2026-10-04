"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { CountUp } from "@/components/motion/CountUp";
import { Lamp } from "@/components/motion/Lamp";
import { ProgressFill } from "@/components/motion/ProgressFill";
import { Reveal } from "@/components/motion/Reveal";
import { BADGES } from "@/data/badges";
import { originOf } from "@/lib/celebrations";
import { addDays, weekday } from "@/lib/day";
import { DAILY_GOAL, LEVELS, isLit, pilgrimStage } from "@/lib/game";
import { booksComplete, checkIn, useGame } from "@/lib/study-store";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKS_SHOWN = 5;

function streakMessage(current: number, restingNow: boolean, litToday: boolean): string {
  if (current === 0) return "Every streak starts with one chapter.";
  if (restingNow) return "Taking a rest day — your streak is safe. Read today to keep it going.";
  if (!litToday) return "Your lamp is waiting for today's reading.";
  return current === 1 ? "Day one. Welcome." : `${current} days in the Word. Lovely.`;
}

export function JourneyClient(): ReactNode {
  const { state, today, todayXp, level, streak, starsTotal } = useGame();
  const stage = pilgrimStage(level.index);
  const stageNames = ["The young traveller", "The walker with a staff", "The lamp-bearer", "The elder"];
  const checkedIn = (state.days[today]?.by.checkin ?? 0) > 0;
  const nextLevel = LEVELS[level.index + 1];
  const books = booksComplete(state.chaptersRead).size;

  // Calendar: last N whole weeks ending with this week.
  const start = addDays(today, -weekday(today) - (WEEKS_SHOWN - 1) * 7);
  const calendar = Array.from({ length: WEEKS_SHOWN * 7 }, (_, index) => addDays(start, index));

  return (
    <Reveal className="ws-stack" style={{ paddingBlock: 0 }}>
      <section className="journey-hero">
        <Lamp lit={streak.litToday} glow={Math.min(1, streak.current / 30)} size={150} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="ws-muted">Current streak</span>
          <span className="ws-display" style={{ textAlign: "inherit" }}>
            <CountUp value={streak.current} /> {streak.current === 1 ? "day" : "days"}
          </span>
          <span>{streakMessage(streak.current, streak.restingNow, streak.litToday)}</span>
          <span className="ws-muted">
            Longest {streak.longest} · Perfect weeks {streak.perfectWeeks} · One rest day a week never breaks a streak.
          </span>
        </div>
      </section>

      <section className="pilgrim-card">
        <Image src={`/pilgrim/stage-${stage + 1}.webp`} alt="Your pilgrim" width={120} height={240} className="pilgrim-card__figure" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="ws-muted">Your pilgrim</span>
          <span className="tile__big">{stageNames[stage]}</span>
          <span className="ws-muted">
            {stage < 3 ? `He grows again at ${LEVELS[(stage + 1) * 2]?.name}.` : "He has walked a long road with you."}
          </span>
          <span>
            ★ {starsTotal} stars · {state.oil} oil · {Object.keys(state.treasures).length} treasures found
          </span>
        </div>
      </section>

      <section className="today">
        <div className="tile">
          <span className="ws-muted">Level {level.index + 1}</span>
          <span className="tile__big">{level.name}</span>
          <ProgressFill value={level.progress} label="Progress to next level" tall />
          <span className="ws-muted">
            <CountUp value={state.xp} /> XP{nextLevel ? ` · ${nextLevel.xp - state.xp} to ${nextLevel.name}` : " · fully grown"}
          </span>
        </div>
        <div className="tile">
          <span className="ws-muted">Today</span>
          <span className="tile__big">
            <CountUp value={todayXp} /> / {DAILY_GOAL} XP
          </span>
          <ProgressFill value={todayXp / DAILY_GOAL} label="Daily goal" tall />
          <span className="ws-muted">{todayXp >= DAILY_GOAL ? "Lamp lit for today." : "Read a chapter or two to light today's lamp."}</span>
        </div>
        <div className="tile">
          <span className="ws-muted">Read a paper Bible?</span>
          <span>Reading off-screen counts too. Check in and your streak keeps going.</span>
          <div className="ws-pills ws-pills--start" style={{ marginTop: "auto" }}>
            <button
              type="button"
              className="ws-pill"
              aria-pressed={checkedIn}
              disabled={checkedIn}
              onClick={(event) => checkIn(originOf(event.currentTarget))}
            >
              {checkedIn ? "Checked in today ✓" : "I read today"}
            </button>
          </div>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 className="ws-heading">Your weeks</h2>
        <div className="calendar" role="grid" aria-label={`Last ${WEEKS_SHOWN} weeks`}>
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={`${label}${index}`} className="calendar__label">
              {label}
            </span>
          ))}
          {calendar.map((key) => {
            const classes = [
              "calendar__day",
              isLit(state.days, key) ? "is-lit" : "",
              key === today ? "is-today" : "",
              key > today ? "is-future" : "",
            ].join(" ");
            return (
              <span key={key} className={classes} title={key} role="gridcell">
                {Number(key.slice(8))}
              </span>
            );
          })}
        </div>
        <span className="ws-muted">
          {Object.keys(state.chaptersRead).length} {Object.keys(state.chaptersRead).length === 1 ? "chapter" : "chapters"} read · {books}{" "}
          {books === 1 ? "book" : "books"} complete
        </span>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <h2 className="ws-heading">
          Badges · {Object.keys(state.badges).length}/{BADGES.length}
        </h2>
        <div className="badges">
          {BADGES.map((badge) => {
            const earned = state.badges[badge.id];
            return (
              <div key={badge.id} className={earned ? "badge" : "badge is-locked"}>
                <Image src={badge.image} alt="" width={240} height={240} />
                <span className="ws-label">{badge.name}</span>
                <span className="ws-muted">{earned ? badge.blurb : badge.hint}</span>
              </div>
            );
          })}
        </div>
      </section>
    </Reveal>
  );
}

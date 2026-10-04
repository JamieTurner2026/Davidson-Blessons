"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ProgressBar, describeChapters } from "@/components/PlansClient";
import { getPlan } from "@/data/plans";
import { chapterLabel, parseChapterId } from "@/lib/canon";
import { useStudy } from "@/lib/study-store";

export function HomeActions(): ReactNode {
  const { lastRead, activePlan, planProgress, translation } = useStudy();
  const ref = lastRead ? parseChapterId(lastRead.chapterId) : null;
  const plan = activePlan ? getPlan(activePlan) : undefined;
  const done = plan ? new Set(planProgress[plan.id] ?? []) : new Set<number>();
  const nextDay = plan?.days.find((day) => !done.has(day.day));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30, alignItems: "center" }}>
      <div className="ws-pills">
        {lastRead && ref ? (
          <Link className="ws-pill ws-pill--primary" href={`/read/${lastRead.translation}/${lastRead.chapterId}`}>
            Continue {chapterLabel(ref)}
          </Link>
        ) : (
          <Link className="ws-pill ws-pill--primary" href={`/read/${translation}/JHN.1`}>
            Start with John 1
          </Link>
        )}
        <Link className="ws-pill" href="/search">
          Search
        </Link>
        <Link className="ws-pill" href="/plans">
          Reading plans
        </Link>
        <Link className="ws-pill" href="/notes">
          My notes
        </Link>
      </div>

      {plan && (
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="ws-row">
            <span className="ws-label">{plan.title}</span>
            <span className="ws-muted">
              {done.size}/{plan.days.length}
            </span>
          </div>
          <ProgressBar done={done.size} total={plan.days.length} />
          {nextDay && (
            <Link href={`/read/${translation}/${nextDay.chapters[0]}`} className="ws-muted">
              Next: Day {nextDay.day} — {describeChapters(nextDay.chapters)} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

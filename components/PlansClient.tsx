"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ProgressFill } from "@/components/motion/ProgressFill";
import { PLANS, type ReadingPlan } from "@/data/plans";
import { chapterLabel, parseChapterId } from "@/lib/canon";
import { originOf } from "@/lib/celebrations";
import { setActivePlan, togglePlanDay, useStudy } from "@/lib/study-store";

export function ProgressBar({ done, total }: { done: number; total: number }): ReactNode {
  return <ProgressFill value={total === 0 ? 0 : done / total} label={`${done} of ${total} days`} />;
}

/** Joins "MAT.1, MAT.2, MAT.3" into "Matthew 1–3". */
export function describeChapters(chapterIds: string[]): string {
  const parts: string[] = [];
  for (const id of chapterIds) {
    const ref = parseChapterId(id);
    if (!ref) continue;
    const label = chapterLabel(ref);
    const last = parts.at(-1);
    const bookName = label.slice(0, label.lastIndexOf(" "));
    if (last && last.startsWith(`${bookName} `)) {
      parts[parts.length - 1] = `${last.split("–")[0]}–${ref.chapter}`;
    } else {
      parts.push(label);
    }
  }
  return parts.join(", ");
}

function PlanDetail({ plan, translation }: { plan: ReadingPlan; translation: string }): ReactNode {
  const { planProgress } = useStudy();
  const done = new Set(planProgress[plan.id] ?? []);
  return (
    <ul className="ws-list">
      {plan.days.map((day) => (
        <li key={day.day}>
          <label className="day-row">
            <input
              type="checkbox"
              className="check"
              checked={done.has(day.day)}
              onChange={(event) => togglePlanDay(plan.id, day.day, originOf(event.currentTarget))}
              aria-label={`Mark day ${day.day} read`}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="ws-label">Day {day.day}</span>
              <span className="ws-muted">{describeChapters(day.chapters)}</span>
            </span>
          </label>
          <div className="ws-pills ws-pills--start" style={{ paddingLeft: 34 }}>
            {day.chapters.map((id) => {
              const ref = parseChapterId(id);
              return (
                <Link key={id} href={`/read/${translation}/${id}`} className="ws-pill ws-pill--sm">
                  {ref ? chapterLabel(ref) : id}
                </Link>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PlansClient(): ReactNode {
  const { activePlan, planProgress, translation } = useStudy();

  return (
    <div className="reader ws-stack" style={{ paddingBlock: 0, gap: 48 }}>
      {PLANS.map((plan) => {
        const done = (planProgress[plan.id] ?? []).length;
        const isActive = activePlan === plan.id;
        return (
          <section key={plan.id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="ws-row">
              <h2 className="ws-heading">{plan.title}</h2>
              <button
                type="button"
                className="ws-pill"
                aria-pressed={isActive}
                onClick={() => setActivePlan(isActive ? null : plan.id)}
              >
                {isActive ? "Following" : "Follow this plan"}
              </button>
            </div>
            <p className="ws-muted" style={{ margin: 0 }}>
              {plan.summary} · {done} of {plan.days.length} days
            </p>
            <ProgressBar done={done} total={plan.days.length} />
            {isActive && <PlanDetail plan={plan} translation={translation} />}
          </section>
        );
      })}
    </div>
  );
}

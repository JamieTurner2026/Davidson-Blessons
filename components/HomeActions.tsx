"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { chapterLabel, parseChapterId } from "@/lib/canon";
import { useStudy } from "@/lib/study-store";

export function HomeActions(): ReactNode {
  const { lastRead, translation } = useStudy();
  const ref = lastRead ? parseChapterId(lastRead.chapterId) : null;

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
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Lamp } from "@/components/motion/Lamp";
import { useGame } from "@/lib/study-store";

function NavLink({ href, match, children }: { href: string; match: string; children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const active = pathname === match || pathname.startsWith(`${match}/`);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

export function Nav(): ReactNode {
  const { state, streak, goalProgress, dueCount } = useGame();
  const { lastRead, translation } = state;
  const readHref = lastRead ? `/read/${lastRead.translation}/${lastRead.chapterId}` : `/read/${translation}/JHN.1`;

  return (
    <nav className="ws-nav" aria-label="Main">
      <div className="ws-nav__group">
        <NavLink href={readHref} match="/read">
          Read
        </NavLink>
        <NavLink href="/search" match="/search">
          Search
        </NavLink>
        <NavLink href="/library" match="/library">
          Library
        </NavLink>
      </div>
      <Link href="/" className="ws-nav__wordmark">
        Selah
      </Link>
      <div className="ws-nav__group ws-nav__group--end" style={{ alignItems: "center" }}>
        <NavLink href="/memory" match="/memory">
          Memory{dueCount > 0 ? ` · ${dueCount}` : ""}
        </NavLink>
        <NavLink href="/plans" match="/plans">
          Plans
        </NavLink>
        <NavLink href="/notes" match="/notes">
          Notes
        </NavLink>
        <Link
          href="/journey"
          className="nav-streak"
          aria-label={`Your journey: ${streak.current}-day streak`}
        >
          <Lamp lit={goalProgress >= 1} glow={Math.min(1, streak.current / 30)} size={26} />
          {streak.current}
        </Link>
      </div>
    </nav>
  );
}

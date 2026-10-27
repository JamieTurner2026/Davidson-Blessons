"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SoundToggle } from "@/components/SoundToggle";
import { Lamp } from "@/components/motion/Lamp";
import { useGame } from "@/lib/study-store";
import { useAccount } from "@/lib/sync";

function NavLink({ href, match, children }: { href: string; match: string; children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const active = pathname === match || pathname.startsWith(`${match}/`);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

function OilJar(): ReactNode {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true">
      <path d="M6 2.5h6M6.8 2.5v2.2C3.6 6 2 8.6 2 11.6 2 15.5 5 18 9 18s7-2.5 7-6.4c0-3-1.6-5.6-4.8-6.9V2.5" fill="var(--ws-bg)" stroke="var(--ws-fg)" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M3.6 12.2c2.6.9 8.2.9 10.8 0-.3 2.9-2.4 4.4-5.4 4.4s-5.1-1.5-5.4-4.4z" fill="var(--ws-accent)" />
    </svg>
  );
}

/** The signed-in reader's initial, linking to their account (the nav only shows once signed in). */
function AccountChip(): ReactNode {
  const account = useAccount();
  if (!account.userId) return null;
  const initial = (account.email ?? "?").trim().charAt(0).toUpperCase();
  return (
    <Link href="/journey#account" className="nav-account nav-account--signed-in" aria-label={`Account: ${account.email ?? "signed in"}`} title={account.email ?? undefined}>
      {initial}
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
        <NavLink href="/map" match="/map">
          Trail
        </NavLink>
        <NavLink href={readHref} match="/read">
          Read
        </NavLink>
        <NavLink href="/play" match="/play">
          Play
        </NavLink>
        <NavLink href="/search" match="/search">
          Search
        </NavLink>
      </div>
      <Link href="/" className="ws-nav__wordmark">
        Davidson Blessons
      </Link>
      <div className="ws-nav__group ws-nav__group--end" style={{ alignItems: "center" }}>
        <NavLink href="/memory" match="/memory">
          Memory{dueCount > 0 ? ` · ${dueCount}` : ""}
        </NavLink>
        <SoundToggle />
        <AccountChip />
        <Link href="/workshop" className="nav-streak nav-oil" aria-label={`${state.oil} oil — open the Workshop`} title="Oil — spend it in the Workshop">
          <OilJar />
          {state.oil}
        </Link>
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useStudy } from "@/lib/study-store";

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
  const { lastRead, translation } = useStudy();
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
      </div>
      <Link href="/" className="ws-nav__wordmark">
        Selah
      </Link>
      <div className="ws-nav__group ws-nav__group--end">
        <NavLink href="/plans" match="/plans">
          Plans
        </NavLink>
        <NavLink href="/notes" match="/notes">
          Notes
        </NavLink>
      </div>
    </nav>
  );
}

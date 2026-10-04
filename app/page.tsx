import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Fums } from "@/components/Fums";
import { HomeActions } from "@/components/HomeActions";
import { DIVISIONS } from "@/data/divisions";
import { VOTD_POOL } from "@/data/votd";
import { getVerse } from "@/lib/apibible";
import { DEFAULT_TRANSLATION } from "@/lib/bibles";
import { parseVerseId } from "@/lib/canon";
import type { VerseText } from "@/lib/schemas";
import { pickVerseOfDay } from "@/lib/votd";

// Re-render hourly so the verse of the day rolls over shortly after midnight UTC.
export const revalidate = 3600;

async function loadVerseOfDay(): Promise<VerseText | null> {
  try {
    return await getVerse(DEFAULT_TRANSLATION, pickVerseOfDay(new Date(), VOTD_POOL));
  } catch {
    return null;
  }
}

export default async function Home(): Promise<ReactNode> {
  const verse = await loadVerseOfDay();
  const verseRef = verse ? parseVerseId(verse.id) : null;

  return (
    <div className="ws-stack">
      <h1 className="ws-display">
        Be still,
        <br />
        and read.
      </h1>

      <HomeActions />

      {verse && verseRef && (
        <section className="votd" aria-label="Verse of the day">
          <span className="ws-muted">Verse of the day</span>
          <p className="votd__text">“{verse.text.replace(/[,;:]$/, "…")}”</p>
          <Link href={`/read/${DEFAULT_TRANSLATION.slug}/${verseRef.bookId}.${verseRef.chapter}#${verse.id}`}>
            {verse.reference} · {DEFAULT_TRANSLATION.abbreviation}
          </Link>
          <Fums token={verse.fumsToken} />
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        <h2 className="ws-heading" style={{ textAlign: "center" }}>
          Explore the library
        </h2>
        <div className="ws-grid">
          {DIVISIONS.map((division) => (
            <Link key={division.id} href={`/read/${DEFAULT_TRANSLATION.slug}/${division.start}`} className="ws-card">
              <div className="ws-card__media">
                <Image src={division.art} alt="" width={1200} height={800} sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 380px" />
              </div>
              <div className="ws-card__meta">
                <span className="ws-card__title">{division.title}</span>
                <span className="ws-muted">{division.span}</span>
              </div>
            </Link>
          ))}
          <Link href="/plans" className="ws-card">
            <div className="ws-card__media">
              <Image src="/art/hero.webp" alt="" width={1200} height={800} sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 380px" />
            </div>
            <div className="ws-card__meta">
              <span className="ws-card__title">Reading plans</span>
              <span className="ws-muted">Read a little every day</span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

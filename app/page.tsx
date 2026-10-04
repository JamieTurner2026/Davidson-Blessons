import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Fums } from "@/components/Fums";
import { HomeActions } from "@/components/HomeActions";
import { QuizCard } from "@/components/QuizCard";
import { TodayStrip } from "@/components/TodayStrip";
import { Reveal } from "@/components/motion/Reveal";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { DIVISIONS } from "@/data/divisions";
import { VOTD_POOL } from "@/data/votd";
import { getVerse } from "@/lib/apibible";
import { DEFAULT_TRANSLATION } from "@/lib/bibles";
import { parseVerseId } from "@/lib/canon";
import { dailyQuiz } from "@/lib/quiz";
import type { VerseText } from "@/lib/schemas";
import { pickVerseOfDay } from "@/lib/votd";

// Re-render hourly so the verse of the day and quiz roll over shortly after midnight (New York).
export const revalidate = 3600;

async function loadVerse(verseId: string): Promise<VerseText | null> {
  try {
    return await getVerse(DEFAULT_TRANSLATION, verseId);
  } catch {
    return null;
  }
}

function trimTrailing(text: string): string {
  return text.replace(/[,;:]$/, "…");
}

export default async function Home(): Promise<ReactNode> {
  const now = new Date();
  const quiz = dailyQuiz(now);
  const [verse, quizVerse] = await Promise.all([loadVerse(pickVerseOfDay(now, VOTD_POOL)), loadVerse(quiz.verseId)]);
  const verseRef = verse ? parseVerseId(verse.id) : null;

  return (
    <div className="ws-stack">
      <SplitHeadline lines={["Be still,", "and read."]} />

      <Reveal delay={0.35} style={{ display: "flex", flexDirection: "column", gap: "var(--section-gap)" }}>
        <HomeActions />

        <TodayStrip
          quiz={
            quizVerse ? (
              <QuizCard
                day={quiz.day}
                verseId={quiz.verseId}
                text={trimTrailing(quizVerse.text)}
                answer={quiz.answer}
                options={quiz.options}
                translation={DEFAULT_TRANSLATION.slug}
              />
            ) : null
          }
        />

        {verse && verseRef && (
          <section className="votd" aria-label="Verse of the day">
            <span className="ws-muted">Verse of the day</span>
            <p className="votd__text">“{trimTrailing(verse.text)}”</p>
            <Link href={`/read/${DEFAULT_TRANSLATION.slug}/${verseRef.bookId}.${verseRef.chapter}#${verse.id}`}>
              {verse.reference} · {DEFAULT_TRANSLATION.abbreviation}
            </Link>
          </section>
        )}

        <section style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <h2 className="ws-heading" style={{ textAlign: "center" }}>
            Explore the library
          </h2>
          <Reveal className="ws-grid" stagger={0.06}>
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
            <Link href="/journey" className="ws-card">
              <div className="ws-card__media">
                <Image src="/art/hero.webp" alt="" width={1200} height={800} sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 380px" />
              </div>
              <div className="ws-card__meta">
                <span className="ws-card__title">Your journey</span>
                <span className="ws-muted">Streaks, levels & badges</span>
              </div>
            </Link>
          </Reveal>
        </section>
      </Reveal>

      {verse && <Fums token={verse.fumsToken} />}
      {quizVerse && <Fums token={quizVerse.fumsToken} />}
    </div>
  );
}

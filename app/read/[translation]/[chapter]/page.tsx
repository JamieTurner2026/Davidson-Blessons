import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ChapterPicker } from "@/components/ChapterPicker";
import { Fums } from "@/components/Fums";
import { Reader } from "@/components/Reader";
import { ApiBibleError, getChapter } from "@/lib/apibible";
import { TRANSLATIONS, getTranslation } from "@/lib/bibles";
import { adjacentChapter, chapterLabel, parseChapterId, type ChapterRef } from "@/lib/canon";
import type { Chapter } from "@/lib/schemas";

interface Params {
  params: Promise<{ translation: string; chapter: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { translation, chapter } = await params;
  const place = parseChapterId(chapter);
  const version = getTranslation(translation);
  if (!place || !version) return {};
  return { title: `${chapterLabel(place)} (${version.abbreviation})` };
}

function ChapterNav({ translation, place }: { translation: string; place: ChapterRef }): ReactNode {
  const previous = adjacentChapter(place, -1);
  const next = adjacentChapter(place, 1);
  return (
    <div className="ws-row">
      {previous ? (
        <Link className="ws-pill" href={`/read/${translation}/${previous}`}>
          ← {chapterLabel(parseChapterId(previous) ?? place)}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link className="ws-pill" href={`/read/${translation}/${next}`}>
          {chapterLabel(parseChapterId(next) ?? place)} →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

export default async function ReadPage({ params }: Params): Promise<ReactNode> {
  const { translation: slug, chapter: chapterId } = await params;
  const translation = getTranslation(slug);
  const place = parseChapterId(chapterId);
  if (!translation || !place) notFound();

  let chapter: Chapter | null = null;
  let failure: string | null = null;
  try {
    chapter = await getChapter(translation, chapterId);
  } catch (error) {
    failure =
      error instanceof ApiBibleError && error.status === 404
        ? `${translation.abbreviation} doesn't include ${chapterLabel(place)}.`
        : "We couldn't load this chapter just now. Please try again in a moment.";
  }

  return (
    <div className="ws-stack reader">
      <div className="reader__toolbar">
        <ChapterPicker translation={translation.slug} bookId={place.bookId} chapter={place.chapter} label={chapterLabel(place)} />
        <div className="ws-pills" role="group" aria-label="Translation">
          {TRANSLATIONS.map((option) => (
            <Link
              key={option.slug}
              href={`/read/${option.slug}/${chapterId}`}
              className="ws-pill ws-pill--sm"
              aria-current={option.slug === translation.slug ? "page" : undefined}
              title={option.name}
            >
              {option.abbreviation}
            </Link>
          ))}
        </div>
      </div>

      <h1 className="ws-display reader__title">{chapterLabel(place)}</h1>

      {chapter ? (
        <Reader key={`${translation.slug}:${chapterId}`} blocks={chapter.blocks} translation={translation.slug} chapterId={chapterId} />
      ) : (
        <p className="ws-muted" style={{ textAlign: "center" }} role="alert">
          {failure}
        </p>
      )}

      <ChapterNav translation={translation.slug} place={place} />

      {chapter && (
        <>
          <p className="copyright">{chapter.copyright}</p>
          <Fums token={chapter.fumsToken} />
        </>
      )}
    </div>
  );
}

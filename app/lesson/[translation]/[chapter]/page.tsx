import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Fums } from "@/components/Fums";
import { Lesson } from "@/components/lesson/Lesson";
import { describeFailure, getChapter } from "@/lib/apibible";
import { getTranslation } from "@/lib/bibles";
import { canonicalChapterId, chapterLabel, parseChapterId } from "@/lib/canon";
import { versesFromBlocks } from "@/lib/challenge";
import type { Chapter } from "@/lib/schemas";

interface Params {
  params: Promise<{ translation: string; chapter: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { chapter } = await params;
  const place = parseChapterId(chapter);
  return place ? { title: `${chapterLabel(place)} · lesson` } : {};
}

export default async function LessonPage({ params }: Params): Promise<ReactNode> {
  const { translation: slug, chapter: chapterId } = await params;
  const translation = getTranslation(slug);
  if (!translation) notFound();
  const place = parseChapterId(chapterId);
  if (!place) {
    const canonical = canonicalChapterId(chapterId);
    if (canonical) redirect(`/lesson/${translation.slug}/${canonical}`);
    notFound();
  }

  let chapter: Chapter | null = null;
  let reason = "";
  try {
    chapter = await getChapter(translation, chapterId);
  } catch (error) {
    console.error(`Lesson ${translation.slug}/${chapterId} failed to load:`, error instanceof Error ? error.message : error);
    reason = describeFailure(error);
    chapter = null;
  }

  return (
    <div className="ws-stack" style={{ paddingTop: 10 }}>
      {chapter ? (
        <>
          <Lesson
            chapterId={chapterId}
            bookId={place.bookId}
            label={chapterLabel(place)}
            translation={translation.slug}
            verses={versesFromBlocks(chapter.blocks)}
          />
          <p className="copyright">{chapter.copyright}</p>
          <Fums token={chapter.fumsToken} />
        </>
      ) : (
        <p className="ws-muted" style={{ textAlign: "center" }} role="alert">
          We couldn&apos;t load this lesson just now (code: {reason}).{" "}
          <Link href={`/read/${translation.slug}/${chapterId}`}>Try the reader instead →</Link>
        </p>
      )}
    </div>
  );
}

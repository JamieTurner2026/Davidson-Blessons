import "server-only";

import { getBook, parseChapterId, parseVerseId } from "@/lib/canon";
import type { Translation } from "@/lib/bibles";
import type { Block, Chapter, SearchResult, Segment, VerseText } from "@/lib/schemas";
import { z } from "zod";

// Public-domain translations served by our own Bible API (github.com/JamieTurner2026/API-bible),
// so reading them spends no API.Bible quota. No key, no FUMS: the text is public domain.
const BASE_URL = (process.env.BIBLE_API_URL ?? "https://api-bible-one.vercel.app").replace(/\/+$/, "");
const ONE_DAY = 60 * 60 * 24;

// Books whose text is poetry; their verses render with the reader's poetry style.
const POETRY_BOOKS = new Set(["JOB", "PSA", "PRO", "SNG", "LAM"]);

export class SelfBibleError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SelfBibleError";
  }
}

const verseSchema = z.object({
  verse: z.number(),
  verseId: z.string(),
  text: z.string(),
});

const chapterSchema = z.object({
  reference: z.string(),
  verses: z.array(verseSchema),
});

const singleVerseSchema = z.object({
  reference: z.string(),
  verseId: z.string(),
  text: z.string(),
});

const searchSchema = z.object({
  total: z.number(),
  results: z.array(z.object({ reference: z.string(), verseId: z.string(), text: z.string() })),
});

async function request(path: string, params: Record<string, string>, revalidate: number): Promise<unknown> {
  const url = `${BASE_URL}/${path}?${new URLSearchParams(params).toString()}`;
  const response = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate } });
  if (!response.ok) throw new SelfBibleError(`Bible API ${response.status} for ${path}`, response.status);
  return response.json();
}

function copyright(translation: Translation): string {
  return `${translation.name} (${translation.abbreviation}). Public domain.`;
}

export async function getChapter(translation: Translation, chapterId: string): Promise<Chapter> {
  const ref = parseChapterId(chapterId);
  if (!ref) throw new SelfBibleError(`Unknown chapter ${chapterId}`, 404);
  const json = await request(
    `books/${ref.bookId}/chapters/${ref.chapter}`,
    { translation: translation.selfHosted ?? translation.slug },
    ONE_DAY,
  );
  const parsed = chapterSchema.parse(json);
  const poetry = POETRY_BOOKS.has(ref.bookId);
  // The API has no paragraph or heading data, so each verse is its own block.
  // Verses a translation leaves out come back with empty text and are skipped.
  const blocks: Block[] = parsed.verses
    .filter((verse) => verse.text !== "")
    .map((verse) => {
      const segment: Segment = { verseId: verse.verseId, verseNumber: String(verse.verse), text: verse.text };
      return { kind: "para", poetry, segments: [segment] };
    });
  return {
    id: `${ref.bookId}.${ref.chapter}`,
    reference: `${getBook(ref.bookId)?.name ?? parsed.reference} ${ref.chapter}`,
    copyright: copyright(translation),
    blocks,
    fumsToken: null,
  };
}

export async function getVerse(translation: Translation, verseId: string): Promise<VerseText> {
  const ref = parseVerseId(verseId);
  if (!ref) throw new SelfBibleError(`Unknown verse ${verseId}`, 404);
  const json = await request(
    `books/${ref.bookId}/chapters/${ref.chapter}/verses/${ref.verse}`,
    { translation: translation.selfHosted ?? translation.slug },
    ONE_DAY,
  );
  const parsed = singleVerseSchema.parse(json);
  return {
    id: parsed.verseId,
    reference: `${getBook(ref.bookId)?.name ?? parsed.reference} ${ref.chapter}:${ref.verse}`,
    text: parsed.text,
    copyright: copyright(translation),
    fumsToken: null,
  };
}

export async function searchScripture(
  translation: Translation,
  query: string,
  offset: number,
  limit: number,
): Promise<SearchResult> {
  const json = await request(
    "search",
    { q: query, limit: String(limit), offset: String(offset), translation: translation.selfHosted ?? translation.slug },
    60 * 60,
  );
  const parsed = searchSchema.parse(json);
  return {
    total: parsed.total,
    hits: parsed.results.map((hit) => ({ id: hit.verseId, reference: hit.reference, text: hit.text })),
    fumsToken: null,
  };
}

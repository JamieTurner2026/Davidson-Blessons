import "server-only";

import type { Translation } from "@/lib/bibles";
import {
  chapterResponseSchema,
  searchResponseSchema,
  verseResponseSchema,
  type Chapter,
  type SearchResult,
  type VerseText,
} from "@/lib/schemas";
import { normaliseChapter } from "@/lib/normalise";

const BASE_URL = "https://rest.api.bible/v1/bibles";
const ONE_DAY = 60 * 60 * 24;

export class ApiBibleError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiBibleError";
  }
}

/** A short, non-secret code for why a request failed, safe to show on screen. */
export function describeFailure(error: unknown): string {
  if (error instanceof ApiBibleError) {
    return error.message.includes("API_BIBLE_KEY") ? "not-configured" : `api-${error.status}`;
  }
  if (error instanceof Error && error.name === "ZodError") return "parse";
  return "network";
}

function apiKey(): string {
  const key = process.env.API_BIBLE_KEY;
  if (!key) throw new ApiBibleError("API_BIBLE_KEY is not set", 500);
  return key;
}

async function request(path: string, params: Record<string, string>, revalidate: number): Promise<unknown> {
  const url = `${BASE_URL}/${path}?${new URLSearchParams(params).toString()}`;
  const response = await fetch(url, {
    headers: { "api-key": apiKey(), accept: "application/json" },
    next: { revalidate },
  });
  if (!response.ok) {
    throw new ApiBibleError(`API.Bible ${response.status} for ${path}`, response.status);
  }
  return response.json();
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// ── Public API ────────────────────────────────────────────────────

export async function getChapter(translation: Translation, chapterId: string): Promise<Chapter> {
  const json = await request(
    `${translation.apiId}/chapters/${chapterId}`,
    {
      "content-type": "json",
      "include-notes": "false",
      "include-titles": "true",
      "include-chapter-numbers": "false",
      "include-verse-numbers": "true",
      "include-verse-spans": "false",
    },
    ONE_DAY,
  );
  const parsed = chapterResponseSchema.parse(json);
  return {
    id: parsed.data.id,
    reference: parsed.data.reference,
    copyright: collapse(parsed.data.copyright),
    blocks: normaliseChapter(parsed.data.content),
    fumsToken: parsed.meta?.fumsToken ?? null,
  };
}

export async function getVerse(translation: Translation, verseId: string): Promise<VerseText> {
  const json = await request(
    `${translation.apiId}/verses/${verseId}`,
    {
      "content-type": "text",
      "include-notes": "false",
      "include-titles": "false",
      "include-verse-numbers": "false",
    },
    ONE_DAY,
  );
  const parsed = verseResponseSchema.parse(json);
  return {
    id: parsed.data.id,
    reference: parsed.data.reference,
    text: collapse(parsed.data.content),
    copyright: collapse(parsed.data.copyright),
    fumsToken: parsed.meta?.fumsToken ?? null,
  };
}

export const SEARCH_PAGE_SIZE = 20;

export async function searchScripture(translation: Translation, query: string, offset: number): Promise<SearchResult> {
  const json = await request(
    `${translation.apiId}/search`,
    { query, limit: String(SEARCH_PAGE_SIZE), offset: String(offset), sort: "canonical" },
    60 * 60,
  );
  const parsed = searchResponseSchema.parse(json);
  return {
    total: parsed.data.total,
    hits: parsed.data.verses.map((verse) => ({ id: verse.id, reference: verse.reference, text: verse.text })),
    fumsToken: parsed.meta?.fumsToken ?? null,
  };
}

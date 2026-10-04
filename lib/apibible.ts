import "server-only";

import type { Translation } from "@/lib/bibles";
import {
  chapterResponseSchema,
  searchResponseSchema,
  verseResponseSchema,
  type Block,
  type Chapter,
  type ContentNode,
  type SearchResult,
  type Segment,
  type VerseText,
} from "@/lib/schemas";

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

// ── Chapter normalisation ─────────────────────────────────────────

const HEADING_STYLES = new Set(["s", "s1", "s2", "s3", "ms", "ms1", "mr", "d", "sp", "qa"]);
const POETRY_STYLE = /^q\d?$|^qc$|^qr$|^pi\d?$/;

function plainText(node: ContentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.items ?? []).map(plainText).join("");
}

/** Walks a paragraph's items, emitting verse-tagged text segments in order. */
function collectSegments(items: ContentNode[], out: Segment[], pending: { number: string | null }): void {
  for (const item of items) {
    if (item.type === "tag" && item.name === "verse") {
      const number = item.attrs?.number;
      pending.number = typeof number === "string" ? number : null;
      continue;
    }
    if (item.type === "tag" && item.name === "note") continue;
    if (item.type === "text") {
      const verseId = typeof item.attrs?.verseId === "string" ? item.attrs.verseId : null;
      // KJV marks paragraph starts with a pilcrow; paragraphs are already structural here.
      const text = (item.text ?? "").replace(/¶\s*/g, "");
      if (!text) continue;
      out.push({ verseId, verseNumber: pending.number, text });
      pending.number = null;
      continue;
    }
    if (item.items) collectSegments(item.items, out, pending);
  }
}

function normaliseChapter(content: ContentNode[]): Block[] {
  const blocks: Block[] = [];
  const pending = { number: null as string | null };
  for (const node of content) {
    const style = typeof node.attrs?.style === "string" ? node.attrs.style : "";
    if (HEADING_STYLES.has(style)) {
      const text = plainText(node).trim();
      if (text) blocks.push({ kind: "heading", text });
      continue;
    }
    if (style === "r") {
      const text = plainText(node).trim();
      if (text) blocks.push({ kind: "crossref", text });
      continue;
    }
    const segments: Segment[] = [];
    collectSegments(node.items ?? [], segments, pending);
    if (segments.length > 0) blocks.push({ kind: "para", poetry: POETRY_STYLE.test(style), segments });
  }
  return blocks;
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

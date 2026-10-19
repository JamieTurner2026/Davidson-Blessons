import { z } from "zod";

// API.Bible JSON content is a recursive USX-like tree: tags with `items`, and text
// leaves that carry `attrs.verseId`. Kept permissive — we only read what we need.
export interface ContentNode {
  type: string;
  name?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  items?: ContentNode[];
}

export const contentNodeSchema: z.ZodType<ContentNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    name: z.string().optional(),
    text: z.string().optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    items: z.array(contentNodeSchema).optional(),
  }),
);

const metaSchema = z.object({ fumsToken: z.string().optional() }).optional();

const neighbourSchema = z.object({ id: z.string() }).optional();

export const chapterResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    reference: z.string(),
    copyright: z.string(),
    content: z.array(contentNodeSchema),
    next: neighbourSchema,
    previous: neighbourSchema,
  }),
  meta: metaSchema,
});

export const verseResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    reference: z.string(),
    content: z.string(),
    copyright: z.string(),
  }),
  meta: metaSchema,
});

export const searchResponseSchema = z.object({
  data: z.object({
    query: z.string(),
    total: z.number().optional().default(0),
    verses: z
      .array(
        z.object({
          id: z.string(),
          reference: z.string(),
          text: z.string(),
        }),
      )
      .optional()
      .default([]),
  }),
  meta: metaSchema,
});

// ── Normalised shapes the UI renders ──────────────────────────────

export interface Segment {
  verseId: string | null;
  /** Set on the first segment of a verse so the number renders once. */
  verseNumber: string | null;
  text: string;
}

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "crossref"; text: string }
  | { kind: "para"; poetry: boolean; segments: Segment[] };

export interface Chapter {
  id: string;
  reference: string;
  copyright: string;
  blocks: Block[];
  fumsToken: string | null;
}

export interface VerseText {
  id: string;
  reference: string;
  text: string;
  copyright: string;
  fumsToken: string | null;
}

export interface SearchHit {
  id: string;
  reference: string;
  text: string;
}

export interface SearchResult {
  total: number;
  hits: SearchHit[];
  fumsToken: string | null;
}

// Query params accepted by /api/search
export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  t: z.string().min(1).max(10),
  offset: z.coerce.number().int().min(0).max(1000).default(0),
});

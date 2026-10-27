// Pure API.Bible JSON → Block[] normalisation. No network and no secrets, so scripts
// (scripts/check-rounds.ts) can run the exact pipeline the app uses.

import type { Block, ContentNode, Segment } from "@/lib/schemas";

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

export function normaliseChapter(content: ContentNode[]): Block[] {
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

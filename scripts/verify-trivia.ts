// Dev-only: checks the curated bank against the actual BSB text.
//   npx tsx scripts/verify-trivia.ts
// FAIL = must fix (bad ref, or a who-said quote that isn't in the verse).
// WARN = review by hand (answer word not literally in the verse — may still be right).

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PAIRS, TIMELINES, TRIVIA, WHO_SAID } from "../data/trivia";
import { parseVerseId } from "../lib/canon";

const BSB = "bba9f40183526463-01";

function apiKey(): string {
  const env = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  const match = env.match(/^API_BIBLE_KEY=(.+)$/m);
  if (!match) throw new Error("API_BIBLE_KEY missing from .env.local");
  return match[1].trim();
}

function norm(text: string): string {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
}

function significant(text: string): string[] {
  return norm(text)
    .split(" ")
    .filter((word) => word.length >= 4);
}

async function fetchVerse(key: string, ref: string): Promise<string> {
  const url = `https://rest.api.bible/v1/bibles/${BSB}/verses/${ref}?content-type=text&include-notes=false&include-titles=false&include-verse-numbers=false`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { headers: { "api-key": key } });
    if (response.ok) {
      const json: unknown = await response.json();
      if (typeof json === "object" && json !== null && "data" in json) {
        const data = (json as { data: { content?: unknown } }).data; // API.Bible verse envelope
        if (typeof data.content === "string") return data.content;
      }
      throw new Error(`Unexpected response for ${ref}`);
    }
    if (response.status === 404) throw new Error(`404 ${ref}`);
    await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
  }
  throw new Error(`Failed to fetch ${ref}`);
}

async function main(): Promise<void> {
  const key = apiKey();
  const refs = new Set<string>([
    ...TRIVIA.map((item) => item.ref),
    ...WHO_SAID.map((item) => item.ref),
    ...PAIRS.map((item) => item.ref),
    ...TIMELINES.flatMap((item) => item.events.map((event) => event.ref)),
  ]);
  const failures: string[] = [];
  const warnings: string[] = [];

  for (const ref of refs) if (!parseVerseId(ref)) failures.push(`bad ref ${ref}`);

  const texts = new Map<string, string>();
  const queue = [...refs].filter((ref) => parseVerseId(ref));
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length > 0) {
      const ref = queue.shift();
      if (!ref) break;
      try {
        texts.set(ref, norm(await fetchVerse(key, ref)));
      } catch (error) {
        failures.push(`${ref}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  await Promise.all(workers);

  for (const item of WHO_SAID) {
    const verse = texts.get(item.ref);
    if (!verse) continue;
    const keys = significant(item.quote);
    const hits = keys.filter((word) => verse.includes(word)).length;
    if (keys.length > 0 && hits / keys.length < 0.7) {
      failures.push(`WHO ${item.ref} "${item.quote}" (${hits}/${keys.length})\n     BSB: ${verse}`);
    }
  }
  for (const item of TRIVIA) {
    const verse = texts.get(item.ref);
    if (!verse) continue;
    const keys = significant(item.a);
    if (keys.length > 0 && !keys.some((word) => verse.includes(word))) {
      warnings.push(`TRIVIA ${item.ref} "${item.q}" → "${item.a}"\n     BSB: ${verse}`);
    }
  }
  for (const item of PAIRS) {
    const verse = texts.get(item.ref);
    if (!verse) continue;
    const keys = [...significant(item.left), ...significant(item.right)];
    if (keys.length > 0 && !keys.some((word) => verse.includes(word))) {
      warnings.push(`PAIR ${item.ref} ${item.left} ↔ ${item.right}\n     BSB: ${verse}`);
    }
  }

  console.log(`Checked ${refs.size} verses · ${TRIVIA.length} trivia · ${WHO_SAID.length} who · ${PAIRS.length} pairs · ${TIMELINES.length} timelines`);
  warnings.forEach((warning) => console.log(`WARN ${warning}`));
  failures.forEach((failure) => console.log(`FAIL ${failure}`));
  console.log(`${failures.length} failures, ${warnings.length} warnings`);
  process.exitCode = failures.length > 0 ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

// Dev-only: checks the curated bank against the actual BSB text.
//   npx tsx scripts/verify-trivia.ts
// FAIL = must fix (bad ref, or a who-said quote that isn't in the verse).
// WARN = review by hand (answer word not literally in the verse — may still be right, or a
//        wrong option that the cited verse seems to support).
// Also checks the daily "Which book?" pool: no verse may name its own book, and none may
// have a near-identical twin in another book of the same testament.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { QUIZ_POOL } from "../data/quiz";
import { PAIRS, TIMELINES, TRIVIA, WHO_SAID } from "../data/trivia";
import { getBook, parseVerseId } from "../lib/canon";
import { namesItsBook } from "../lib/giveaway";

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

const NUMBER_WORDS = new Set(["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "twelve", "forty", "hundred", "thousand"]);

/** Words worth checking: 4+ letters, any number, or a number word ("ten", "six"). */
function significant(text: string): string[] {
  return norm(text)
    .split(" ")
    .filter((word) => word.length >= 4 || /^\d+$/.test(word) || NUMBER_WORDS.has(word));
}

/** Whole-word match on normalised text — "seven" must not match "seventy". */
function hasWord(normalisedVerse: string, word: string): boolean {
  return ` ${normalisedVerse} `.includes(` ${word} `) || ` ${normalisedVerse} `.includes(` ${word}'s `);
}

/** A wrong option the cited verse seems to support (every significant word appears in it). */
function supportedWrong(normalisedVerse: string, wrong: ReadonlyArray<string>, answer: string): string | undefined {
  const answerWords = new Set(significant(answer));
  return wrong.find((option) => {
    const keys = significant(option).filter((word) => !answerWords.has(word));
    return keys.length > 0 && keys.every((word) => hasWord(normalisedVerse, word));
  });
}

interface SearchHit {
  id: string;
  text: string;
}

async function searchBsb(key: string, query: string): Promise<SearchHit[]> {
  const url = `https://rest.api.bible/v1/bibles/${BSB}/search?${new URLSearchParams({ query, limit: "20" }).toString()}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { headers: { "api-key": key } });
    if (response.ok) {
      const json = (await response.json()) as { data?: { verses?: SearchHit[] } }; // API.Bible search envelope
      return json.data?.verses ?? [];
    }
    await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
  }
  throw new Error(`Search failed for "${query}"`);
}

/** Share of `a`'s distinct significant words that also appear in `b`. */
function overlap(a: string, b: string): number {
  const keys = [...new Set(significant(a))];
  if (keys.length === 0) return 0;
  const other = norm(b);
  return keys.filter((word) => hasWord(other, word)).length / keys.length;
}

/** Near-identical both ways — "Jesus wept" is not a twin of "Peter … wept bitterly". */
function isTwin(a: string, b: string): boolean {
  return Math.min(overlap(a, b), overlap(b, a)) >= 0.75;
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
    ...QUIZ_POOL,
  ]);
  const failures: string[] = [];
  const warnings: string[] = [];

  for (const ref of refs) if (!parseVerseId(ref)) failures.push(`bad ref ${ref}`);

  const texts = new Map<string, string>();
  const rawTexts = new Map<string, string>();
  const queue = [...refs].filter((ref) => parseVerseId(ref));
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length > 0) {
      const ref = queue.shift();
      if (!ref) break;
      try {
        const raw = await fetchVerse(key, ref);
        texts.set(ref, norm(raw));
        rawTexts.set(ref, raw.replace(/\s+/g, " ").trim());
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
    const hits = keys.filter((word) => hasWord(verse, word)).length;
    if (keys.length > 0 && hits / keys.length < 0.7) {
      failures.push(`WHO ${item.ref} "${item.quote}" (${hits}/${keys.length})\n     BSB: ${verse}`);
    }
  }
  for (const item of TRIVIA) {
    const verse = texts.get(item.ref);
    if (!verse) continue;
    const keys = significant(item.a);
    if (keys.length > 0 && !keys.some((word) => hasWord(verse, word))) {
      warnings.push(`TRIVIA ${item.ref} "${item.q}" → "${item.a}"\n     BSB: ${verse}`);
    }
    const trap = supportedWrong(verse, item.wrong, item.a);
    if (trap) warnings.push(`TRIVIA ${item.ref} wrong option "${trap}" appears in the cited verse — is it really wrong?\n     BSB: ${verse}`);
  }
  for (const item of WHO_SAID) {
    const verse = texts.get(item.ref);
    if (!verse) continue;
    const trap = supportedWrong(verse, item.wrong, item.a);
    if (trap) warnings.push(`WHO ${item.ref} wrong option "${trap}" appears in the cited verse — could they have said it?\n     BSB: ${verse}`);
  }
  for (const item of PAIRS) {
    const verse = texts.get(item.ref);
    if (!verse) continue;
    const keys = [...significant(item.left), ...significant(item.right)];
    if (keys.length > 0 && !keys.some((word) => hasWord(verse, word))) {
      warnings.push(`PAIR ${item.ref} ${item.left} ↔ ${item.right}\n     BSB: ${verse}`);
    }
  }

  // Daily "Which book?" pool.
  for (const ref of QUIZ_POOL) {
    const raw = rawTexts.get(ref);
    const place = parseVerseId(ref);
    if (!raw || !place) continue;
    if (namesItsBook(raw, place.bookId)) failures.push(`QUIZ ${ref} names its own book\n     BSB: ${raw}`);
    const testament = getBook(place.bookId)?.testament;
    const query = significant(raw).slice(0, 6).join(" ");
    try {
      const twins = (await searchBsb(key, query)).filter((hit) => {
        const other = parseVerseId(hit.id);
        return other !== null && other.bookId !== place.bookId && getBook(other.bookId)?.testament === testament && isTwin(raw, hit.text);
      });
      if (twins.length > 0) failures.push(`QUIZ ${ref} has a near-identical twin: ${twins.map((hit) => hit.id).join(", ")}\n     BSB: ${raw}`);
    } catch (error) {
      warnings.push(`QUIZ ${ref} twin search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`Checked ${refs.size} verses · ${TRIVIA.length} trivia · ${WHO_SAID.length} who · ${PAIRS.length} pairs · ${TIMELINES.length} timelines · ${QUIZ_POOL.length} quiz verses`);
  warnings.forEach((warning) => console.log(`WARN ${warning}`));
  failures.forEach((failure) => console.log(`FAIL ${failure}`));
  console.log(`${failures.length} failures, ${warnings.length} warnings`);
  process.exitCode = failures.length > 0 ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

// Dev-only: generates every lesson/challenge round for a spread of real chapters and
// checks each one is well-formed. Uses the same normalisation as the app.
//   npx tsx scripts/check-rounds.ts
// FAIL = a round a player could see that is broken or unfair.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { TRANSLATIONS } from "../lib/bibles";
import { generateChallenge, generateRounds, segmentVerses, versesFromBlocks, words, type ChapterVerse, type Question } from "../lib/challenge";
import { normaliseChapter } from "../lib/normalise";
import { chapterResponseSchema } from "../lib/schemas";

// Chosen for edge cases: em dashes (GEN.1), a word repeated 3× (GEN.1.27), huge (PSA.119),
// tiny (PSA.117, one-chapter books), genealogies (1CH.1), repetition (NUM.7), poetry, KJV ¶.
const CHAPTERS = [
  "GEN.1", "GEN.22", "EXO.20", "NUM.7", "DEU.5", "RUT.1", "1SA.17", "1CH.1", "NEH.8", "EST.8",
  "JOB.38", "PSA.23", "PSA.117", "PSA.119", "PRO.31", "SNG.2", "ISA.53", "LAM.3", "OBA.1", "JON.2",
  "MAT.5", "MRK.4", "LUK.15", "JHN.3", "JHN.11", "ACT.16", "ROM.8", "HEB.11", "PHM.1", "3JN.1", "JUD.1", "REV.21",
];
const TRANSLATION_SLUGS = ["bsb", "niv", "kjv"];
const ATTEMPTS = 12;

function apiKey(): string {
  const env = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  const match = env.match(/^API_BIBLE_KEY=(.+)$/m);
  if (!match) throw new Error("API_BIBLE_KEY missing from .env.local");
  return match[1].trim();
}

async function fetchVerses(key: string, apiId: string, chapterId: string): Promise<ChapterVerse[]> {
  const params = new URLSearchParams({
    "content-type": "json",
    "include-notes": "false",
    "include-titles": "true",
    "include-chapter-numbers": "false",
    "include-verse-numbers": "true",
    "include-verse-spans": "false",
  });
  const url = `https://rest.api.bible/v1/bibles/${apiId}/chapters/${chapterId}?${params.toString()}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { headers: { "api-key": key } });
    if (response.ok) {
      const parsed = chapterResponseSchema.parse(await response.json());
      return versesFromBlocks(normaliseChapter(parsed.data.content));
    }
    await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
  }
  throw new Error(`Failed to fetch ${chapterId}`);
}

/** A run joined without its space: "water.”So", "life,and". */
const JOINED = /[a-z][.,;:!?’”][A-Z]|[a-z][,;:][a-z]/;

function problems(question: Question): string[] {
  const found: string[] = [];
  if (question.kind === "order") {
    if (new Set(question.items).size !== question.items.length) found.push("duplicate order items");
    return found;
  }
  if (question.kind === "match") {
    if (new Set(question.pairs.map((pair) => pair.right)).size !== question.pairs.length) found.push("duplicate match endings");
    if (question.pairs.some((pair) => /^Verse \d+$/.test(pair.left))) found.push("match uses verse numbers");
    return found;
  }
  const { options, answer, clue } = question;
  if (options.length < 3) found.push(`only ${options.length} options`);
  if (answer < 0 || answer >= options.length) found.push("answer index out of range");
  if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) found.push("duplicate options");
  if ([clue, ...options].some((text) => JOINED.test(text))) found.push(`joined words in "${[clue, ...options].find((text) => JOINED.test(text))}"`);
  if (question.kind === "blank") {
    if (!clue.includes("_____")) found.push("blank clue has no blank");
    const answerWord = options[answer]?.toLowerCase() ?? "";
    if (words(clue.toLowerCase()).some((word) => word.replace(/[^\p{L}'’-]/gu, "") === answerWord)) found.push(`answer "${answerWord}" still visible in clue`);
    const caps = new Set(options.map((option) => /^\p{Lu}/u.test(option)));
    if (caps.size > 1) found.push("blank options mix capitalisation");
  }
  if ((question.kind === "finish" || question.kind === "next") && new Set(options.map((option) => option.endsWith("…"))).size > 1) {
    found.push("inconsistent … across options");
  }
  return found;
}

async function main(): Promise<void> {
  const key = apiKey();
  const failures = new Map<string, string>();
  const kinds = new Map<string, number>();
  const optionCounts = new Map<number, number>();
  let rounds = 0;

  for (const slug of TRANSLATION_SLUGS) {
    const translation = TRANSLATIONS.find((entry) => entry.slug === slug);
    if (!translation) throw new Error(`unknown translation ${slug}`);
    for (const chapterId of CHAPTERS) {
      let verses: ChapterVerse[];
      try {
        verses = await fetchVerses(key, translation.apiId, chapterId);
      } catch (error) {
        failures.set(`${slug} ${chapterId}`, error instanceof Error ? error.message : String(error));
        continue;
      }
      const runs: Array<{ where: string; questions: Question[] }> = [];
      for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
        runs.push({ where: `challenge#${attempt}`, questions: generateChallenge(chapterId, verses, attempt) });
        segmentVerses(verses).forEach((segment, index) => {
          runs.push({ where: `card${index + 1}#${attempt}`, questions: generateRounds(`${chapterId}:${index}#${attempt}`, segment, 2) });
        });
      }
      for (const { where, questions } of runs) {
        for (const question of questions) {
          rounds += 1;
          kinds.set(question.kind, (kinds.get(question.kind) ?? 0) + 1);
          if ("options" in question) optionCounts.set(question.options.length, (optionCounts.get(question.options.length) ?? 0) + 1);
          for (const problem of problems(question)) {
            const id = `${slug} ${chapterId} ${question.kind}: ${problem}`;
            if (!failures.has(id)) failures.set(id, `${where} · ${"clue" in question ? question.clue.slice(0, 90) : question.prompt}`);
          }
        }
      }
    }
  }

  for (const [id, sample] of failures) console.log(`FAIL ${id}\n     ${sample}`);
  console.log(`\n${rounds} rounds · kinds ${JSON.stringify(Object.fromEntries(kinds))} · options ${JSON.stringify(Object.fromEntries(optionCounts))}`);
  console.log(`${failures.size} distinct failures`);
  if (failures.size > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

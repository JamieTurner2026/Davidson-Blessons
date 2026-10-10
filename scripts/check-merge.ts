// Dev-only: checks the account merge rules (lib/merge.ts) on two devices with different progress.
//   npx tsx scripts/check-merge.ts

import { mergeStudy, stableStringify } from "../lib/merge";
import { salvageStudy, type StudyState } from "../lib/study-store";

function state(partial: Record<string, unknown>): StudyState {
  return salvageStudy(partial);
}

const phone = state({
  xp: 30,
  oil: 6,
  days: {
    "2026-10-08": { xp: 10, by: { chapter: 10 }, chapters: ["JHN.1"] },
    "2026-10-09": { xp: 20, by: { chapter: 20 }, chapters: ["JHN.2", "JHN.3"] },
  },
  chaptersRead: { "JHN.1": "2026-10-08T10:00:00Z", "JHN.2": "2026-10-09T10:00:00Z", "JHN.3": "2026-10-09T11:00:00Z" },
  stars: { "JHN.1": 3, "JHN.2": 1 },
  badges: { "first-light": "2026-10-08T10:00:00Z" },
  highlights: { "JHN.3.16": { createdAt: "2026-10-09T11:00:00Z" } },
  memory: {
    "JHN.3.16": { reference: "John 3:16", text: "For God so loved", translation: "bsb", verseIds: ["JHN.3.16"], box: 3, due: "2026-10-12", addedAt: "2026-10-09T11:00:00Z" },
  },
  owned: ["lamp-brass"],
  translation: "niv",
});

const laptop = state({
  xp: 25,
  oil: 9,
  days: {
    "2026-10-09": { xp: 15, by: { chapter: 10, highlight: 5 }, chapters: ["GEN.1"] },
    "2026-10-10": { xp: 10, by: { chapter: 10 }, chapters: ["GEN.2"] },
  },
  chaptersRead: { "JHN.1": "2026-10-07T09:00:00Z", "GEN.1": "2026-10-09T09:00:00Z", "GEN.2": "2026-10-10T09:00:00Z" },
  stars: { "JHN.2": 3, "GEN.1": 2 },
  badges: { kindled: "2026-10-10T09:00:00Z" },
  memory: {
    "JHN.3.16": { reference: "John 3:16", text: "For God so loved", translation: "bsb", verseIds: ["JHN.3.16"], box: 1, due: "2026-10-10", addedAt: "2026-10-09T08:00:00Z" },
    "PSA.23.1": { reference: "Psalm 23:1", text: "The LORD is my shepherd", translation: "bsb", verseIds: ["PSA.23.1"], box: 1, due: "2026-10-10", addedAt: "2026-10-10T09:00:00Z" },
  },
  owned: ["paper-linen"],
  translation: "bsb",
});

const failures: string[] = [];
function expect(label: string, actual: unknown, wanted: unknown): void {
  const ok = stableStringify(actual) === stableStringify(wanted);
  process.stdout.write(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : ` — got ${stableStringify(actual)}, wanted ${stableStringify(wanted)}`}\n`);
  if (!ok) failures.push(label);
}

const merged = mergeStudy(phone, laptop);
expect("chapters are the union", Object.keys(merged.chaptersRead).sort(), ["GEN.1", "GEN.2", "JHN.1", "JHN.2", "JHN.3"]);
expect("first-read time is the earliest", merged.chaptersRead["JHN.1"], "2026-10-07T09:00:00Z");
expect("stars keep the best per chapter", merged.stars, { "GEN.1": 2, "JHN.1": 3, "JHN.2": 3 });
expect("badges from both devices", Object.keys(merged.badges).sort(), ["first-light", "kindled"]);
expect("a shared day keeps the larger XP and all chapters", merged.days["2026-10-09"], { xp: 20, by: { chapter: 20, highlight: 5 }, chapters: ["GEN.1", "JHN.2", "JHN.3"] });
expect("XP equals the sum of merged days", merged.xp, 10 + 20 + 10);
expect("memory verses from both devices", Object.keys(merged.memory).sort(), ["JHN.3.16", "PSA.23.1"]);
expect("cosmetics owned on either device", merged.owned, ["lamp-brass", "paper-linen"]);
expect("this device keeps its translation", merged.translation, "niv");
expect("idempotent: merging again changes nothing", stableStringify(mergeStudy(phone, merged)), stableStringify(merged));
expect("order of the shared fields doesn't matter", stableStringify({ ...mergeStudy(laptop, phone), translation: "niv", equipped: merged.equipped, sound: merged.sound, combo: merged.combo, lastRead: merged.lastRead }), stableStringify(merged));
expect("merging with an empty account keeps everything", stableStringify(mergeStudy(phone, state({}))), stableStringify(phone));

process.stdout.write(`\n${failures.length} failures\n`);
if (failures.length > 0) process.exitCode = 1;

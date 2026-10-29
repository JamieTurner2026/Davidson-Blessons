// Dev-only: checks the progress transfer codes (lib/transfer.ts) round-trip and reject bad text.
//   npx tsx scripts/check-transfer.ts

import { mergeStudy } from "../lib/merge";
import { salvageStudy } from "../lib/study-store";
import { decodeProgress, encodeProgress } from "../lib/transfer";

let failures = 0;
function check(name: string, ok: boolean): void {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) failures += 1;
}

async function main(): Promise<void> {
  const json = JSON.stringify({ chaptersRead: { "JHN.1": "2026-10-08T10:00:00Z" }, journal: { "JHN.1": { text: "héllo ✝", updatedAt: "2026-10-08T10:00:00Z" } } });
  const code = await encodeProgress(json);
  check("code starts with DB1:", code.startsWith("DB1:"));
  check("code is plain url-safe text", /^[A-Za-z0-9_:-]+$/.test(code));
  check("round trip keeps the JSON (including non-ASCII)", (await decodeProgress(code)) === json);
  check("round trip survives pasted whitespace and line breaks", (await decodeProgress(` ${code.slice(0, 20)}\n${code.slice(20)} `)) === json);
  const big = JSON.stringify({ notes: "x".repeat(300_000) });
  check("a large state still round-trips", (await decodeProgress(await encodeProgress(big))) === big);
  check("rejects text without a prefix", (await decodeProgress("hello world")) === null);
  check("rejects an empty string", (await decodeProgress("   ")) === null);
  check("rejects corrupted data", (await decodeProgress("DB1:not-valid-gzip")) === null);
  check("rejects non-url-safe characters", (await decodeProgress("DB1:ab$cd")) === null);
  check("rejects an oversize code", (await decodeProgress("DB0:" + "A".repeat(2_000_001))) === null);

  const here = salvageStudy({ chaptersRead: { "JHN.2": "2026-10-09T10:00:00Z" } });
  const there = salvageStudy({ chaptersRead: { "JHN.1": "2026-10-08T10:00:00Z" } });
  const merged = mergeStudy(here, there);
  check("merging keeps progress from both devices", Boolean(merged.chaptersRead["JHN.1"]) && Boolean(merged.chaptersRead["JHN.2"]));

  console.log(failures === 0 ? "\n0 failures" : `\n${failures} failures`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();

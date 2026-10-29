// Dev-only: checks the username + password helpers (lib/username.ts).
//   npx tsx scripts/check-username.ts

import { displayName, isUsernameAccount, normalizeUsername, usernameToEmail, validatePassword, validateUsername } from "../lib/username";

let failures = 0;
function check(name: string, ok: boolean): void {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) failures += 1;
}

check("normalises case and spaces", normalizeUsername("  Alex.R ") === "alex.r");
check("accepts a normal username", validateUsername("alex_r-1") === null);
check("accepts mixed case (normalised)", validateUsername("Grace") === null);
check("rejects too short", validateUsername("ab") !== null);
check("rejects too long", validateUsername("a".repeat(25)) !== null);
check("rejects spaces", validateUsername("two words") !== null);
check("rejects an @ sign (no real emails)", validateUsername("me@example.com") !== null);
check("rejects a leading dot", validateUsername(".alex") !== null);
check("rejects non-latin symbols", validateUsername("ål✝x") !== null);
check("email form is lower case and on the reserved domain", usernameToEmail("Alex") === "alex@users.davison-blesson.invalid");
check("recognises username accounts", isUsernameAccount("alex@users.davison-blesson.invalid") && !isUsernameAccount("alex@gmail.com"));
check("displayName strips the made-up domain", displayName("alex@users.davison-blesson.invalid") === "alex");
check("displayName keeps real emails", displayName("alex@gmail.com") === "alex@gmail.com");
check("displayName handles null", displayName(null) === null);
check("rejects a 7-character password", validatePassword("1234567") !== null);
check("accepts an 8-character password", validatePassword("12345678") === null);
check("rejects a password over 72 bytes", validatePassword("a".repeat(73)) !== null);
check("counts bytes, not characters", validatePassword("é".repeat(37)) !== null);

console.log(failures === 0 ? "\n0 failures" : `\n${failures} failures`);
process.exit(failures === 0 ? 0 : 1);

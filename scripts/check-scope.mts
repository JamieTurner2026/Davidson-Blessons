// Dev-only: checks that each signed-in reader gets their own saved progress on a shared browser
// (lib/study-store.ts setStudyScope / forgetLocalStudy), using a stand-in for localStorage.
//   npx tsx scripts/check-scope.mts

// Fake browser storage, then exercise per-person progress in the real store.
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  },
  addEventListener() {}, removeEventListener() {},
};
const s = await import("../lib/study-store");
let failures = 0;
const check = (name: string, ok: boolean) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failures++; };

// Progress saved before sign-in was required (legacy key).
store.set("selah:v1", JSON.stringify({ xp: 40, chaptersRead: { "JHN.1": "2026-10-01T00:00:00Z" } }));

check("signed out: nothing loaded", s.currentStudy().xp === 0);
s.setJournal("JHN.3", "written while signed out");
check("signed out: nothing saved to storage", [...store.keys()].every((k) => !k.includes(":user:")));

s.setStudyScope("alice");
check("first account claims the old progress", s.currentStudy().xp === 40);
check("old key removed after claim", !store.has("selah:v1"));
s.setJournal("JHN.3", "Alice's reflection");
check("Alice's journal saved under her key", (store.get("selah:v1:user:alice") ?? "").includes("Alice's reflection"));

s.setStudyScope(null);
s.setStudyScope("bob");
check("Bob starts fresh (no XP)", s.currentStudy().xp === 0);
check("Bob can't see Alice's journal", !s.currentStudy().journal["JHN.3"]);
s.setJournal("JHN.3", "Bob's reflection");

s.setStudyScope("alice");
check("Alice's progress is intact", s.currentStudy().journal["JHN.3"]?.text === "Alice's reflection" && s.currentStudy().xp === 40);

s.forgetLocalStudy("alice");
check("sign-out clears Alice's copy from the browser", !store.has("selah:v1:user:alice"));
check("Bob's copy untouched", (store.get("selah:v1:user:bob") ?? "").includes("Bob's reflection"));
console.log(failures ? `${failures} failures` : "0 failures");

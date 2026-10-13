# Decisions

## 2026-10-04 — v1 build

- **Standalone app, not Davidson Blessons.** Separate repo/deploy; Davidson's static-build architecture is untouched.
- **Next.js server proxy for API.Bible.** Server Components fetch chapters directly; one route handler (`/api/search`) serves client search. Key never reaches the browser. Fetches use `next.revalidate` (chapters/verses 24h, search 1h) because scripture text doesn't change — saves quota.
- **JSON content, normalised server-side.** API.Bible `content-type=json` tags each text run with `verseId`; we flatten it to `heading | crossref | para(segments)` so the client renders without knowing USX.
- **Static canon.** 66-book table drives the picker, prev/next, and ID validation without API calls.
- **Translations:** BSB (default, public domain), NIV, KJV, WEB, ASV, LSV. NIV requires the copyright line + FUMS.
- **FUMS v3** (`https://pkg.api.bible/fumsV3.min.js`, `fums("trackView", token)`), queued via `window.fumsData` until the script loads.
- **localStorage for study data**, versioned key `selah:v1`, Zod-validated on read, JSON export/import. Highlights keyed by verse ID so they follow you across translations.
- **Single highlight colour** (marigold wash) — keeps Woset's one-accent rule.
- **Scripture at 19px/1.6** — deliberate deviation from Woset's 15px body for long-form reading (approved in plan).
- **Magnific art:** Recraft V4.1, hero generated ×2 → best used as style reference for 8 division images (~600 credits). Post-processed: paper tone remapped to `#e5e7eb` with a feathered snap so images have no visible edge on the page.
- **Revelation art regenerated** with seven lampstands (Rev 1:12–20); first pass had six.
- **Highlight group toggle:** selecting several verses and tapping Highlight highlights all of them unless every one is already highlighted, in which case it clears them all (existing timestamps kept).
- **Verse of the day:** same verse for everyone; rolls over at midnight America/New_York; walks the pool by continuous day count so there's no reset every 1 January.

## 2026-10-04 — v2: gentle gamification + animation

- **Principle: encourage, never punish.** Research: streaks are Duolingo's #1 retention lever, but a study of a gamified Bible app found streaks caused anxiety and broke when people read a paper Bible. So: one rest day per rolling 7 days never breaks a streak; "I read a paper Bible today" check-in counts; no leaderboards; warm copy.
- **Game rules live in `lib/game.ts` (pure).** XP table with daily caps (highlight 10, note 25, plan-day 45, memory 50, quiz once, check-in once) so nothing can be farmed by toggling. Daily goal 20 XP. 8 growth levels Seed → Cedar of Lebanon.
- **Chapter "read" = end of chapter on screen AND ≥20 s on the page** (IntersectionObserver + timer) — skimming doesn't count.
- **Single write path `mutate()` in `lib/study-store.ts`** applies XP, re-evaluates all badges, and diffs before/after to queue celebrations (xp toast, daily goal, book complete, level-up, badges). Celebrations are an in-memory queue (`lib/celebrations.ts`), never persisted.
- **Storage stays `selah:v1`**; v2 fields have Zod defaults so v1 data loads unchanged (verified in browser).
- **Memory: Leitner boxes** — promoted into box 2/3/4/5 waits 1/2/4/8 days; box 6 = mastered (+16 days refresh). Modes harden by box: scramble (phrase-chunked for long verses) → fill-in-blanks (≥80% to pass) → first-letter typing (handles multi-char input for paste/autocorrect). Wrong drops one box.
- **Daily quiz** "Which book?" — server-picked, same for everyone per New York day, 3 same-testament distractors, deterministic seed.
- **Animation: GSAP 3.15 + @gsap/react** (`useGSAP` for cleanup, SplitText headline, Physics2D confetti). All motion behind `gsap.matchMedia()` reduced-motion checks. Approved deviation from Woset's "quiet colour-only motion"; still no shadows/gradients, marigold the only filled accent, confetti uses only marigold/ink/ash.
- **12 Magnific badge medallions** (Recraft V4.1, hero as style reference, ~780 credits incl. one redo). Recraft can't count small repeated items (Perfect Week came back with 8 then 6 stars) — fixed in post by re-laying 7 copies of one star along the arc. Badges normalised to the drawn circle and paper-tinted to Pebble.
- **Gotcha:** `.ring` is a Tailwind utility (draws an outline) — our class is `.goal-ring`. Avoid Tailwind utility names for custom classes.

## 2026-10-04 — v3 + v3.1: the journey & games

- **Journey map is the spine.** Each book = a journey, each chapter = a stop (`components/map/Trail.tsx`). Stops open **lessons**; scripture is never locked — any chapter can be read or played any time.
- **Pilgrim avatar** — a Black man of African descent, drawn in four life stages that follow your level (Seedream 5 Pro, stage 1 as image reference for face consistency; backgrounds removed). Lamb/dove companions from the Workshop.
- **Lessons** (`/lesson/...`): chapter split into ≤4 passage cards, each followed by 1–2 rounds generated from those verses (finish the verse, what comes next, put in order, fill the blank, verse match) plus up to 2 curated bank questions for that chapter. Stars by accuracy (≥60% → 2★, ≥90% → 3★). The lesson itself marks the chapter read (no 20-s rule).
- **Curated bank** (`data/trivia.ts`, ~210 items: trivia, who-said-it, pairs, timelines), each tied to a BSB verse. `scripts/verify-trivia.ts` checks every ref and that who-said quotes appear in the verse (0 failures; warnings reviewed by hand).
- **Play hub** (`/play`): Trivia, Memory match, Order up, Lightning round (60 s), Daily mix (same 8 for everyone per day), and **checkpoints** every 5 stops. Seeds derive from play counts — no randomness during render.
- **Economy**: oil = 1 per 5 XP + 3 per star (+5/star at checkpoints) + treasure verses (+15) + search hunt (+10). Workshop sells lamps, confetti sets, reading paper, companions. All XP sources capped daily; `game` XP cap 60/day verified.
- **Bonuses**: reading combo (x2 from 3 chapters in 45-min gaps, x3 from 5), Lord's Day double XP on Sundays (multipliers applied after caps).
- **Sound**: 7 Magnific/ElevenLabs effects in `public/sfx`, mute toggle in the nav (persisted).
- **Gotchas found while testing:**
  - GSAP merges a CSS `translate` on the element it animates into its own transform and lost `-100%` — keep CSS anchoring on a wrapper, animate an inner element (pilgrim).
  - Trail node pop-in uses a CSS keyframe, not a GSAP `from()` — the tween was being left half-finished.
  - Round SVG/position math (`Math.sin`) to 1 decimal so server and browser render identical HTML (hydration).
  - API.Bible JSON splits verses into runs that may lack a joining space — `versesFromBlocks` inserts one.
  - Hidden/background browser tabs pause `requestAnimationFrame`, freezing GSAP tweens — test animations in the foreground.

## 2026-10-06 — GitHub, sales page, deploy

- **GitHub:** private repo https://github.com/marleevison/selah (`main`), connected to Vercel — pushes to `main` auto-deploy.
- **Vercel:** project `marleevisons-projects/selah`, canonical URL **https://selah-rho-sable.vercel.app** (use this, not the per-deployment slug). `API_BIBLE_KEY` set as an encrypted Production env var; `.vercelignore` keeps `.env*` out of uploads.
- **Sales page** at `/welcome` (Woset style: split headline, the four pilgrim stages, feature cards, badge band, promises, CTA). No pricing claims — Selah is presented as free/no sign-up because nothing else has been decided. Linked from the footer ("About Selah").
- **Quiz fix:** removed NEH.8.10 from the daily-quiz pool (its text names Nehemiah, giving away the answer); replaced with NEH.1.4.

## 2026-10-09 — Audit and bug-fix pass

Full results: `docs/AUDIT-2026-10-09.md`. Decisions made:

- **Identity:** Selah is a game that teaches the Bible. The core loop is today's stop → short passage → play → stars. The next phase simplifies the site to four destinations (Today / Bible / Practice / Me).
- **Saved data is never discarded.** A value that fails Zod is copied to `selah:v1:backup:<day>`, then salvaged field by field (`salvageStudy`). Each record entry is checked by running the field's own schema on a one-entry object.
- **Round fairness rules (`lib/challenge.ts`):**
  - 4 options where the passage allows.
  - Finish and next options are cut to one length and all end in "…".
  - A blank hides only a word that appears once. It is split on dashes, replaced by token index, and the round is refused without `_____`.
  - Blank distractors share the answer's capitalization.
  - The match round joins beginnings to endings, not verse numbers.
- **`scripts/check-rounds.ts` is the regression test for generated rounds.** It covers 32 chapters × BSB/NIV/KJV × 12 attempts and must report 0. Normalization lives in `lib/normalise.ts` (no `server-only`) so scripts run the exact app pipeline.
- **Daily quiz:**
  - No verse that names its book (`lib/giveaway.ts`).
  - No twin in another book of the same testament; the verifier checks this through API search with two-way overlap.
  - Options come from the same section first. Gospel verses must be unique to their Gospel.
  - The quiz never matches the verse of the day.
- **Rewards follow reading:**
  - Chapter XP is capped at 50 base per day.
  - The goal is 10 XP (one chapter).
  - Reading ticks plan days and pays plan XP; manual ticks pay nothing.
  - From 2026-10-10 only study actions light a day. Earlier days keep "any XP" so no streak breaks.
  - Mastered verses refresh every 30 days.
- **Lessons:**
  - A 4–20 s reading pause before play, on the first attempt only.
  - A per-load seed through `useSyncExternalStore`, which avoids `Math.random()` in render.
  - "Who said it?" quotes only in BSB lessons.
  - Checkpoints ask only about the book being walked.
  - Lightning scores right − wrong.
- **Not changed, on purpose:** Leitner intervals were reported as off by one. Re-checked: they're correct (1/2/4/8, then 16).
- **Gotcha:** `"server-only"` throws under `tsx`, so pure parsing must live outside server modules for scripts to import it.

## 2026-10-10 — Plans and notes removed

- **Removed, by Mike's call (first simplification step):** reading plans (`/plans`, `data/plans.ts`, plan XP, Finisher badge) and notes (`/notes`, the reader's note editor, note XP, Scribe badge, quill sound). Highlights stay.
- **Backup/restore moved** to the Journey page (`components/BackupPanel.tsx`). Progress lives only in the browser, so this stays the one way to keep it.
- **Legacy `notes` field kept in the schema** so anything already written survives in backups instead of being silently stripped. `planProgress`/`activePlan` were dropped; Zod strips them on the next save.
- The badge count on Journey counts only badges that still exist.
- Nav is now Trail · Read · Play · Search | Memory (+ oil and streak icons).

## 2026-10-10 — Optional accounts with sync

- **Decided:**
  - Sign-in is **optional**, by **email link + Google**, on a new free Supabase project (`selah`, `gohyiyppobpqfxrsnlns`).
  - Selah keeps working fully signed out.
- **Browser-only auth:**
  - supabase-js with PKCE keeps the session in localStorage (`selah:auth`).
  - No `proxy.ts`, cookies or server session: no server code needs the user, and the Next 16 docs warn against Proxy as a session manager.
  - Tokens expire after 1 h and refresh rotates.
- **Data:**
  - `public.progress(user_id pk → auth.users, state jsonb, updated_at)`, with a size check and an object check.
  - RLS: owner-only for select/insert/update/delete. `anon` has no access.
  - A trigger sets `updated_at` on the server.
  - `ping()` exists for the keep-alive.
  - Advisors were clean. Owner-only access was verified by pretending to be two users in SQL.
- **Sync:**
  - localStorage stays the working copy.
  - Every pull merges (`mergeStudy`): union for fields that only grow, max for fields that only improve, XP = the sum of merged days (`applyAward` is the only XP writer), oil = max (cosmetics only), and preferences stay per device.
  - The merge is idempotent, checked by `scripts/check-merge.ts`.
  - Pushes are debounced 2 s after any write (`setWriteHook`) and flushed when the tab is hidden. A pull also runs on tab focus (throttled to 30 s).
- **Gotcha:** with PKCE, an email link only works in the browser that requested it. The UI says so.
- **Keep-alive:** a daily Vercel cron calls `/api/keepalive` → `ping()`, so the free project doesn't pause after 7 idle days.
- **Backup file kept** as a quieter option under "Your account".
- **2026-10-12:** Vercel env vars set (Production + Development). `resolveMemoryCard`: the copy due sooner wins, so a missed verse is never hidden; tie goes to the higher box. `namesItsBook`: case-sensitive whole word, numbered books match on the bare name, plus Psalm and Solomon.
- **Pending (Mike):** Supabase URL config, Google OAuth, Resend SMTP (`docs/RUNBOOKS.md` steps 1–3).

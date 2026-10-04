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

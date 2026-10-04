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

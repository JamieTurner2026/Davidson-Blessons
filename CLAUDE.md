@AGENTS.md

# Selah — Bible study web app

Next.js 16 (App Router) + TypeScript strict + Tailwind v4, styled with the **Woset** design system
(`~/.claude/skills/woset`). Scripture comes live from **API.Bible**; illustrations were generated with **Magnific**.

## Commands
- `npm run dev` — dev server (preview config `selah` in `~/Documents/Claude/.claude/launch.json`, port 3410)
- `npx tsc --noEmit` · `npm run lint` · `npm run build`

## Rules specific to this app
- **`API_BIBLE_KEY` is server-only.** It is read only in `lib/apibible.ts` (`import "server-only"`). Never prefix it `NEXT_PUBLIC_`, never import `lib/apibible.ts` from a client component. After builds, `grep -r "$API_BIBLE_KEY" .next` must find nothing.
- **Allowlist only.** New translations go in `lib/bibles.ts`; chapter/verse IDs are validated against the static canon in `lib/canon.ts` before any API call.
- **Licensing.** Every rendered scripture response must (1) show its `copyright` string and (2) report its `fumsToken` via `<Fums token=… />` (API.Bible FUMS v3). NIV is copyrighted — keep both in place.
- **Personal data stays local.** Highlights/notes/plans live in localStorage (`lib/study-store.ts`, key `selah:v1`, Zod-validated). No accounts, no DB in v1.
- **Woset guardrails:** one marigold fill per viewport, no shadows/gradients, pills (30px) for controls, square art, 15/25/95 type. Approved exceptions: scripture body 19px/1.6; playful GSAP motion (always behind reduced-motion checks).
- **Gamification ethos:** encourage, never punish (rest days, paper-Bible check-in, no leaderboards). Any new XP source needs a daily cap in `XP_RULES`.
- **Don't name CSS classes after Tailwind utilities** (`.ring` bit us).
- **Art** lives in `public/art/*.webp` (1200×800, paper tinted to `#e5e7eb` so it melts into the page). Regenerate with Magnific Recraft V4.1 using the hero as a style reference.

## Map
- `lib/apibible.ts` — fetch + Zod parse + normalise API.Bible JSON into `Block[]` (headings / cross-refs / verse segments)
- `app/read/[translation]/[chapter]` — reader (server) → `components/Reader.tsx` (client: select, highlight, note, copy)
- `app/api/search/route.ts` — the only public endpoint (search proxy)
- `data/` — divisions (home grid), reading plans, verse-of-the-day pool, quiz pool, badges
- `lib/game.ts` — pure game rules (XP/caps, levels, streak with rest days, Leitner); `lib/study-store.ts` `mutate()` is the only write path that awards XP + queues celebrations
- `components/motion/` — GSAP primitives (Reveal, SplitHeadline, CountUp, ProgressFill, Lamp) + `Celebrations` (toasts, modal, confetti) mounted in the layout
- Pages: `/map` (journey trail + pilgrim), `/lesson/[t]/[chapter]` (passage cards + rounds), `/play` (trivia, match, order, lightning, checkpoints), `/workshop` (oil shop), `/journey`, `/library`, `/memory`
- `lib/challenge.ts` (verse-generated rounds, segments), `lib/bank.ts` + `data/trivia.ts` (curated questions — run `npx tsx scripts/verify-trivia.ts` after editing), `components/rounds/RoundRenderer.tsx` (one renderer for every round type)
- `docs/DECISIONS.md` — why things are the way they are

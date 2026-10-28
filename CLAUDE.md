@AGENTS.md

# Davidson Blessons — Bible study web app

Next.js 16 (App Router) + TypeScript strict + Tailwind v4, styled with the **Woset** design system
(`~/.claude/skills/woset`). Scripture comes live from **API.Bible**; illustrations were generated with **Magnific**.

## Links
- Repo: https://github.com/JamieTurner2026/Davidson-Blessons (home of the combined app; Selah's old repo marleevison/selah is the source of the code). Live: https://davison-blesson.vercel.app (sales page: `/welcome`; production follows `main`). Branch preview: https://davison-blesson-git-claude-lov-f91044-jamieturner2026s-projects.vercel.app. https://selah-rho-sable.vercel.app is the legacy Selah site, not this app's home.

## Commands
- `npm run dev` — dev server (preview config `selah` in `~/Documents/Claude/.claude/launch.json`, port 3410)
- `npx tsc --noEmit` · `npm run lint` · `npm run build`

## Rules specific to this app
- **`API_BIBLE_KEY` is server-only.** It is read only in `lib/apibible.ts` (`import "server-only"`). Never prefix it `NEXT_PUBLIC_`, never import `lib/apibible.ts` from a client component. After builds, `grep -r "$API_BIBLE_KEY" .next` must find nothing.
- **Allowlist only.** New translations go in `lib/bibles.ts`; chapter/verse IDs are validated against the static canon in `lib/canon.ts` before any API call.
- **Licensing.** Every rendered scripture response must (1) show its `copyright` string and (2) report its `fumsToken` via `<Fums token=… />` (API.Bible FUMS v3). NIV is copyrighted — keep both in place.
- **Sign-in required, one account per person.** `components/SignInGate.tsx` (in the layout) shows the sign-in screen until someone is signed in, like the DDA2 training app: **tap your name** (public `profiles` list), **enter your password** (no email); "New member" signs up. Only `/auth/*` pages open without it. Each member's working copy lives in localStorage under their own key `selah:v1:user:<id>` (`setStudyScope` in `lib/study-store.ts`, called by `lib/sync.ts` on every auth change) and syncs to one `public.progress` row per user (a Supabase project created for this app; schema in `docs/supabase-setup.sql`). RLS is owner-only on `progress`; `profiles` is readable by anyone but holds only names. Every pull **merges** (`lib/merge.ts`; never overwrite). Sign-out pushes, then clears that member's copy from the browser, so a shared device never shows one person's progress to the next. Nothing is saved while signed out. Members sign in with a placeholder email `<name-slug>-<random>@davidson-blessons.vercel.app` (`newKey` in `lib/sync.ts`), so Supabase's **Confirm email must stay off**; no email is ever sent. Setup and owner password resets: `docs/RUNBOOKS.md`.
- **Supabase keys:** only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public by design). Never add a service-role key to this app. A new field in the study state needs a rule in `mergeStudy` and a case in `scripts/check-merge.ts`.
- **Woset guardrails:** one marigold fill per viewport, no shadows/gradients, pills (30px) for controls, square art, 15/25/95 type. Approved exceptions: scripture body 19px/1.6; playful GSAP motion (always behind reduced-motion checks).
- **Gamification ethos:** encourage, never punish (rest days, paper-Bible check-in, no leaderboards). Any new XP source needs a daily cap in `XP_RULES`.
- **Don't name CSS classes after Tailwind utilities** (`.ring` bit us).
- **Art** lives in `public/art/*.webp` (1200×800, paper tinted to `#e5e7eb` so it melts into the page). Regenerate with Magnific Recraft V4.1 using the hero as a style reference.

## Map
- `lib/apibible.ts` — fetch + Zod parse + normalise API.Bible JSON into `Block[]` (headings / cross-refs / verse segments)
- `app/read/[translation]/[chapter]` — reader (server) → `components/Reader.tsx` (client: select, highlight, memorize, copy)
- `app/api/search/route.ts` — the only public endpoint (search proxy)
- `data/` — divisions (home grid), verse-of-the-day pool, quiz pool, badges
- `lib/game.ts` — pure game rules (XP/caps, levels, streak with rest days, Leitner); `lib/study-store.ts` `mutate()` is the only write path that awards XP + queues celebrations
- `components/motion/` — GSAP primitives (Reveal, SplitHeadline, CountUp, ProgressFill, Lamp) + `Celebrations` (toasts, modal, confetti) mounted in the layout
- Pages: `/map` (journey trail + pilgrim), `/lesson/[t]/[chapter]` (passage cards + rounds), `/play` (trivia, match, order, lightning, checkpoints), `/workshop` (oil shop), `/journey`, `/library`, `/memory`
- `lib/challenge.ts` (verse-generated rounds, segments), `lib/bank.ts` + `data/trivia.ts` (curated questions — run `npx tsx scripts/verify-trivia.ts` after editing), `components/rounds/RoundRenderer.tsx` (one renderer for every round type)
- `lib/supabase.ts` (browser client) · `lib/sync.ts` (member list, sign-in/sign-up/change password, pull/merge/push) · `lib/merge.ts` (merge rules) · `components/SignInGate.tsx` (sign-in screen around the whole app) · `components/AccountPanel.tsx` (Journey → Your account: change password, sign out, delete progress) · `/auth/callback` (unused by username sign-in)
- **Davidson Blessons features:** study notes (`lib/notes.ts` reads `public/data/notes/<slug>/<n>.json`, generated by `bridge/publish_static.py`, never committed; rendered by `components/StudyNotes.tsx`) and the per-chapter private journal (`components/Journal.tsx`, `journal` field in the study state, newest-edit-wins merge). `bridge/` is the Python NotebookLM server that runs on the owner's PC.
- `docs/DECISIONS.md` — why things are the way they are

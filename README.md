# Davidson Blessons

A Bible study app: browse all 66 books chapter by chapter. Each chapter's
Scripture and AI-generated learning notes (meaning, key takeaways, a
reflection question) are retrieved live from the owner's own NotebookLM
notebook through a small local bridge server.

Built with React, Vite, and Tailwind.

## Editions

| Edition | Where | Shows |
|---|---|---|
| Public | Vercel production URL | A short NIV excerpt (≤15 words of verse 1) plus the full learning notes |
| Private | Vercel preview deployments, behind Vercel sign-in | Full NIV chapters |

The excerpt limit is enforced by the bridge server, not this frontend. The
bridge lives in a separate local project and is not part of this repo.

## Run locally

```bash
npm install
npm run dev
```

Create `.env.local` (gitignored) pointing at a running bridge:

```
VITE_NOTEBOOKLM_BRIDGE_URL=http://localhost:8484
VITE_NOTEBOOKLM_BRIDGE_SECRET=<bridge secret>
```

In production, if no bridge URL is configured, chapters show a clear
"not connected yet" message instead of trying `localhost`.

## Project layout

- `src/App.jsx`: testament → book → chapter navigation and chapter view
- `src/services/notebookLmService.js`: the single place the app talks to the
  bridge, with per-chapter caching in `localStorage`
- `lib/usfmBooks.js`: canonical list of the 66 books and chapter counts
- `api/`, `lib/youversion.js`, `src/services/bibleService.js`: unused
  leftovers from an earlier YouVersion API experiment; `api/` is excluded
  from Vercel deploys via `.vercelignore`

Scripture quotations are from the NIV® (© Biblica, Inc.), shown as short
excerpts only on the public edition. Not affiliated with Biblica.

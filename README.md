# Davidson Blessons

A Bible study app: browse all 66 books chapter by chapter. Each chapter has
plain-language study notes (what it means, three key takeaways, a question
to reflect on), a private journal box for your answer, and progress tracking
with a candle that fills as you learn chapters.

Built with React, Vite and Tailwind. Live at https://davidson-blessons.vercel.app.

## Editions

| Edition | Where | Shows |
|---|---|---|
| Public | Vercel production | Study notes, plus a link to read the chapter in the official NIV on Bible.com. No NIV text is hosted. |
| Private | Vercel preview deployments, behind Vercel sign-in | Study notes plus the full NIV chapter, verse by verse, with section headings |

## Where the content comes from

The study notes are written ahead of time by the owner's NotebookLM notebook
and shipped with each deploy as static files (`public/data/`, generated per
deploy and never committed). Chapters with notes load instantly and need
nothing else running. Their chapter buttons have a gold border.

The `bridge/` folder is the small Python server on the owner's PC that
writes those notes (about 40 a day), publishes them daily, and fills in
chapters live while the rest are still being written. See
[bridge/README.md](bridge/README.md). Its secrets, the NIV text and the notes
cache stay in a private folder outside this repo.

## Run locally

```bash
npm install
npm run dev
```

To try live notes in development, create `.env.local` (gitignored) pointing
at a running bridge:

```
VITE_NOTEBOOKLM_BRIDGE_URL=http://localhost:8484
VITE_NOTEBOOKLM_BRIDGE_SECRET=<bridge secret>
```

## Project layout

- `src/App.jsx`: book → chapter navigation, chapter view, journal, progress
- `src/services/notebookLmService.js`: loads chapters (static files first,
  then the bridge) and the list of chapters that have notes
- `lib/usfmBooks.js`: the 66 books, chapter counts and Bible.com codes
- `bridge/`: the notes writer, bridge server and publish script (Python)
- `api/`, `lib/youversion.js`, `src/services/bibleService.js`: unused
  leftovers from an earlier YouVersion API experiment, excluded from Vercel
  deploys via `.vercelignore`

Journal entries and progress are saved only in the reader's own browser.

Scripture quotations are from the NIV® (© Biblica, Inc.); the full text
appears only in the owner's private edition. Not affiliated with Biblica.

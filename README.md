# Davidson Blessons

A quiet Bible study web app: read in six translations, search, highlight, and play short lessons on each chapter along a journey trail.

## Setup

```bash
cp .env.example .env.local   # then add your API.Bible key
npm install
npm run dev
```

Get a key at https://scripture.api.bible. Progress is stored in the browser (back it up from the Journey page).

Scripture text © its respective publishers; displayed via API.Bible with FUMS usage reporting.

## Davidson Blessons study notes

Every chapter page also shows plain-language study notes (what it means, key takeaways, a reflection question) and a private journal box. The notes are written by the `bridge/` server (NotebookLM) and exported to `public/data/notes/` by `bridge/publish_static.py` before each deploy; that folder is generated and never committed. Without it, chapters just say the notes are still being written. See [bridge/README.md](bridge/README.md).

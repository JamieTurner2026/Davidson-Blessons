# Bridge: study notes from NotebookLM, NIV text from your own PDF

This folder is the small Python server that runs on the owner's PC and feeds
the Davidson Blessons app. It does three jobs:

1. **Writes study notes.** It asks the owner's own NotebookLM notebook about
   each chapter ("what it means, three key takeaways, one reflection
   question") and caches the answers.
2. **Publishes the app.** Once a day it exports the finished notes as static
   files and deploys both editions to Vercel, so chapters with notes load
   instantly and need nothing from the PC.
3. **Fills the gap while notes are being written.** If a reader opens a
   chapter with no notes yet and the PC is on, the app asks the bridge to
   write them live.

When all 1,189 chapters have notes, the app is fully static and the PC is no
longer needed (see "Finishing up" below).

## Code here, private data elsewhere

The code in this folder is safe to share. Everything private lives in a
separate folder that is **never committed**: `%USERPROFILE%\notebooklm-mcp`
by default (override with `NOTEBOOKLM_DATA_DIR`).

| In the private folder | What it is |
|---|---|
| `run_server.ps1` | The launcher, holding the secrets and the notebook ID. Template: `run_server.example.ps1`. |
| `.venv\` | Python environment, including the `notebooklm` CLI and its sign-in. |
| `bible_index.json` | The full NIV text, parsed from the owner's own PDF. Personal copy: never commit or deploy it publicly. |
| `chapter_cache\notes\` | The written study notes, one file per chapter. |
| `prewarm_state.json`, `prewarm_skip.json` | The notes writer's daily count, and chapters NotebookLM couldn't cover. |
| `*.log` | Launcher and server logs. |

## Files

| File | Purpose |
|---|---|
| `server.py` | The bridge: `GET /api/chapter`, `GET /health`, and the background notes writer. |
| `publish_static.py` | Exports notes (and, for the private edition only, NIV text) into `public/data/` and deploys both editions. |
| `build_bible_index.py` | Parses the NIV PDF into `bible_index.json`. |
| `run_server.example.ps1` | Launcher template. Copy it to the private folder and fill it in. |
| `requirements.txt` | Python packages. |

## Setup

```powershell
$dir = "$env:USERPROFILE\notebooklm-mcp"
python -m venv $dir\.venv
& $dir\.venv\Scripts\pip install -r bridge\requirements.txt
& $dir\.venv\Scripts\python -m playwright install chromium
```

**Sign in with a master token**, not plain `login`. Plain cookie sign-in
expires after a few days of inactivity, which breaks an always-on server.

```powershell
& $dir\.venv\Scripts\notebooklm login --master-token --account YOUR_EMAIL --browser msedge
& $dir\.venv\Scripts\notebooklm auth check --test     # look for "Token fetch: pass"
```

Then build the NIV index from your PDF, set up the launcher, and give the
bridge a public address:

```powershell
& $dir\.venv\Scripts\python bridge\build_bible_index.py   # reads Downloads\NIV-Bible.pdf (or NIV_PDF)
Copy-Item bridge\run_server.example.ps1 $dir\run_server.ps1   # then fill in the values
tailscale funnel --bg 8484                                 # free, permanent HTTPS address
```

To start it at sign-in, put a `.vbs` in the Startup folder
(`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`) that runs
`run_server.ps1` hidden. The launcher restarts the server within about 10
seconds if it crashes, and exits if port 8484 is already in use. Task
Scheduler was tried first and abandoned, because its sign-in trigger never
ran reliably.

## Configuration

| Variable | Purpose |
|---|---|
| `NOTEBOOKLM_DATA_DIR` | Private data folder. Default `%USERPROFILE%\notebooklm-mcp`. |
| `NOTEBOOKLM_NOTEBOOK_ID` | The notebook to ask. A partial ID is fine; `notebooklm list` shows them. |
| `NOTEBOOKLM_BRIDGE_SECRET` | Secret for the **private** edition (full chapters). |
| `NOTEBOOKLM_PUBLIC_SECRET` | Secret for the **public** edition (gets at most a 15-word excerpt). |
| `NOTEBOOKLM_PUBLIC_URL` | The bridge's Tailscale Funnel address, baked into deploys during the writing period. |
| `NOTEBOOKLM_ALLOWED_ORIGINS` | Exact origins allowed by CORS. |
| `NOTEBOOKLM_ALLOWED_ORIGIN_REGEX` | Pattern for Vercel preview URLs (the private edition gets a new URL per deploy). |
| `NOTEBOOKLM_PREWARM_PER_DAY` | Notes written per day. Default 40; 0 turns the writer off. |
| `NOTEBOOKLM_PREWARM_GAP_SECONDS` | Pause between questions. Default 180. |
| `NOTEBOOKLM_BRIDGE_PORT` | Default 8484. |

## The notes writer

- Order: Psalms, Matthew, Mark, Luke, John, Genesis, Proverbs, Romans, Acts,
  then everything else in Bible order. Chapters that already have notes are
  skipped.
- Pace: one question at a time, 3 minutes apart, at most 40 a day. That
  stays well inside NotebookLM's free daily limit, and all 1,189 take about
  30 days.
- It stops for the rest of the day on a rate-limit or sign-in error instead
  of retrying.
- After each day's quota it runs `publish_static.py` once, so new notes go
  live daily.
- Notes are shared by both editions and live in
  `chapter_cache\notes\<book>_<chapter>.json`. Live requests from the app
  save into the same place.

## The two editions

| | Public (`davison-blesson.vercel.app`, anyone) | Private (Vercel preview, sign-in required) |
|---|---|---|
| Study notes | yes | yes |
| NIV text | no, it links to the official NIV on Bible.com | full text, verse by verse, with section headings |

`publish_static.py` refuses to deploy the public build if any Scripture file
is present. After deploying, it checks that `/data/scripture/john/3.json` is
**not** served publicly. NIV's terms allow quoting up to 500 verses without
written permission, so the full text stays in the private edition.

## Security

- Auth is a shared secret in `X-App-Secret`, compared with
  `hmac.compare_digest`. It **fails closed**: if either secret is unset,
  every request is rejected.
- `book` and `chapter` are checked against the real 66-book table before
  anything reaches NotebookLM. This also keeps arbitrary text out of the
  prompt.
- The public secret is visible in the public site's code, so the bridge
  itself enforces what the public edition can get. Public cache misses are
  limited to 10 per visitor per hour (by `X-Forwarded-For` from Funnel).
- The bridge listens on `127.0.0.1` only. Funnel connects locally, so
  nothing else on the network can reach it.

## How requests behave

NotebookLM takes 20 to 250 seconds per new chapter. So `/api/chapter` never
holds a request open: it starts a background job and answers
**202 pending** right away (with the Scripture, which comes instantly from
`bible_index.json`). The app checks back every 4 seconds. CLI calls run one
at a time, because `notebooklm-py` locks its session files. Other routes
like `/health` stay responsive meanwhile.

`/health` reports `notesWritten` out of `notesTotal` (1,189).

## Finishing up (after all 1,189 notes exist)

1. Run `publish_static.py` once more. With every note written, it deploys
   fully static builds with no bridge address.
2. Remove `VITE_NOTEBOOKLM_BRIDGE_URL` from the Vercel project's
   Production environment.
3. Turn off the public address: `tailscale funnel --https=443 off`.
4. Delete the Startup `.vbs`, so the bridge no longer runs at sign-in.

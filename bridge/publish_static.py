"""Export pre-written study notes as static files and deploy Davidson Blessons to Vercel.

    %USERPROFILE%\\notebooklm-mcp\\.venv\\Scripts\\python bridge\\publish_static.py

Run automatically once a day by the bridge's notes writer, or by hand.
The app is the Next.js reader (Selah): it gets scripture from API.Bible on its own, so only
the study notes are exported, to public/data/notes/<book-slug>/<chapter>.json. The app reads
them at request time; chapters without a file show "still being written".
"""
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent          # the davison-blesson repo
DATA = APP / "public" / "data"                         # gitignored, wiped after each deploy
# Private data folder (same default as server.py): notes cache and the NIV index.
PRIVATE = Path(os.environ.get("NOTEBOOKLM_DATA_DIR") or Path.home() / "notebooklm-mcp")
NOTES_DIR = PRIVATE / "chapter_cache" / "notes"
PUBLIC_URL = "https://davidson-blessons.vercel.app"
BOOK_PROBE = "JHN.3"
TOTAL_CHAPTERS = 1189


def redact(text):
    return text


def write_notes():
    """One file per chapter, plus index.json listing which chapters have notes."""
    index = []
    for f in NOTES_DIR.glob("*.json"):
        book_key, ch = f.stem.rsplit("_", 1)          # e.g. "1_samuel", "17"
        slug = book_key.replace("_", "-")
        out = DATA / "notes" / slug / f"{ch}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        notes = json.loads(f.read_text(encoding="utf-8"))
        out.write_text(json.dumps({"explanation": notes["explanation"],
                                   "explanationAvailable": True}), encoding="utf-8")
        index.append(f"{slug}/{ch}")
    (DATA / "notes").mkdir(parents=True, exist_ok=True)
    (DATA / "notes" / "index.json").write_text(json.dumps({"chapters": sorted(index)}), encoding="utf-8")
    return len(index)


def deploy(args):
    r = subprocess.run(f"vercel deploy --yes {args}", shell=True, cwd=APP, text=True,
                       capture_output=True, encoding="utf-8", errors="replace")
    out = redact(r.stdout + r.stderr)
    if r.returncode != 0:
        raise SystemExit(f"deploy failed:\n{out[-1500:]}")
    urls = re.findall(r"https://[a-z0-9.-]+\.vercel\.app", out)
    return urls[-1] if urls else "?"


def status(url):
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return r.status, r.headers.get("content-type", "")
    except urllib.error.HTTPError as e:
        return e.code, ""


def main():
    written = len(list(NOTES_DIR.glob("*.json")))
    print(f"notes written: {written}/{TOTAL_CHAPTERS}")
    shutil.rmtree(DATA, ignore_errors=True)
    n = write_notes()
    url = deploy("--prod")
    print(f"deployed with {n} notes: {url}")
    print("read page probe        :", status(f"{PUBLIC_URL}/read/bsb/{BOOK_PROBE}"))
    shutil.rmtree(DATA, ignore_errors=True)


if __name__ == "__main__":
    main()

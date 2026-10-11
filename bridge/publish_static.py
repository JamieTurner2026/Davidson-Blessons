"""Export pre-written study notes (and, for the private edition, the NIV text)
as static files and deploy both editions of Davidson Blessons to Vercel.

    %USERPROFILE%\\notebooklm-mcp\\.venv\\Scripts\\python bridge\\publish_static.py

Run automatically once a day by the bridge's notes writer, or by hand.
Public build (production, anyone):  notes only — never Scripture files.
Private build (preview, Vercel sign-in required): notes + full NIV text.
While some notes are still unwritten, both builds also get the bridge URL so
those chapters can be written live when the PC is on. Once all 1,189 exist,
builds are fully static and need nothing from this PC.
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
# Private data folder (same default as server.py): notes cache, NIV index, and
# run_server.ps1, which holds the secrets and the bridge's public address.
PRIVATE = Path(os.environ.get("NOTEBOOKLM_DATA_DIR") or Path.home() / "notebooklm-mcp")
NOTES_DIR = PRIVATE / "chapter_cache" / "notes"
PUBLIC_URL = "https://davison-blesson.vercel.app"
TOTAL_CHAPTERS = 1189

launcher = (PRIVATE / "run_server.ps1").read_text(encoding="utf-8")
FULL = re.search(r'NOTEBOOKLM_BRIDGE_SECRET = "([^"]+)"', launcher).group(1)
PUBLIC = re.search(r'NOTEBOOKLM_PUBLIC_SECRET = "([^"]+)"', launcher).group(1)
BRIDGE_URL = re.search(r'NOTEBOOKLM_PUBLIC_URL = "([^"]+)"', launcher).group(1)


def redact(text):
    return text.replace(FULL, "<full>").replace(PUBLIC, "<public>")


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


def write_scripture():
    bible = json.loads((PRIVATE / "bible_index.json").read_text(encoding="utf-8"))
    count = 0
    for book, chapters in bible.items():
        for ch, verses in chapters.items():
            out = DATA / "scripture" / book.replace(" ", "-") / f"{ch}.json"
            out.parent.mkdir(parents=True, exist_ok=True)
            text = "\n\n".join(
                (f"### {v[2]}\n\n" if len(v) > 2 else "") + f"**{v[0]}** {v[1]}" for v in verses
            )
            out.write_text(json.dumps({"text": text}, ensure_ascii=False), encoding="utf-8")
            count += 1
    return count


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
    transition = written < TOTAL_CHAPTERS
    bridge = f"--build-env VITE_NOTEBOOKLM_BRIDGE_URL={BRIDGE_URL} " if transition else \
             "--build-env VITE_NOTEBOOKLM_BRIDGE_URL= "
    print(f"notes written: {written}/{TOTAL_CHAPTERS} ({'transition: bridge fallback on' if transition else 'fully static'})")

    # ---- public (production): notes only ----
    shutil.rmtree(DATA, ignore_errors=True)
    n = write_notes()
    if (DATA / "scripture").exists():
        raise SystemExit("refusing to deploy: scripture files present in the public build")
    deploy(f"--prod --build-env VITE_EDITION=public {bridge}"
           f"--build-env VITE_NOTEBOOKLM_BRIDGE_SECRET={PUBLIC if transition else ''}")
    sample = next(NOTES_DIR.glob("*.json"), None)
    if sample:
        bk, ch = sample.stem.rsplit("_", 1)
        print("public notes file      :", status(f"{PUBLIC_URL}/data/notes/{bk.replace('_', '-')}/{ch}.json"))
    leak = status(f"{PUBLIC_URL}/data/scripture/john/3.json")
    print("public scripture probe :", leak, "(must NOT be 200 json)")
    if leak[0] == 200 and "json" in leak[1]:
        raise SystemExit("!! Scripture is reachable on the public site — investigate immediately")
    print(f"public deployed with {n} notes")

    # ---- private (preview, behind Vercel sign-in): notes + full text ----
    shutil.rmtree(DATA, ignore_errors=True)
    write_notes()
    s = write_scripture()
    private_url = deploy(f"--build-env VITE_EDITION=private {bridge}"
                         f"--build-env VITE_NOTEBOOKLM_BRIDGE_SECRET={FULL if transition else ''}")
    print(f"private deployed with {n} notes + {s} scripture chapters: {private_url}")

    shutil.rmtree(DATA, ignore_errors=True)


if __name__ == "__main__":
    main()

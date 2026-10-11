"""Local bridge server for davison-blesson's live chapter retrieval.

Exposes one REST route (GET /api/chapter) that shells out to the notebooklm
CLI against a single configured notebook. Runs only on the owner's PC;
Tailscale Funnel gives it a public HTTPS URL (see README.md). The CLI's own
first-party MCP support (`notebooklm mcp install claude-code`) is used
separately for Claude's own tool access — this file is intentionally scoped
to just the web app's needs, not a general-purpose MCP wrapper.
"""

import hmac
import json
import os
import re
import subprocess
import sys
import threading
import time
from collections import defaultdict, deque
from pathlib import Path

import uvicorn
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from starlette.routing import Route

# Code lives in the repo; everything private (Python venv, NIV index, notes
# cache, writer state, secrets in run_server.ps1) lives in this data folder,
# which is never committed.
DATA_DIR = Path(os.environ.get("NOTEBOOKLM_DATA_DIR") or Path.home() / "notebooklm-mcp")
NOTEBOOKLM_EXE = str(DATA_DIR / ".venv" / "Scripts" / "notebooklm.exe")
NOTEBOOK_ID = os.environ.get("NOTEBOOKLM_NOTEBOOK_ID", "")
# Two editions of the app, told apart by which secret they send:
#   BRIDGE_SECRET  -> private edition (behind Vercel sign-in): full NIV chapters
#   PUBLIC_SECRET  -> public edition (anyone with the link): short NIV excerpt only
# The excerpt limit is enforced HERE, not in the web page — the public secret
# is readable in the public site's JS bundle, so anyone can call this bridge
# directly with it and must still only ever get an excerpt back.
BRIDGE_SECRET = os.environ.get("NOTEBOOKLM_BRIDGE_SECRET", "")
PUBLIC_SECRET = os.environ.get("NOTEBOOKLM_PUBLIC_SECRET", "")
ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("NOTEBOOKLM_ALLOWED_ORIGINS", "").split(",") if o.strip()
]
# Vercel preview deployments (the private edition) get a new URL per deploy,
# so they're matched by pattern. CORS only restricts browsers; the secrets
# are the real access control.
ALLOWED_ORIGIN_REGEX = os.environ.get("NOTEBOOKLM_ALLOWED_ORIGIN_REGEX") or None
PORT = int(os.environ.get("NOTEBOOKLM_BRIDGE_PORT", "8484"))

EXCERPT_MAX_WORDS = 15
# Public-edition requests that miss the cache cost a real NotebookLM query;
# cap them per visitor so strangers can't drain the notebook's quota.
PUBLIC_MISSES_PER_HOUR = 10
CACHE_DIR = DATA_DIR / "chapter_cache"

# Canonical 66-book/chapter-count table (mirrors davison-blesson/lib/usfmBooks.js).
# Every request is validated against this BEFORE any CLI call — book/chapter
# are otherwise interpolated straight into a natural-language prompt sent to
# the user's own NotebookLM notebook, so an unvalidated value is both a way to
# burn real backend time/quota on garbage input and a prompt-injection surface
# against the user's own notebook contents.
BOOK_CHAPTER_COUNTS = {
    "genesis": 50, "exodus": 40, "leviticus": 27, "numbers": 36, "deuteronomy": 34,
    "joshua": 24, "judges": 21, "ruth": 4, "1 samuel": 31, "2 samuel": 24,
    "1 kings": 22, "2 kings": 25, "1 chronicles": 29, "2 chronicles": 36, "ezra": 10,
    "nehemiah": 13, "esther": 10, "job": 42, "psalms": 150, "proverbs": 31,
    "ecclesiastes": 12, "song of solomon": 8, "isaiah": 66, "jeremiah": 52,
    "lamentations": 5, "ezekiel": 48, "daniel": 12, "hosea": 14, "joel": 3,
    "amos": 9, "obadiah": 1, "jonah": 4, "micah": 7, "nahum": 3, "habakkuk": 3,
    "zephaniah": 3, "haggai": 2, "zechariah": 14, "malachi": 4,
    "matthew": 28, "mark": 16, "luke": 24, "john": 21, "acts": 28, "romans": 16,
    "1 corinthians": 16, "2 corinthians": 13, "galatians": 6, "ephesians": 6,
    "philippians": 4, "colossians": 4, "1 thessalonians": 5, "2 thessalonians": 3,
    "1 timothy": 6, "2 timothy": 4, "titus": 3, "philemon": 1, "hebrews": 13,
    "james": 5, "1 peter": 5, "2 peter": 3, "1 john": 5, "2 john": 1, "3 john": 1,
    "jude": 1, "revelation": 22,
}


def validate_book_chapter(book, chapter):
    """Returns (canonical_book_name, chapter_int) or raises CliError(..., code='BAD_REQUEST')."""
    key = (book or "").strip().lower()
    if key not in BOOK_CHAPTER_COUNTS:
        raise CliError("UNKNOWN_BOOK", f'"{book}" is not a recognized Bible book.')
    if not str(chapter).strip().isdigit():
        raise CliError("BAD_CHAPTER", "chapter must be a positive whole number.")
    chapter_int = int(chapter)
    max_chapters = BOOK_CHAPTER_COUNTS[key]
    if not (1 <= chapter_int <= max_chapters):
        raise CliError(
            "BAD_CHAPTER", f"{book} only has {max_chapters} chapters."
        )
    return key.title(), chapter_int

# Trailing conversational prompts NotebookLM appends (e.g. "🌱 *Would you like
# to explore Genesis 3 next?*") aren't useful in a Bible-app display. Rather
# than matching one exact emoji/prefix combination, work block-by-block from
# the end of the answer: drop any trailing "---" divider or short block that
# contains an offer phrase, regardless of what emoji or markdown emphasis
# wraps it. The length cap keeps this from ever eating a substantive block
# (e.g. a genuine reflection question) that merely mentions one of these
# phrases in passing.
_OFFER_PHRASE_RE = re.compile(
    r"\b(would you like|shall i|do you want me to|want me to (?:go ahead|continue|proceed)"
    r"|if you(?:'d| would) like|let me know|we could also)\b",
    re.IGNORECASE,
)
_DIVIDER_RE = re.compile(r"^[\-*_]{2,}$")


def _strip_trailing_offer(text):
    blocks = text.split("\n\n")
    while blocks:
        stripped = blocks[-1].strip().strip("*_ \t")
        if not stripped or _DIVIDER_RE.match(stripped):
            blocks.pop()
            continue
        if len(stripped) < 400 and _OFFER_PHRASE_RE.search(stripped):
            blocks.pop()
            continue
        break
    return "\n\n".join(blocks).strip()

# Loose heuristic only, for UI treatment (e.g. showing a muted "not yet in
# your notebook" style instead of an error) — never used to alter or hide
# the actual returned text.
_UNAVAILABLE_MARKERS = (
    "not present",
    "not included",
    "is not in",
    "does not contain",
    "not contain the",
)


class CliError(RuntimeError):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def _classify(text):
    lowered = text.lower()
    if "auth" in lowered or "login" in lowered:
        return CliError("AUTH_ERROR", "NotebookLM session has expired or is invalid.")
    if "rate" in lowered or "429" in text:
        return CliError("RATE_LIMITED", "NotebookLM is rate-limiting requests right now.")
    return CliError("CLI_ERROR", text or "notebooklm CLI failed.")


# notebooklm-py manages its own local session/master-token state with file
# locking (it depends on `filelock`), so truly parallel CLI invocations would
# contend for that lock anyway. This lock makes that serialization clean and
# predictable — a FIFO queue of one CLI call at a time — instead of letting
# concurrent requests race the CLI's own lock and appear to hang.
_cli_lock = threading.Lock()


def run_cli(*args, timeout=120):
    try:
        with _cli_lock:
            result = subprocess.run(
                [NOTEBOOKLM_EXE, *args],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout,
            )
    except subprocess.TimeoutExpired as exc:
        raise CliError("TIMEOUT", "NotebookLM took too long to respond.") from exc
    except FileNotFoundError as exc:
        raise CliError(
            "CLI_NOT_FOUND", "notebooklm CLI is not installed where expected."
        ) from exc

    if result.returncode != 0:
        # With --json, error details land as a JSON object on stdout (not
        # stderr), e.g. {"error": true, "code": "...", "message": "..."}.
        stdout = (result.stdout or "").strip()
        if stdout.startswith("{"):
            try:
                payload = json.loads(stdout)
                if payload.get("error"):
                    raise _classify(payload.get("message", ""))
            except json.JSONDecodeError:
                pass
        raise _classify((result.stderr or "").strip())

    return result.stdout


def ask(question, timeout=120):
    if not NOTEBOOK_ID:
        raise CliError("NOT_CONFIGURED", "NOTEBOOKLM_NOTEBOOK_ID is not set on the server.")

    raw_stdout = run_cli(
        "ask", question,
        "-n", NOTEBOOK_ID,
        "--new", "--yes", "--json",
        timeout=timeout,
    )
    try:
        data = json.loads(raw_stdout)
    except json.JSONDecodeError as exc:
        raise CliError("PARSE_ERROR", "Unexpected response from NotebookLM.") from exc

    answer = _strip_trailing_offer(data.get("answer", ""))
    available = not any(marker in answer.lower() for marker in _UNAVAILABLE_MARKERS)
    return answer, available


_CITATION_RE = re.compile(r"\[\d+(?:\s*[-–,]\s*\d+)*\]")
_VERSE_LABEL_RE = re.compile(r"(?i)\bverse\s+\d+\s*[:.]?")


def make_excerpt(text):
    """Clean a NotebookLM quote down to plain words and hard-cap its length."""
    text = re.sub(r"^\s*#.*$", "", text, flags=re.MULTILINE)   # heading lines
    text = re.sub(r"\*\*\d+\*\*", "", text)                     # bold verse numbers
    text = _CITATION_RE.sub("", text)
    text = re.sub(r"[*_>`]", "", text)
    text = _VERSE_LABEL_RE.sub("", text)
    text = re.sub(r"^\s*\d+[.)]?\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s+([.,;:!?])", r"\1", text)
    text = text.strip().strip("\"“”'‘’").strip()  # the page adds its own quotes
    words = text.split()
    excerpt = " ".join(words[:EXCERPT_MAX_WORDS])
    return excerpt + ("…" if len(words) > EXCERPT_MAX_WORDS else "")


# Disk cache of finished chapter responses, keyed by edition + chapter, so a
# chapter is only ever fetched from NotebookLM once. Only complete answers are
# cached — "not in your notebook yet" results are re-checked each time, so
# they start working as soon as more sources are added to the notebook.
def _cache_path(mode, book, chapter):
    return CACHE_DIR / mode / f"{book.lower().replace(' ', '_')}_{chapter}.json"


def cache_get(mode, book, chapter):
    try:
        return json.loads(_cache_path(mode, book, chapter).read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def cache_put(mode, book, chapter, payload):
    path = _cache_path(mode, book, chapter)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


# Study notes are shared by both editions (one NotebookLM question per
# chapter) and stored under chapter_cache/notes/. The paraphrase style keeps
# the notes suitable for the public edition too.
NOTES = "notes"


def notes_prompt(book, chapter):
    return (
        f"Explain the meaning of {book} chapter {chapter}, give three key "
        f"takeaways, and one reflection question, based only on the sources. "
        f"Paraphrase in your own words rather than quoting Scripture at length."
    )


def clean_notes(text):
    """Notes as a reader should see them: no trailing chat offer ("If you'd
    like, we can explore..."), and no [1, 2] markers pointing at NotebookLM's
    own source list, which means nothing outside NotebookLM."""
    text = _strip_trailing_offer(text)
    text = _CITATION_RE.sub("", text)
    text = re.sub(r"[ \t]+([.,;:!?)])", r"\1", text)   # "Him [2]." -> "Him."
    text = re.sub(r"[ \t]+$", "", text, flags=re.MULTILINE)
    return text.strip()


def ask_notes(book, chapter):
    answer, available = ask(notes_prompt(book, chapter))
    return clean_notes(answer), available


def clean_cached_notes():
    """Apply clean_notes to notes written before it existed (no new questions)."""
    changed = 0
    for path in (CACHE_DIR / NOTES).glob("*.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        cleaned = clean_notes(data.get("explanation", ""))
        if cleaned != data.get("explanation"):
            path.write_text(json.dumps({**data, "explanation": cleaned}), encoding="utf-8")
            changed += 1
    return changed


def seed_shared_notes():
    """Reuse notes already written by the old per-edition caches (no new questions)."""
    copied = 0
    for legacy in ("excerpt", "full"):
        for path in (CACHE_DIR / legacy).glob("*.json"):
            target = CACHE_DIR / NOTES / path.name
            if target.exists():
                continue
            data = json.loads(path.read_text(encoding="utf-8"))
            if data.get("explanationAvailable") and data.get("explanation"):
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(json.dumps({"explanation": data["explanation"],
                                              "explanationAvailable": True}), encoding="utf-8")
                copied += 1
    return copied


# Full NIV text parsed from the owner's own PDF by build_bible_index.py:
# {book: {chapter: [[verse_number, text], ...]}}, where a verse that opens a
# new section carries its heading as a third item. Loaded once at startup.
BIBLE_INDEX = DATA_DIR / "bible_index.json"
try:
    BIBLE = json.loads(BIBLE_INDEX.read_text(encoding="utf-8"))
except FileNotFoundError:
    BIBLE = None
    print(f"WARNING: {BIBLE_INDEX} not found - run build_bible_index.py")


def scripture_for(mode, book, chapter):
    """Full chapter for the private edition; a <=15-word slice of verse 1 for public."""
    if BIBLE is None:
        return None
    verses = BIBLE[book.lower()][str(chapter)]
    if mode == "excerpt":
        return make_excerpt(verses[0][1])
    return format_chapter(verses)


def format_chapter(verses):
    """Verses as "**n** text" paragraphs, with any section heading as "### heading"."""
    return "\n\n".join(
        (f"### {v[2]}\n\n" if len(v) > 2 else "") + f"**{v[0]}** {v[1]}" for v in verses
    )


# In-flight chapter fetches, keyed by (mode, book, chapter):
#   {"state": "pending"} | {"state": "done", "notes": ...} | {"state": "error", "error": CliError}
# Completed notes go to the disk cache instead; "done" here only holds
# notes NotebookLM couldn't produce, which are deliberately never cached on disk.
_jobs = {}
_jobs_lock = threading.Lock()

_miss_times = defaultdict(deque)
_miss_lock = threading.Lock()


def allow_public_miss(visitor):
    """Sliding one-hour window of cache-miss requests per visitor."""
    now = time.monotonic()
    with _miss_lock:
        times = _miss_times[visitor]
        while times and now - times[0] > 3600:
            times.popleft()
        if len(times) >= PUBLIC_MISSES_PER_HOUR:
            return False
        times.append(now)
        return True


def cli_error_response(exc: CliError):
    status_by_code = {
        "NOT_CONFIGURED": 500,
        "CLI_NOT_FOUND": 500,
        "AUTH_ERROR": 401,
        "RATE_LIMITED": 429,
        "TIMEOUT": 504,
        "PARSE_ERROR": 502,
        "CLI_ERROR": 502,
        "UNKNOWN_BOOK": 400,
        "BAD_CHAPTER": 400,
    }
    return JSONResponse(
        {"reason": exc.code, "message": exc.message},
        status_code=status_by_code.get(exc.code, 502),
    )


async def get_chapter(request):
    # Fail CLOSED: if the server has no secret configured, every request is
    # rejected rather than silently allowed through unauthenticated. A missing
    # env var in production should never quietly turn into "no auth required."
    if not BRIDGE_SECRET or not PUBLIC_SECRET:
        return JSONResponse(
            {"reason": "NOT_CONFIGURED", "message": "Bridge secrets are not configured on the server."},
            status_code=500,
        )
    provided = request.headers.get("x-app-secret", "")
    if hmac.compare_digest(provided, BRIDGE_SECRET):
        mode = "full"
    elif hmac.compare_digest(provided, PUBLIC_SECRET):
        mode = "excerpt"
    else:
        return JSONResponse(
            {"reason": "UNAUTHORIZED", "message": "Invalid or missing secret."},
            status_code=401,
        )

    book = request.query_params.get("book")
    chapter = request.query_params.get("chapter")
    if not book or not chapter:
        return JSONResponse(
            {"reason": "MISSING_PARAMS", "message": "book and chapter query params are required."},
            status_code=400,
        )

    try:
        book, chapter = validate_book_chapter(book, chapter)
    except CliError as exc:
        return cli_error_response(exc)

    # Scripture comes from the local index instantly; only the study notes
    # need NotebookLM. Every response — including "still working" — carries
    # the Scripture, so the app can show it right away.
    scripture = scripture_for(mode, book, chapter)
    if scripture is None:
        return JSONResponse(
            {"reason": "NO_INDEX",
             "message": "The bridge's Bible index is missing. Run build_bible_index.py."},
            status_code=500,
        )
    base = {"book": book, "chapter": chapter, "mode": mode,
            "rawText": scripture, "rawAvailable": True}

    cached = cache_get(NOTES, book, chapter)
    if cached:
        return JSONResponse({**base, "explanation": cached["explanation"],
                             "explanationAvailable": cached["explanationAvailable"],
                             "fromBridgeCache": True})

    # Notes take ~40s of NotebookLM time. Rather than hold the browser's
    # connection open that long (browsers drop long requests — observed live:
    # the bridge finished Genesis 3 after the browser had already given up),
    # the notes run as a background job, this route answers 202 immediately
    # with the Scripture, and the app polls for the notes.
    key = (book, chapter)  # notes are shared by both editions
    with _jobs_lock:
        job = _jobs.get(key)
        if job and job["state"] != "pending":
            del _jobs[key]  # finished results are handed out once
    if job:
        if job["state"] == "pending":
            return JSONResponse({**base, "status": "pending"}, status_code=202)
        if job["state"] == "done":
            return JSONResponse({**base, **job["notes"]})
        # Notes failed, but the Scripture is still good — return it with the reason.
        return JSONResponse({**base, "explanation": "", "explanationAvailable": False,
                             "notesError": job["error"].message})

    if mode == "excerpt":
        # Behind a tunnel every request arrives from 127.0.0.1, so identify the
        # real visitor from the proxy's forwarding header (Cloudflare or
        # Tailscale Funnel). If neither is present, all public visitors share
        # one bucket — stricter, never looser.
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        visitor = request.headers.get("cf-connecting-ip") or forwarded or request.client.host
        if not allow_public_miss(visitor):
            # Scripture is free (local); only the NotebookLM-backed notes are limited.
            return JSONResponse({**base, "explanation": "", "explanationAvailable": False,
                                 "notesError": "You've opened a lot of new chapters this hour. "
                                               "Study notes will be available again later."})

    with _jobs_lock:
        if key not in _jobs:
            _jobs[key] = {"state": "pending"}
            threading.Thread(target=_run_job, args=(key,), daemon=True).start()
    return JSONResponse({**base, "status": "pending"}, status_code=202)


def _run_job(key):
    book, chapter = key
    try:
        explanation, explanation_available = ask_notes(book, chapter)
        notes = {"explanation": explanation, "explanationAvailable": explanation_available}
        if explanation_available:
            cache_put(NOTES, book, chapter, notes)
            result = None  # served from the disk cache from now on
        else:
            result = {"state": "done", "notes": notes}
    except CliError as exc:
        result = {"state": "error", "error": exc}
    except Exception as exc:  # noqa: BLE001 - never leak a raw traceback to the app
        print(f"[job {key}] unexpected error: {exc!r}")
        result = {"state": "error",
                  "error": CliError("UNKNOWN_ERROR", "Unable to load NotebookLM content right now.")}
    with _jobs_lock:
        if result is None:
            _jobs.pop(key, None)
        else:
            _jobs[key] = result


# ---------------------------------------------------------------------------
# Notes writer: pre-writes study notes for every chapter in the background so
# the app can eventually be served entirely as static files (no PC needed).
# Deliberately slow and capped: one question at a time, PREWARM_GAP_SECONDS
# apart, at most PREWARM_PER_DAY per calendar day, and it stops for the rest
# of the day on any rate-limit or sign-in error instead of retrying.
# ---------------------------------------------------------------------------
PREWARM_PER_DAY = int(os.environ.get("NOTEBOOKLM_PREWARM_PER_DAY", "40"))
PREWARM_GAP_SECONDS = int(os.environ.get("NOTEBOOKLM_PREWARM_GAP_SECONDS", "180"))
PREWARM_STATE = DATA_DIR / "prewarm_state.json"
PREWARM_SKIP = DATA_DIR / "prewarm_skip.json"   # chapters NotebookLM couldn't cover
PUBLISH_SCRIPT = Path(__file__).parent / "publish_static.py"
PRIORITY_BOOKS = ["psalms", "matthew", "mark", "luke", "john", "genesis", "proverbs", "romans", "acts"]
_STOP_FOR_DAY = {"RATE_LIMITED", "AUTH_ERROR", "NOT_CONFIGURED", "CLI_NOT_FOUND"}


def prewarm_order():
    books = PRIORITY_BOOKS + [b for b in BOOK_CHAPTER_COUNTS if b not in PRIORITY_BOOKS]
    for b in books:
        for ch in range(1, BOOK_CHAPTER_COUNTS[b] + 1):
            yield b.title(), ch


def _read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def _today_state():
    today = time.strftime("%Y-%m-%d")
    state = _read_json(PREWARM_STATE, {})
    if state.get("date") != today:
        state = {"date": today, "count": 0, "stopped": None, "published": False}
    return state


def next_unwritten():
    skip = set(map(tuple, _read_json(PREWARM_SKIP, [])))
    for book, ch in prewarm_order():
        if (book, ch) in skip or cache_get(NOTES, book, ch):
            continue
        with _jobs_lock:
            if (book, ch) in _jobs:
                continue
        return book, ch
    return None


def _publish(state):
    """Push the day's new notes live (export + deploy), once per day."""
    if state.get("published") or not PUBLISH_SCRIPT.exists():
        return
    r = subprocess.run([sys.executable, str(PUBLISH_SCRIPT)], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=1800)
    print(f"[notes writer] publish exit {r.returncode}: {(r.stdout + r.stderr)[-400:]}")
    state["published"] = True
    PREWARM_STATE.write_text(json.dumps(state), encoding="utf-8")


def prewarm_loop():
    while True:
        state = _today_state()
        target = next_unwritten()
        if target is None or state["count"] >= PREWARM_PER_DAY or state["stopped"]:
            _publish(state)
            if target is None:
                print("[notes writer] every chapter has notes - done")
                return
            time.sleep(600)  # check again later; the count resets at midnight
            continue
        book, ch = target
        try:
            explanation, ok = ask_notes(book, ch)
            if ok:
                cache_put(NOTES, book, ch, {"explanation": explanation, "explanationAvailable": True})
            else:
                skip = _read_json(PREWARM_SKIP, [])
                PREWARM_SKIP.write_text(json.dumps(skip + [[book, ch]]), encoding="utf-8")
            print(f"[notes writer] {book} {ch}: {'written' if ok else 'not covered, skipped'}")
        except CliError as exc:
            print(f"[notes writer] {book} {ch}: {exc.code}")
            if exc.code in _STOP_FOR_DAY:
                state["stopped"] = exc.code
        except Exception as exc:  # noqa: BLE001 - keep the writer alive
            print(f"[notes writer] {book} {ch}: unexpected {exc!r}")
        state["count"] += 1  # counts attempts, so errors can never exceed the cap
        PREWARM_STATE.write_text(json.dumps(state), encoding="utf-8")
        time.sleep(PREWARM_GAP_SECONDS)


async def health(request):
    written = len(list((CACHE_DIR / NOTES).glob("*.json")))
    return JSONResponse({"status": "ok", "notebookConfigured": bool(NOTEBOOK_ID),
                         "notesWritten": written, "notesTotal": 1189})


app = Starlette(
    routes=[
        Route("/api/chapter", get_chapter),
        Route("/health", health),
    ],
    middleware=[
        Middleware(
            CORSMiddleware,
            allow_origins=ALLOWED_ORIGINS,
            allow_origin_regex=ALLOWED_ORIGIN_REGEX,
            allow_methods=["GET"],
            allow_headers=["x-app-secret"],
        ),
    ],
)


if __name__ == "__main__":
    print(f"[startup] reused {seed_shared_notes()} existing notes into the shared set")
    print(f"[startup] cleaned {clean_cached_notes()} notes (chat offers, source markers)")
    if PREWARM_PER_DAY > 0:
        threading.Thread(target=prewarm_loop, daemon=True).start()
    # Loopback only: the tunnel connects from this machine, so nothing else
    # needs to reach the bridge directly. 0.0.0.0 would expose it to every
    # device on the local network.
    uvicorn.run(app, host="127.0.0.1", port=PORT)

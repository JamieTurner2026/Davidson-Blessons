"""Build bible_index.json — {book: {chapter: [[verse_number, text], ...]}} —
straight from the owner's NIV PDF, so the bridge can serve Scripture text
instantly instead of spending a ~40s NotebookLM question on it.

Run once (or again if the PDF changes):
    %USERPROFILE%\\notebooklm-mcp\\.venv\\Scripts\\python bridge\\build_bible_index.py

Reads the PDF from NIV_PDF (default: Downloads\\NIV-Bible.pdf) and writes the
index into the bridge's private data folder (see server.py DATA_DIR).

Validated: all 66 books / 1,189 chapters match canonical counts, verse
numbering survives the verses the NIV deliberately omits (Matthew 17:21,
Mark 9:44/46, Luke 17:36, ...), and text matches NotebookLM's own quotes.
The output contains the full NIV text — it stays on this PC (personal copy)
and must never be committed to a repo or deployed.
"""
import json
import os
import re
import sys
from pathlib import Path

from pypdf import PdfReader

sys.path.insert(0, str(Path(__file__).parent))
from server import BOOK_CHAPTER_COUNTS, DATA_DIR  # canonical 66-book chapter counts

PDF = os.environ.get("NIV_PDF") or str(Path.home() / "Downloads" / "NIV-Bible.pdf")
TOC_TO_CANON = {
    "1st samuel": "1 samuel", "2nd samuel": "2 samuel", "1st kings": "1 kings", "2nd kings": "2 kings",
    "1st chronicles": "1 chronicles", "2nd chronicles": "2 chronicles", "1st corinthians": "1 corinthians",
    "2nd corinthians": "2 corinthians", "1st thessalonians": "1 thessalonians",
    "2nd thessalonians": "2 thessalonians", "1st timothy": "1 timothy", "2nd timothy": "2 timothy",
    "1st peter": "1 peter", "2nd peter": "2 peter", "1st john": "1 john", "2nd john": "2 john",
    "3rd john": "3 john",
}
MARKER = re.compile(r"(?<![\d,.:])(\d{1,3})(?=[A-Za-z\"“‘'(\[])")

# A few lines in the PDF are letter-spaced ("G i v e  e a r  t o  m y"): one
# space between letters, two between words. Rejoin them before the spacing is
# collapsed and lost. A run that starts mid-word after a single space
# ("confid e n c e") is glued back onto that word.
SPACED = re.compile(r"(\S+ )?((?<![^ \n])(?:\S {1,2}){3,}\S(?![^ \n]))")


def unspace(page):
    def fix(m):
        words = " ".join(w.replace(" ", "") for w in re.split(r" {2,}", m.group(2)))
        return (m.group(1)[:-1] if m.group(1) else "") + words
    return SPACED.sub(fix, page)


# The PDF has a handful of section headings ("The Japhethites", "Sayings of the
# Wise", "BOOK IV Psalms 90-106") with no verse number, so they end up glued to
# the end of the verse before them. Heading = a trailing run of title-case words
# after the verse's final sentence. "Selah" is part of the NIV text, not a heading.
SMALL_WORDS = {"of", "the", "and", "to", "in", "a", "an", "for", "at", "on", "with", "from",
               "by", "as", "or", "into", "over", "after", "before", "among", "son"}
TRAILING_HEADING = re.compile(r"(?<=[.!?\"”’)])\s+([A-Z][^.!?,;:\"”’()]{1,60})$")


def split_heading(text):
    m = TRAILING_HEADING.search(text)
    if not m or m.group(1).strip() == "Selah":
        return text, None
    words = re.findall(r"[A-Za-z’']+", m.group(1))
    if not all(w[0].isupper() or w in SMALL_WORDS for w in words):
        return text, None
    return text[:m.start()].rstrip(), m.group(1).strip()


reader = PdfReader(PDF)
pages = [unspace(p.extract_text() or "") for p in reader.pages]
toc = [l.strip() for l in pages[1].splitlines() if l.strip() and "Testament" not in l]

# Book start page = first page after the TOC whose own line equals the title.
starts, search_from = [], 2
for title in toc:
    for i in range(search_from, len(pages)):
        if any(l.strip() == title for l in pages[i].splitlines()):
            starts.append((title, i)); search_from = i
            break
    else:
        raise SystemExit(f"start page not found for {title}")

bible, problems, headings = {}, [], []
for idx, (title, start) in enumerate(starts):
    end = starts[idx + 1][1] if idx + 1 < len(starts) else len(pages)
    chunk = pages[start:end]
    first_lines = chunk[0].splitlines()
    cut = next(k for k, l in enumerate(first_lines) if l.strip() == title)
    chunk[0] = "\n".join(first_lines[cut + 1:])
    if idx + 1 < len(starts) and start != end:
        pass
    text = re.sub(r"\s+", " ", " ".join(chunk))
    # From Psalm 73 on, the PDF switches format: a "PSALM 73" heading, verses
    # restarting at 1, and leftover layout markup ("p header ... /header", "pp>").
    text = text.replace("p header", " ").replace("/header", " ")
    text = re.sub(r"PSALM (\d+)\s+1(?=[\s\"“‘'(A-Za-z])\s*", r"\1", text)
    text = re.sub(r"(?<!\S)(?:pp>|p>|pp|p)(?!\S)", " ", text)
    text = re.sub(r"\s+", " ", text)
    # small-caps "Lord" (and a few others) leave a stray space before punctuation
    text = re.sub(r"(\w) +([,.;:!?])", r"\1\2", text)

    marks = [(m.start(), m.end(), int(m.group(1))) for m in MARKER.finditer(text)]
    chapters, c, v, cur = {}, 0, 0, None
    for j, (s, e, n) in enumerate(marks):
        nxt = marks[j + 1][2] if j + 1 < len(marks) else None
        # n == v + 2 covers verses the NIV deliberately omits (e.g. Matthew 17:21)
        # (next marker may skip again, e.g. Mark 9:44 and 9:46, or start the next
        # chapter, e.g. Luke 17:36 is omitted right before chapter 18)
        is_verse = c > 0 and (n == v + 1 or (n == v + 2 and nxt in (n + 1, n + 2, c + 1)))
        is_chapter = n == c + 1
        if is_verse and is_chapter:           # ambiguous: decide by what follows
            is_verse = nxt != 2
            is_chapter = not is_verse
        if is_chapter:
            c, v = n, 1
            chapters[c] = []
        elif is_verse:
            v = n
        else:
            continue                          # a stray number inside verse text
        chapters[c].append((s, e, v))         # keep the real verse number
    # resolve verse spans, merging stray-number text back into the verse it belongs to
    keyed = []
    for ch, spans in chapters.items():
        keyed += [(sp[0], ch, sp[2], sp[1]) for sp in spans]
    keyed.sort()
    out = {}
    for k, (s, ch, vn, body_start) in enumerate(keyed):
        stop = keyed[k + 1][0] if k + 1 < len(keyed) else len(text)
        out.setdefault(ch, []).append([vn, text[body_start:stop].strip()])
    # move any heading glued to the end of a verse onto the verse it introduces
    # (the next one, which may be the first verse of the next chapter)
    ordered = [verse for verses in out.values() for verse in verses]
    for k, verse in enumerate(ordered):
        verse[1], heading = split_heading(verse[1])
        if heading and k + 1 < len(ordered):
            ordered[k + 1].append(heading)
            headings.append((title, heading))
    canon = TOC_TO_CANON.get(title.lower(), title.lower())
    want = BOOK_CHAPTER_COUNTS[canon]
    if len(out) != want:
        problems.append(f"{title}: parsed {len(out)} chapters, expected {want}")
    bible[canon] = out

print("books parsed:", len(bible))
print("chapter-count mismatches:", problems or "none")
total = sum(len(chs) for chs in bible.values())
print("total chapters:", total, "(expected 1189)")
print("section headings separated from verses:", len(headings))
if problems:
    raise SystemExit("not writing index: chapter counts don't match")
out_path = sys.argv[1] if len(sys.argv) > 1 else str(DATA_DIR / "bible_index.json")
json.dump(bible, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
print("wrote", out_path)

import React, { useState, useEffect } from "react";
import { Flame, ChevronLeft, Check, BookOpen, Sparkles, Loader2 } from "lucide-react";
import { BOOKS } from "../lib/usfmBooks.js";
import { getChapter, EDITION } from "./services/notebookLmService.js";

const COMPLETED_KEY = "davison-blesson-completed-v1";

function loadCompleted() {
  try {
    return new Set(JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveCompleted(set) {
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...set]));
  } catch {
    // best-effort only
  }
}

// Minimal markdown-lite renderer for NotebookLM's answers (bold, headings,
// bullet lists, paragraphs). Works line by line: NotebookLM often puts a
// heading directly above its bullets with no blank line, and a block-based
// approach rendered only the heading and dropped the rest. Not a full
// markdown parser — just enough to avoid a markdown dependency for this.
const withBold = (s) =>
  s.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={j}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );

function renderLiteMarkdown(text, headingColor = "text-[#C9A34E]") {
  if (!text) return null;
  const out = [];
  let para = [];
  let list = [];
  const flushPara = () => {
    if (!para.length) return;
    out.push(
      <p key={out.length} className="mb-3 last:mb-0">
        {para.map((line, k) => (
          <React.Fragment key={k}>
            {k > 0 && <br />}
            {withBold(line)}
          </React.Fragment>
        ))}
      </p>
    );
    para = [];
  };
  const flushList = () => {
    if (!list.length) return;
    out.push(
      <ul key={out.length} className="list-disc pl-5 mb-3 space-y-1.5">
        {list.map((item, k) => (
          <li key={k}>{withBold(item)}</li>
        ))}
      </ul>
    );
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^#{1,4}\s+(.*)/);
    const bullet = line.match(/^[*-]\s+(.*)/);
    if (!line || /^[-*_]{3,}$/.test(line)) {
      flushPara();
      flushList();
    } else if (heading) {
      flushPara();
      flushList();
      out.push(
        <p key={out.length} className={`font-semibold ${headingColor} mb-2 mt-4 first:mt-0`}>
          {withBold(heading[1])}
        </p>
      );
    } else if (bullet) {
      flushPara();
      list.push(bullet[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out;
}

export default function App() {
  const [testament, setTestament] = useState("OT");
  const [book, setBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [completed, setCompleted] = useState(loadCompleted);
  const [chapterState, setChapterState] = useState({ status: "idle" }); // idle | loading | loaded | error

  const books = BOOKS.filter((b) => b.testament === testament);
  const key = book && chapter ? `${book.name}:${chapter}` : null;

  useEffect(() => {
    if (!book || !chapter) return;
    // Aborting stops the polling loop when the reader leaves this chapter; the
    // bridge keeps fetching in the background and caches the result anyway.
    const controller = new AbortController();
    setChapterState({ status: "loading" });
    const onPartial = (partial) => {
      if (!controller.signal.aborted) {
        setChapterState({ status: "loaded", data: partial, notesPending: true });
      }
    };
    getChapter(book.name, chapter, { signal: controller.signal, onPartial }).then((result) => {
      if (controller.signal.aborted) return;
      if (!result.ok) {
        setChapterState({ status: "error", message: result.message });
      } else {
        setChapterState({ status: "loaded", data: result, notesPending: false });
      }
    });
    return () => controller.abort();
  }, [book, chapter]);

  function markCompleted() {
    const next = new Set(completed);
    next.add(key);
    setCompleted(next);
    saveCompleted(next);
  }

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="min-h-screen w-full bg-[#12162a] text-[#EDE6D6]"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600;700&display=swap');
        .serif-display { font-family: 'Cormorant Garamond', serif; }
        .glow { box-shadow: 0 0 24px 2px rgba(201,163,78,0.35); }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          45% { opacity: 0.82; }
          50% { opacity: 1; }
          72% { opacity: 0.88; }
        }
        .flicker { animation: flicker 3.2s ease-in-out infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      <div className="max-w-md mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="flicker text-[#C9A34E]" size={28} strokeWidth={1.5} />
          <span className="uppercase tracking-[0.2em] text-xs text-[#C9A34E]/80">A Study Path</span>
        </div>
        <h1 className="serif-display text-4xl leading-tight mb-2">Davison Blesson</h1>
        <p className="text-[#EDE6D6]/70 text-sm mb-1">
          All 66 books, chapter by chapter, each with plain-language study notes:
          what it means, key takeaways, and a question to reflect on.
        </p>
        <p className="text-[#EDE6D6]/40 text-xs mb-8">
          Not affiliated with the New International Version or Biblica.
        </p>

        {!book && (
          <>
            <div className="flex gap-2 mb-6">
              {[["OT", "Old Testament"], ["NT", "New Testament"]].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTestament(id)}
                  className={
                    "px-4 py-2 rounded-full text-xs uppercase tracking-wide transition-colors " +
                    (testament === id
                      ? "bg-[#C9A34E] text-[#12162a] font-semibold"
                      : "bg-white/5 text-[#EDE6D6]/60 hover:bg-white/10")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {books.map((b) => (
                <button
                  key={b.name}
                  onClick={() => setBook(b)}
                  className="text-left rounded-xl border border-white/10 hover:border-[#C9A34E]/60 px-3 py-3 transition-colors"
                >
                  <span className="block text-sm serif-display">{b.name}</span>
                  <span className="block text-[11px] text-[#EDE6D6]/40">
                    {b.chapters} {b.chapters === 1 ? "chapter" : "chapters"}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {book && !chapter && (
          <>
            <button
              onClick={() => setBook(null)}
              className="flex items-center gap-1 text-sm text-[#EDE6D6]/60 hover:text-[#C9A34E] mb-6 transition-colors"
            >
              <ChevronLeft size={16} /> All books
            </button>
            <h2 className="serif-display text-3xl mb-5">{book.name}</h2>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => {
                const done = completed.has(`${book.name}:${n}`);
                return (
                  <button
                    key={n}
                    onClick={() => setChapter(n)}
                    className={
                      "aspect-square rounded-full flex items-center justify-center text-sm border transition-colors " +
                      (done
                        ? "bg-[#C9A34E] border-[#C9A34E] text-[#12162a] font-semibold glow"
                        : "border-white/20 text-[#EDE6D6]/70 hover:border-[#C9A34E]/70")
                    }
                  >
                    {done ? <Check size={14} strokeWidth={3} /> : n}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {book && chapter && (
          <>
            <button
              onClick={() => setChapter(null)}
              className="flex items-center gap-1 text-sm text-[#EDE6D6]/60 hover:text-[#C9A34E] mb-6 transition-colors"
            >
              <ChevronLeft size={16} /> {book.name}
            </button>

            <span className="uppercase tracking-[0.2em] text-xs text-[#C9A34E]/80">
              {book.testament === "OT" ? "Old Testament" : "New Testament"} &middot; Chapter {chapter}
            </span>
            <h2 className="serif-display text-3xl mt-1 mb-5">
              {book.name} {chapter}
            </h2>

            {chapterState.status === "loading" && (
              <div className="py-10 text-center">
                <div className="flex items-center gap-2 text-[#EDE6D6]/60 text-sm justify-center">
                  <Loader2 className="spin" size={18} /> Opening chapter&hellip;
                </div>
              </div>
            )}

            {chapterState.status === "error" && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-200 mb-6">
                {chapterState.message}
              </div>
            )}

            {chapterState.status === "loaded" && (
              <>
                {EDITION === "public" ? (
                  // The public site hosts no Scripture; it links to the official NIV.
                  <a
                    href={`https://www.bible.com/bible/111/${book.usfm}.${chapter}.NIV`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl bg-[#F3E9D2] text-[#2B1D14] p-6 mb-6 shadow-lg hover:brightness-105 transition"
                  >
                    <div className="flex items-center gap-2 mb-2 text-[#7A3B3B]">
                      <BookOpen size={15} />
                      <span className="text-xs font-semibold tracking-wide">NIV Scripture</span>
                    </div>
                    <p className="serif-display text-[20px] leading-snug">
                      Read {book.name} {chapter} in the NIV &rarr;
                    </p>
                    <p className="text-[11px] mt-2 text-[#2B1D14]/60">
                      Opens the official, free NIV text on Bible.com. Then come back for the study notes below.
                    </p>
                  </a>
                ) : (
                  <div className="rounded-2xl bg-[#F3E9D2] text-[#2B1D14] p-6 mb-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-3 text-[#7A3B3B]">
                      <BookOpen size={15} />
                      <span className="text-xs font-semibold tracking-wide">NIV Scripture</span>
                    </div>
                    {chapterState.data.rawAvailable ? (
                      <div className="serif-display text-[17px] leading-snug">
                        {renderLiteMarkdown(chapterState.data.rawText, "text-[#7A3B3B]")}
                      </div>
                    ) : (
                      <p className="text-sm italic text-[#7A3B3B]">
                        This chapter's text isn't available right now.
                      </p>
                    )}
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-[#C9A34E] mb-2 flex items-center gap-1.5">
                    <Sparkles size={14} /> Learning Notes
                  </h3>
                  {chapterState.notesPending ? (
                    <div className="py-4">
                      <div className="flex items-center gap-2 text-[#EDE6D6]/60 text-sm">
                        <Loader2 className="spin" size={16} /> Writing study notes&hellip;
                      </div>
                      <p className="text-[11px] text-[#EDE6D6]/35 mt-1">
                        About 40 seconds the first time; instant after that. Start reading meanwhile.
                      </p>
                    </div>
                  ) : chapterState.data.notesComing ? (
                    <p className="text-sm italic text-[#EDE6D6]/55">
                      Study notes for this chapter are being written and will appear here soon.
                    </p>
                  ) : chapterState.data.notesError ? (
                    <p className="text-sm italic text-[#EDE6D6]/55">
                      Study notes couldn't load: {chapterState.data.notesError}
                    </p>
                  ) : (
                    <>
                      {chapterState.data.explanationAvailable === false && (
                        <p className="text-xs italic text-[#EDE6D6]/50 mb-2">
                          Limited source coverage for this chapter — here's what's available:
                        </p>
                      )}
                      <div className="text-[15px] leading-relaxed text-[#EDE6D6]/85">
                        {renderLiteMarkdown(chapterState.data.explanation)}
                      </div>
                    </>
                  )}
                </div>

                {!completed.has(key) ? (
                  <button
                    onClick={markCompleted}
                    className="w-full rounded-full bg-[#C9A34E] text-[#12162a] font-semibold py-3 text-sm tracking-wide mb-4 hover:brightness-105 transition"
                  >
                    Mark this chapter learned
                  </button>
                ) : (
                  <div className="w-full rounded-full bg-white/10 text-[#C9A34E] font-medium py-3 text-sm text-center mb-4 flex items-center justify-center gap-2">
                    <Check size={15} /> Learned
                  </div>
                )}
              </>
            )}
          </>
        )}

        <p className="text-[10px] leading-relaxed text-[#EDE6D6]/30 mt-12">
          Scripture quotations taken from The Holy Bible, New International Version&reg; NIV&reg;.
          Copyright &copy; 1973, 1978, 1984, 2011 by Biblica, Inc.&trade; Used by permission.
          All rights reserved worldwide. Learning notes are AI-generated study aids, not Scripture.
        </p>
      </div>
    </div>
  );
}

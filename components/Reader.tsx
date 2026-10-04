"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { originOf } from "@/lib/celebrations";
import { verseLabel } from "@/lib/canon";
import { dayKey } from "@/lib/day";
import type { Block } from "@/lib/schemas";
import { highlightVerses, markChapterRead, memorize, saveNote, setLastRead, useStudy } from "@/lib/study-store";

/** A chapter only counts as read after this long on the page — skimming doesn't. */
const MIN_READ_MS = 20_000;

interface Props {
  blocks: Block[];
  translation: string;
  chapterId: string;
}

/** Collects the plain text of each verse in the chapter, for copy + note context. */
function verseTextMap(blocks: Block[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const block of blocks) {
    if (block.kind !== "para") continue;
    for (const segment of block.segments) {
      if (!segment.verseId) continue;
      map.set(segment.verseId, `${map.get(segment.verseId) ?? ""}${segment.text}`);
    }
  }
  return map;
}

function subscribeHash(listener: () => void): () => void {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

function useHash(): string {
  return useSyncExternalStore(
    subscribeHash,
    () => decodeURIComponent(window.location.hash.slice(1)),
    () => "",
  );
}

function sortVerseIds(ids: Iterable<string>): string[] {
  return [...ids].sort((a, b) => Number(a.split(".")[2]) - Number(b.split(".")[2]));
}

function NoteEditor({ verseId, initial }: { verseId: string; initial: string }): ReactNode {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="ws-stack"
      style={{ gap: 10, padding: 0 }}
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
        saveNote(verseId, draft, originOf(submitter));
        setSaved(true);
      }}
    >
      <textarea
        className="ws-textarea"
        rows={3}
        maxLength={5000}
        placeholder={`A note on ${verseLabel(verseId)}…`}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setSaved(false);
        }}
      />
      <div className="ws-pills ws-pills--start">
        <button type="submit" className="ws-pill">
          {saved ? "Saved" : "Save note"}
        </button>
      </div>
    </form>
  );
}

export function Reader({ blocks, translation, chapterId }: Props): ReactNode {
  const { highlights, notes, memory, days } = useStudy();
  const readToday = days[dayKey()]?.chapters.includes(chapterId) ?? false;
  const endMarker = useRef<HTMLDivElement>(null);
  const texts = useMemo(() => verseTextMap(blocks), [blocks]);
  // Arriving from search with #JHN.3.16 pre-selects that verse until the reader taps something.
  const hash = useHash();
  const hashSelection = useMemo(() => new Set(texts.has(hash) ? [hash] : []), [hash, texts]);
  const [userSelection, setUserSelection] = useState<Set<string> | null>(null);
  const selected = userSelection ?? hashSelection;
  const setSelected = setUserSelection;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLastRead(translation, chapterId);
  }, [translation, chapterId]);

  // Mark the chapter read once the end is on screen AND enough time has passed.
  useEffect(() => {
    const marker = endMarker.current;
    if (!marker) return;
    const openedAt = Date.now();
    let visible = false;
    let timer: number | undefined;
    const tryMark = (): void => {
      if (!visible) return;
      const remaining = MIN_READ_MS - (Date.now() - openedAt);
      if (remaining <= 0) markChapterRead(chapterId);
      else timer = window.setTimeout(tryMark, remaining);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      window.clearTimeout(timer);
      tryMark();
    });
    observer.observe(marker);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [chapterId]);

  const toggle = (verseId: string): void => {
    setCopied(false);
    setSelected((current) => {
      const next = new Set(current ?? hashSelection);
      if (next.has(verseId)) next.delete(verseId);
      else next.add(verseId);
      return next;
    });
  };

  const ordered = sortVerseIds(selected);
  const single = ordered.length === 1 ? ordered[0] : null;
  const rangeLabel = ordered.length > 1 ? `${verseLabel(ordered[0])}–${ordered.at(-1)?.split(".")[2]}` : ordered[0] ? verseLabel(ordered[0]) : "";
  const memoryId = ordered.join("+");
  const alreadyMemorizing = Boolean(memory[memoryId]);

  const addToMemory = (): void => {
    if (ordered.length === 0 || ordered.length > 3) return;
    memorize({
      reference: rangeLabel,
      text: ordered.map((id) => texts.get(id)?.trim() ?? "").join(" "),
      translation,
      verseIds: ordered,
    });
  };

  const copy = async (): Promise<void> => {
    const body = ordered.map((id) => `${id.split(".")[2]} ${texts.get(id)?.trim() ?? ""}`).join(" ");
    try {
      await navigator.clipboard.writeText(`${body}\n— ${rangeLabel} (${translation.toUpperCase()})`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  // The first segment of each verse carries its anchor id, so #JHN.3.16 scrolls to it.
  const anchored = new Set<string>();

  return (
    <>
      <div className="scripture">
        {blocks.map((block, blockIndex) => {
          if (block.kind === "heading") return <h3 key={blockIndex}>{block.text}</h3>;
          if (block.kind === "crossref") return <p key={blockIndex} className="crossref">{block.text}</p>;
          return (
            <p key={blockIndex} className={block.poetry ? "poetry" : undefined}>
              {block.segments.map((segment, segmentIndex) => {
                if (!segment.verseId) return <span key={segmentIndex}>{segment.text}</span>;
                const verseId = segment.verseId;
                const anchor = anchored.has(verseId) ? undefined : verseId;
                anchored.add(verseId);
                const classes = [
                  "verse",
                  highlights[verseId] ? "is-highlighted" : "",
                  selected.has(verseId) ? "is-selected" : "",
                ].join(" ");
                return (
                  <span
                    key={segmentIndex}
                    id={anchor}
                    className={classes}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected.has(verseId)}
                    onClick={() => toggle(verseId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggle(verseId);
                      }
                    }}
                  >
                    {segment.verseNumber && <sup className="verse__num">{segment.verseNumber}</sup>}
                    {segment.text}
                    {anchor && notes[verseId] && <span className="verse__note" title="Has a note" />}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>

      <div ref={endMarker} className="chapter-end" aria-live="polite">
        {readToday ? (
          <span className="ws-pill is-read" style={{ cursor: "default" }}>
            ✓ Read today
          </span>
        ) : (
          <span className="ws-muted">Read to here to mark this chapter · +10 XP</span>
        )}
      </div>

      {ordered.length > 0 && (
        <div className="selection-bar" role="region" aria-label="Selected verses">
          <div className="ws-row">
            <span className="ws-label">
              {ordered.length === 1 ? verseLabel(ordered[0]) : `${ordered.length} verses selected`}
            </span>
            <div className="ws-pills">
              <button type="button" className="ws-pill ws-pill--primary" onClick={(event) => highlightVerses(ordered, originOf(event.currentTarget))}>
                {ordered.every((id) => highlights[id]) ? "Remove highlight" : "Highlight"}
              </button>
              <button
                type="button"
                className="ws-pill"
                disabled={ordered.length > 3 || alreadyMemorizing}
                title={ordered.length > 3 ? "Pick up to 3 verses to memorize" : undefined}
                onClick={addToMemory}
              >
                {alreadyMemorizing ? "Memorizing ✓" : "Memorize"}
              </button>
              <button type="button" className="ws-pill" onClick={copy}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" className="ws-pill" onClick={() => setSelected(new Set())}>
                Done
              </button>
            </div>
          </div>
          {single && <NoteEditor key={single} verseId={single} initial={notes[single]?.text ?? ""} />}
          {!single && <span className="ws-muted">Select a single verse to write a note.</span>}
        </div>
      )}
    </>
  );
}

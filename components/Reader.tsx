"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { verseLabel } from "@/lib/canon";
import type { Block } from "@/lib/schemas";
import { highlightVerses, saveNote, setLastRead, useStudy } from "@/lib/study-store";

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
        saveNote(verseId, draft);
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
  const { highlights, notes } = useStudy();
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

  const copy = async (): Promise<void> => {
    const body = ordered.map((id) => `${id.split(".")[2]} ${texts.get(id)?.trim() ?? ""}`).join(" ");
    const reference = ordered.length > 1 ? `${verseLabel(ordered[0])}–${ordered.at(-1)?.split(".")[2]}` : verseLabel(ordered[0]);
    try {
      await navigator.clipboard.writeText(`${body}\n— ${reference} (${translation.toUpperCase()})`);
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

      {ordered.length > 0 && (
        <div className="selection-bar" role="region" aria-label="Selected verses">
          <div className="ws-row">
            <span className="ws-label">
              {ordered.length === 1 ? verseLabel(ordered[0]) : `${ordered.length} verses selected`}
            </span>
            <div className="ws-pills">
              <button type="button" className="ws-pill ws-pill--primary" onClick={() => highlightVerses(ordered)}>
                {ordered.every((id) => highlights[id]) ? "Remove highlight" : "Highlight"}
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

"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

import { BOOKS, getBook, parseVerseId, verseLabel } from "@/lib/canon";
import { exportStudy, importStudy, saveNote, useStudy } from "@/lib/study-store";

const bookOrder = new Map(BOOKS.map((book, index) => [book.id, index]));

function canonicalSort(a: string, b: string): number {
  const left = parseVerseId(a);
  const right = parseVerseId(b);
  if (!left || !right) return a.localeCompare(b);
  return (
    (bookOrder.get(left.bookId) ?? 0) - (bookOrder.get(right.bookId) ?? 0) ||
    left.chapter - right.chapter ||
    left.verse - right.verse
  );
}

export function NotesClient(): ReactNode {
  const { highlights, notes, translation } = useStudy();
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const verseIds = [...new Set([...Object.keys(highlights), ...Object.keys(notes)])]
    .filter((id) => parseVerseId(id) !== null)
    .sort(canonicalSort);

  const groups = new Map<string, string[]>();
  for (const id of verseIds) {
    const bookId = id.split(".")[0];
    groups.set(bookId, [...(groups.get(bookId) ?? []), id]);
  }

  const download = (): void => {
    const blob = new Blob([exportStudy()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `selah-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File): Promise<void> => {
    try {
      const ok = importStudy(await file.text());
      setMessage(ok ? "Imported." : "That file isn't a Selah export.");
    } catch {
      setMessage("Couldn't read that file.");
    }
  };

  return (
    <div className="reader ws-stack" style={{ paddingBlock: 0, gap: 30 }}>
      <div className="ws-pills">
        <button type="button" className="ws-pill" onClick={download}>
          Export JSON
        </button>
        <button type="button" className="ws-pill" onClick={() => fileInput.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
      </div>
      {message && (
        <p className="ws-muted" role="status" style={{ margin: 0, textAlign: "center" }}>
          {message}
        </p>
      )}

      {verseIds.length === 0 ? (
        <p className="ws-muted" style={{ textAlign: "center" }}>
          Nothing yet. Tap any verse while reading to highlight it or write a note.
        </p>
      ) : (
        [...groups.entries()].map(([bookId, ids]) => (
          <section key={bookId} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 className="ws-heading">{getBook(bookId)?.name ?? bookId}</h2>
            <ul className="ws-list">
              {ids.map((id) => {
                const ref = parseVerseId(id);
                const note = notes[id];
                return (
                  <li key={id}>
                    <div className="ws-row">
                      <Link className="ws-label" href={`/read/${translation}/${ref?.bookId}.${ref?.chapter}#${id}`}>
                        {verseLabel(id)}
                      </Link>
                      <span className="ws-muted">{highlights[id] ? "Highlighted" : ""}</span>
                    </div>
                    {note && <span style={{ whiteSpace: "pre-wrap" }}>{note.text}</span>}
                    {note && (
                      <div>
                        <button type="button" className="ws-pill ws-pill--sm" onClick={() => saveNote(id, "")}>
                          Delete note
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

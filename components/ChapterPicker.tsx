"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { BOOKS, getBook, type Book } from "@/lib/canon";
import { useStudy } from "@/lib/study-store";

interface Props {
  translation: string;
  bookId: string;
  chapter: number;
  label: string;
  /** Chapter ids that have written study notes. */
  notesReady?: ReadonlyArray<string>;
}

function BookList({ books, chosen, onChoose }: { books: ReadonlyArray<Book>; chosen: string; onChoose: (id: string) => void }): ReactNode {
  return (
    <div className="picker__books">
      {books.map((book) => (
        <button
          key={book.id}
          type="button"
          className="picker__book"
          aria-pressed={book.id === chosen}
          onClick={() => onChoose(book.id)}
        >
          {book.name}
        </button>
      ))}
    </div>
  );
}

export function ChapterPicker({ translation, bookId, chapter, label, notesReady = [] }: Props): ReactNode {
  const { chaptersRead } = useStudy();
  const [open, setOpen] = useState(false);
  const [chosenBook, setChosenBook] = useState(bookId);
  const book = getBook(chosenBook);
  const withNotes = new Set(notesReady);

  return (
    <>
      <button type="button" className="ws-pill" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {label} <span aria-hidden="true">{open ? "↑" : "↓"}</span>
      </button>
      {open && (
        <div className="picker" style={{ flexBasis: "100%" }}>
          <p className="ws-label">Old Testament</p>
          <BookList books={BOOKS.filter((item) => item.testament === "OT")} chosen={chosenBook} onChoose={setChosenBook} />
          <p className="ws-label">New Testament</p>
          <BookList books={BOOKS.filter((item) => item.testament === "NT")} chosen={chosenBook} onChoose={setChosenBook} />
          {book && (
            <>
              <hr className="ws-rule" />
              <p className="ws-label">{book.name}</p>
              <div className="picker__chapters">
                {Array.from({ length: book.chapters }, (_, index) => index + 1).map((number) => (
                  <Link
                    key={number}
                    href={`/read/${translation}/${book.id}.${number}`}
                    className={["ws-pill ws-pill--sm", chaptersRead[`${book.id}.${number}`] && "is-read", withNotes.has(`${book.id}.${number}`) && "has-notes"].filter(Boolean).join(" ")}
                    aria-current={book.id === bookId && number === chapter ? "page" : undefined}
                    title={[chaptersRead[`${book.id}.${number}`] && "Read", withNotes.has(`${book.id}.${number}`) && "Study notes"].filter(Boolean).join(" · ") || undefined}
                    onClick={() => setOpen(false)}
                  >
                    {number}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

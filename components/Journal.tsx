"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";

import { setJournal, useStudy } from "@/lib/study-store";

const SAVE_DELAY_MS = 500;

/** Private reflection box for one chapter, autosaved to this browser (and your account if signed in). */
export function Journal({ chapterId }: { chapterId: string }): ReactNode {
  const saved = useStudy().journal[chapterId]?.text ?? "";
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<string | null>(null);

  // Leaving the page flushes an unsaved edit instead of dropping it.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current !== null) setJournal(chapterId, pending.current);
    },
    [chapterId],
  );

  function onChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    const value = event.target.value;
    setDraft(value);
    setStatus("");
    pending.current = value;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setJournal(chapterId, value);
      pending.current = null;
      setStatus("Saved");
    }, SAVE_DELAY_MS);
  }

  return (
    <section className="journal" aria-labelledby="journal-label">
      <label id="journal-label" htmlFor="journal" className="ws-label">
        Your reflection
      </label>
      <textarea
        id="journal"
        className="journal__box"
        rows={5}
        value={draft ?? saved}
        onChange={onChange}
        placeholder="Write your answer to the reflection question, or anything this chapter stirred up. It stays private."
      />
      <p className="ws-muted journal__status" role="status">
        {status}
      </p>
    </section>
  );
}

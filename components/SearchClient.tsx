"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";

import { Fums } from "@/components/Fums";
import { TRANSLATIONS } from "@/lib/bibles";
import { originOf } from "@/lib/celebrations";
import { dayKey, dayNumber } from "@/lib/day";
import { SEARCH_TREASURE_OIL } from "@/lib/game";
import { claimSearchHunt, useStudy } from "@/lib/study-store";

/** One word a day to hunt for — find any verse containing it for bonus oil. */
const HUNT_WORDS = [
  "shepherd", "light", "bread", "mountain", "river", "lamp", "seed", "vine", "rock", "star",
  "harvest", "dove", "anchor", "olive", "crown", "fire", "garden", "door", "path", "salt",
];

function huntWord(day: string): string {
  return HUNT_WORDS[dayNumber(day) % HUNT_WORDS.length];
}

const resultSchema = z.object({
  total: z.number(),
  hits: z.array(z.object({ id: z.string(), reference: z.string(), text: z.string() })),
  fumsToken: z.string().nullable(),
});
const errorSchema = z.object({ error: z.string() });

type Hit = z.infer<typeof resultSchema>["hits"][number];

interface SearchState {
  hits: Hit[];
  total: number;
  token: string | null;
  status: "idle" | "loading" | "done" | "error";
  message: string | null;
}

const INITIAL: SearchState = { hits: [], total: 0, token: null, status: "idle", message: null };

async function fetchPage(query: string, translation: string, offset: number, signal: AbortSignal): Promise<z.infer<typeof resultSchema>> {
  const params = new URLSearchParams({ q: query, t: translation, offset: String(offset) });
  const response = await fetch(`/api/search?${params.toString()}`, { signal });
  const json: unknown = await response.json();
  if (!response.ok) {
    const parsed = errorSchema.safeParse(json);
    throw new Error(parsed.success ? parsed.data.error : "Search failed.");
  }
  return resultSchema.parse(json);
}

export function SearchClient(): ReactNode {
  const { translation: savedTranslation, searchHunts } = useStudy();
  const today = dayKey();
  const hunt = huntWord(today);
  const huntDone = Boolean(searchHunts[today]);
  const [translation, setTranslation] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>(INITIAL);
  const controller = useRef<AbortController | null>(null);
  const activeTranslation = translation ?? savedTranslation;

  const run = async (offset: number): Promise<void> => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setState(INITIAL);
      return;
    }
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setState((current) => ({ ...current, status: "loading", message: null, ...(offset === 0 ? { hits: [] } : {}) }));
    try {
      const page = await fetchPage(trimmed, activeTranslation, offset, abort.signal);
      setState((current) => ({
        hits: offset === 0 ? page.hits : [...current.hits, ...page.hits],
        total: page.total,
        token: page.fumsToken,
        status: "done",
        message: null,
      }));
    } catch (error) {
      if (abort.signal.aborted) return;
      setState({ ...INITIAL, status: "error", message: error instanceof Error ? error.message : "Search failed." });
    }
  };

  // Debounce typing by 350ms so we don't spend a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void run(0);
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run reads the latest query/translation
  }, [query, activeTranslation]);

  return (
    <div className="reader ws-stack" style={{ paddingBlock: 0, gap: 30 }}>
      <form
        className="ws-stack"
        style={{ gap: 14, padding: 0 }}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          void run(0);
        }}
      >
        <input
          className="ws-input"
          type="search"
          placeholder="Search a word or phrase — e.g. shepherd, “love one another”"
          aria-label="Search scripture"
          value={query}
          maxLength={80}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />
        <div className="ws-pills" role="group" aria-label="Translation">
          {TRANSLATIONS.map((option) => (
            <button
              key={option.slug}
              type="button"
              className="ws-pill ws-pill--sm"
              aria-pressed={option.slug === activeTranslation}
              title={option.name}
              onClick={() => setTranslation(option.slug)}
            >
              {option.abbreviation}
            </button>
          ))}
        </div>
      </form>

      <div className="hunt">
        <span className="ws-muted">Today&apos;s treasure hunt</span>
        {huntDone ? (
          <span>Found! Come back tomorrow for a new word.</span>
        ) : (
          <span>
            Open any verse containing <button type="button" className="hunt__word" onClick={() => setQuery(hunt)}>“{hunt}”</button> · +{SEARCH_TREASURE_OIL} oil
          </span>
        )}
      </div>

      <p className="ws-muted" aria-live="polite" style={{ margin: 0, textAlign: "center" }}>
        {state.status === "loading" && state.hits.length === 0 && "Searching…"}
        {state.status === "done" && (state.total === 0 ? "No verses found." : `${state.total.toLocaleString()} verses`)}
        {state.status === "error" && state.message}
      </p>

      {state.hits.length > 0 && (
        <ul className="ws-list">
          {state.hits.map((hit) => (
            <li key={hit.id}>
              <Link
                className="ws-label"
                href={`/read/${activeTranslation}/${hit.id.split(".").slice(0, 2).join(".")}#${hit.id}`}
                onClick={(event) => {
                  if (!huntDone && new RegExp(`\\b${hunt}`, "i").test(hit.text)) claimSearchHunt(today, hit.id, originOf(event.currentTarget));
                }}
              >
                {hit.reference}
              </Link>
              <span>{hit.text}</span>
            </li>
          ))}
        </ul>
      )}

      {state.hits.length > 0 && state.hits.length < state.total && (
        <div className="ws-pills">
          <button type="button" className="ws-pill" disabled={state.status === "loading"} onClick={() => void run(state.hits.length)}>
            {state.status === "loading" ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {state.token && <Fums token={state.token} />}
    </div>
  );
}

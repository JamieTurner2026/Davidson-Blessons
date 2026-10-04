"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";

// Everything personal lives in this browser only. One versioned key, Zod-checked on
// read so a corrupted or hand-edited value falls back to empty instead of crashing.

const STORAGE_KEY = "selah:v1";

const studySchema = z.object({
  highlights: z.record(z.string(), z.object({ createdAt: z.string() })).default({}),
  notes: z.record(z.string(), z.object({ text: z.string().max(5000), updatedAt: z.string() })).default({}),
  planProgress: z.record(z.string(), z.array(z.number().int())).default({}),
  activePlan: z.string().nullable().default(null),
  lastRead: z.object({ translation: z.string(), chapterId: z.string() }).nullable().default(null),
  translation: z.string().default("bsb"),
});

export type StudyState = z.infer<typeof studySchema>;
export type Highlights = StudyState["highlights"];

const EMPTY: StudyState = studySchema.parse({});

let cache: StudyState | null = null;
const listeners = new Set<() => void>();

function readStorage(): StudyState {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return EMPTY;
    const result = studySchema.safeParse(JSON.parse(rawValue));
    return result.success ? result.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): StudyState {
  if (cache === null) cache = readStorage();
  return cache;
}

function getServerSnapshot(): StudyState {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY) return;
    cache = readStorage();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(recipe: (state: StudyState) => StudyState): void {
  const next = recipe(getSnapshot());
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota: keep the in-memory state so the session still works.
  }
  listeners.forEach((listener) => listener());
}

export function useStudy(): StudyState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── Highlights ────────────────────────────────────────────────────

/**
 * Decides what tapping "Highlight" on a set of selected verses does.
 *
 * `selected` is one or more verse IDs the reader has tapped (e.g. ["JHN.3.16", "JHN.3.17"]).
 * Return the new highlights map — never mutate `current`.
 */
export function applyHighlight(current: Highlights, selected: string[], now: string): Highlights {
  // Group toggle: if every selected verse is already highlighted, clear them all;
  // otherwise highlight the whole selection (keeping existing createdAt stamps).
  // Matches the "Highlight" / "Remove highlight" label in the selection bar.
  const next = { ...current };
  const allHighlighted = selected.every((verseId) => Boolean(current[verseId]));
  for (const verseId of selected) {
    if (allHighlighted) delete next[verseId];
    else next[verseId] = current[verseId] ?? { createdAt: now };
  }
  return next;
}

export function highlightVerses(selected: string[]): void {
  update((state) => ({
    ...state,
    highlights: applyHighlight(state.highlights, selected, new Date().toISOString()),
  }));
}

// ── Notes ─────────────────────────────────────────────────────────

export function saveNote(verseId: string, text: string): void {
  update((state) => {
    const notes = { ...state.notes };
    const trimmed = text.trim().slice(0, 5000);
    if (trimmed) notes[verseId] = { text: trimmed, updatedAt: new Date().toISOString() };
    else delete notes[verseId];
    return { ...state, notes };
  });
}

// ── Reading position, translation & plans ─────────────────────────

export function setLastRead(translation: string, chapterId: string): void {
  const current = getSnapshot();
  if (current.lastRead?.chapterId === chapterId && current.lastRead.translation === translation) return;
  update((state) => ({ ...state, lastRead: { translation, chapterId }, translation }));
}

export function setActivePlan(planId: string | null): void {
  update((state) => ({ ...state, activePlan: planId }));
}

export function togglePlanDay(planId: string, day: number): void {
  update((state) => {
    const done = new Set(state.planProgress[planId] ?? []);
    if (done.has(day)) done.delete(day);
    else done.add(day);
    return {
      ...state,
      planProgress: { ...state.planProgress, [planId]: [...done].sort((a, b) => a - b) },
    };
  });
}

// ── Export / import ───────────────────────────────────────────────

export function exportStudy(): string {
  return JSON.stringify(getSnapshot(), null, 2);
}

/** Replaces local data with an exported file. Returns false if the file is invalid. */
export function importStudy(json: string): boolean {
  try {
    const result = studySchema.safeParse(JSON.parse(json));
    if (!result.success) return false;
    update(() => result.data);
    return true;
  } catch {
    return false;
  }
}

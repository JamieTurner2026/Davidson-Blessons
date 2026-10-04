"use client";

import { useSyncExternalStore } from "react";

// In-memory queue of things worth celebrating. The store pushes; <Celebrations/> drains.
// Nothing here is persisted — a reload simply means there's nothing to celebrate yet.

export interface Origin {
  x: number;
  y: number;
}

export type SoundName = "chime" | "page" | "quill" | "bell" | "tick" | "thud" | "pour";

export type Celebration =
  | { kind: "xp"; amount: number; oil: number; origin: Origin | null; note?: string; sound?: SoundName }
  | { kind: "goal" }
  | { kind: "level"; levelIndex: number }
  | { kind: "badge"; badgeId: string }
  | { kind: "book"; bookId: string };

interface QueuedCelebration {
  id: number;
  event: Celebration;
}

let queue: QueuedCelebration[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function celebrate(events: Celebration[]): void {
  if (events.length === 0) return;
  queue = [...queue, ...events.map((event) => ({ id: nextId++, event }))];
  emit();
}

export function dismiss(id: number): void {
  queue = queue.filter((item) => item.id !== id);
  emit();
}

const EMPTY: QueuedCelebration[] = [];

export function useCelebrations(): QueuedCelebration[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => queue,
    () => EMPTY,
  );
}

/** Centre of an element, for XP toasts that float up from where you acted. */
export function originOf(element: Element | null): Origin | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top };
}

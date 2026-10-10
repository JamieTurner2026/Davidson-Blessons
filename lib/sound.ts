"use client";

import type { SoundName } from "@/lib/celebrations";
import { soundEnabled } from "@/lib/study-store";

// Tiny sound layer: Magnific-generated effects in /public/sfx, played at low volume.
// Respects the in-app mute toggle (on by default, persisted in the study store).

const VOLUME: Record<SoundName, number> = {
  chime: 0.35,
  page: 0.45,
  bell: 0.3,
  tick: 0.35,
  thud: 0.3,
  pour: 0.4,
};

const cache = new Map<SoundName, HTMLAudioElement>();

function load(name: SoundName): HTMLAudioElement {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(`/sfx/${name}.mp3`);
    audio.preload = "auto";
    cache.set(name, audio);
  }
  return audio;
}

export function play(name: SoundName): void {
  if (typeof window === "undefined" || !soundEnabled()) return;
  try {
    const source = load(name);
    // Clone so rapid repeats (several ticks in a row) can overlap.
    const audio = source.cloneNode(true);
    if (!(audio instanceof HTMLAudioElement)) return;
    audio.volume = VOLUME[name];
    audio.play().catch(() => {
      // Autoplay blocked before the first interaction — silently skip.
    });
  } catch {
    // Audio unsupported — the app works the same without sound.
  }
}

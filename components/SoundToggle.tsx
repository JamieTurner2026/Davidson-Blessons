"use client";

import type { ReactNode } from "react";

import { play } from "@/lib/sound";
import { setSound, useStudy } from "@/lib/study-store";

export function SoundToggle(): ReactNode {
  const { sound } = useStudy();
  return (
    <button
      type="button"
      className="nav-icon"
      aria-pressed={sound}
      aria-label={sound ? "Mute sounds" : "Turn sounds on"}
      title={sound ? "Sounds on" : "Sounds off"}
      onClick={() => {
        setSound(!sound);
        if (!sound) window.setTimeout(() => play("tick"), 0);
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3 8h3l4-3.5v11L6 12H3z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        {sound ? (
          <path d="M13 7.5c1 .8 1.5 1.6 1.5 2.5s-.5 1.7-1.5 2.5M15 5.5c1.6 1.2 2.5 2.8 2.5 4.5s-.9 3.3-2.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        ) : (
          <path d="M13 8l4 4M17 8l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}

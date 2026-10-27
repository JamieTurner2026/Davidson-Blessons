"use client";

import Script from "next/script";
import { useEffect, type ReactNode } from "react";

// API.Bible Fair Use Management System. Every scripture response carries a fumsToken
// that must be reported when the text is shown. The v3 script drains `window.fumsData`
// on load and then replaces it with the live `window.fums` function.

type FumsCall = [command: string, payload: unknown];

declare global {
  interface Window {
    fums?: (command: string, payload: unknown) => void;
    fumsData?: FumsCall[];
  }
}

function track(token: string): void {
  if (typeof window.fums === "function") {
    window.fums("trackView", token);
    return;
  }
  window.fumsData = window.fumsData ?? [];
  window.fumsData.push(["trackView", token]);
}

export function Fums({ token }: { token: string | null }): ReactNode {
  useEffect(() => {
    if (token) track(token);
  }, [token]);

  return <Script src="https://pkg.api.bible/fumsV3.min.js" strategy="afterInteractive" />;
}

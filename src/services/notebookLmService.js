// Centralized NotebookLM bridge service. Every screen that needs chapter
// content goes through this module — never fetch() the bridge URL directly
// from a component. The bridge itself runs on the user's own machine
// (see notebooklm-mcp/README.md); this file only knows its public URL.
//
// Responses are cached in localStorage per "book:chapter" key, since each
// live query is a real NotebookLM RAG call (slow, and worth not repeating).
// Never fabricates content: if the bridge reports a chapter isn't in the
// notebook yet, that honest state is passed through as-is.

// Only fall back to the local bridge in dev; a deployed build with no bridge
// URL configured should say so plainly rather than silently try localhost.
const BRIDGE_URL =
  import.meta.env.VITE_NOTEBOOKLM_BRIDGE_URL ||
  (import.meta.env.DEV ? "http://localhost:8484" : "");
const BRIDGE_SECRET = import.meta.env.VITE_NOTEBOOKLM_BRIDGE_SECRET || "";
const CACHE_KEY = "davison-blesson-chapter-cache-v1";

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage unavailable (private browsing, quota) — cache is best-effort only
  }
}

// A new chapter takes the bridge 1-2+ minutes, so the bridge answers 202
// ("still working") right away and keeps fetching in the background; we
// check back every few seconds. No single request is held open long enough
// for a browser, extension, or sleeping tab to cut it off.
const POLL_MS = 4000;
const GIVE_UP_MS = 8 * 60 * 1000;
const MAX_NETWORK_RETRIES = 3;

const sleep = (ms, signal) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
  });

// onPartial(body) is called once, as soon as the bridge returns the Scripture
// (which it reads locally, instantly) while the study notes are still loading.
export async function getChapter(book, chapter, { forceRefresh = false, signal, onPartial } = {}) {
  const key = `${book}:${chapter}`;
  if (!forceRefresh) {
    const cached = readCache()[key];
    if (cached) return { ok: true, fromCache: true, ...cached };
  }

  if (!BRIDGE_URL) {
    return {
      ok: false,
      reason: "NOT_CONNECTED",
      message: "Live chapters aren't connected on this site yet — check back soon.",
    };
  }

  const url = `${BRIDGE_URL}/api/chapter?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chapter)}`;
  const deadline = Date.now() + GIVE_UP_MS;
  let networkFailures = 0;
  let sentPartial = false;
  let res;

  while (true) {
    if (signal?.aborted) return { ok: false, reason: "CANCELLED", message: "" };
    try {
      res = await fetch(url, { headers: { "X-App-Secret": BRIDGE_SECRET }, signal });
      networkFailures = 0;
    } catch {
      if (signal?.aborted) return { ok: false, reason: "CANCELLED", message: "" };
      if (++networkFailures > MAX_NETWORK_RETRIES) {
        return {
          ok: false,
          reason: "UNREACHABLE",
          message: "Can't reach NotebookLM right now. Make sure your bridge server is running.",
        };
      }
      await sleep(POLL_MS, signal);
      continue;
    }
    if (res.status !== 202) break;
    if (!sentPartial && onPartial) {
      try {
        const partial = await res.json();
        if (partial?.rawText) {
          onPartial({ ok: true, fromCache: false, ...partial });
          sentPartial = true;
        }
      } catch {
        // a 202 without a usable body just means keep waiting
      }
    }
    if (Date.now() > deadline) {
      return {
        ok: false,
        reason: "TIMEOUT",
        message: "NotebookLM is taking unusually long. Try this chapter again in a few minutes.",
      };
    }
    await sleep(POLL_MS, signal);
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // fall through with body = null
  }

  if (!res.ok) {
    return {
      ok: false,
      reason: body?.reason || `HTTP_${res.status}`,
      message: body?.message || "Unable to load this chapter right now.",
    };
  }

  // Don't remember a chapter whose notes failed — let the next visit retry them.
  if (!body?.notesError) {
    const cache = readCache();
    cache[key] = body;
    writeCache(cache);
  }

  return { ok: true, fromCache: false, ...body };
}

export function clearChapterCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

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

export async function getChapter(book, chapter, { forceRefresh = false } = {}) {
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

  let res;
  try {
    res = await fetch(
      `${BRIDGE_URL}/api/chapter?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chapter)}`,
      { headers: { "X-App-Secret": BRIDGE_SECRET } }
    );
  } catch {
    return {
      ok: false,
      reason: "UNREACHABLE",
      message: "Can't reach NotebookLM right now. Make sure your bridge server is running.",
    };
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

  const cache = readCache();
  cache[key] = body;
  writeCache(cache);

  return { ok: true, fromCache: false, ...body };
}

export function clearChapterCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

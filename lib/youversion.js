// Server-side-only client for the YouVersion Platform API.
// This file must never be imported from src/ (browser code) — it reads
// process.env.YVP_APP_KEY, which must stay server-side. Only the files in
// /api are allowed to import this module; those run as Vercel serverless
// functions, never in the browser.
//
// Endpoint paths below are confirmed against YouVersion's own public API
// reference (developers.youversion.com/api/licenses) as of this writing:
//   GET /v1/licenses
//   GET /v1/bibles
//   GET /v1/bibles/{bible_id}
//   GET /v1/bibles/{bible_id}/index
//   GET /v1/bibles/{bible_id}/books
//   GET /v1/bibles/{bible_id}/books/{book_id}/chapters
//   GET /v1/bibles/{bible_id}/books/{book_id}/chapters/{chapter_id}/verses
//   GET /v1/bibles/{bible_id}/passages/{passage}
// The exact JSON field names on each response (e.g. whether a Bible's id
// field is `id` or `bible_id`) were not visible in the public docs and are
// defended against defensively below. Once a real YVP_APP_KEY is available,
// call GET /v1/bibles once and confirm the field names match — adjust the
// `pickId` / `pickAbbrev` helpers if not.

const BASE_URL = "https://api.youversion.com";

export class YouVersionError extends Error {
  constructor(code, publicMessage, detail) {
    super(publicMessage);
    this.code = code;
    this.publicMessage = publicMessage;
    this.detail = detail;
  }
}

function requireAppKey() {
  const key = process.env.YVP_APP_KEY;
  if (!key) {
    throw new YouVersionError(
      "MISSING_APP_KEY",
      "NIV access is not configured on the server yet (YVP_APP_KEY is missing)."
    );
  }
  return key;
}

async function yvFetch(path, { params } = {}) {
  const appKey = requireAppKey();
  const url = new URL(BASE_URL + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
  }

  let res;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "X-YVP-App-Key": appKey,
        Accept: "application/json"
      }
    });
  } catch (networkErr) {
    throw new YouVersionError(
      "NETWORK_ERROR",
      "Could not reach the NIV Scripture provider. Please try again.",
      networkErr.message
    );
  }

  if (res.status === 401) {
    throw new YouVersionError(
      "UNAUTHORIZED",
      "The Scripture provider rejected our credentials.",
      await safeText(res)
    );
  }
  if (res.status === 403) {
    throw new YouVersionError(
      "FORBIDDEN",
      "This app does not have permission to access that resource.",
      await safeText(res)
    );
  }
  if (res.status === 404) {
    throw new YouVersionError(
      "NOT_FOUND",
      "That passage isn't available.",
      await safeText(res)
    );
  }
  if (res.status === 429) {
    throw new YouVersionError(
      "RATE_LIMITED",
      "Too many requests right now — please try again shortly.",
      res.headers.get("retry-after")
    );
  }
  if (res.status >= 500) {
    throw new YouVersionError(
      "PROVIDER_ERROR",
      "The Scripture provider is having trouble right now.",
      await safeText(res)
    );
  }
  if (!res.ok) {
    throw new YouVersionError(
      "UNKNOWN_ERROR",
      "Unable to load NIV Scripture right now. Please try again.",
      await safeText(res)
    );
  }

  return res.json();
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return null;
  }
}

function pickId(obj) {
  return obj?.id ?? obj?.bible_id ?? obj?.version_id ?? null;
}

function pickAbbreviation(obj) {
  return (
    obj?.abbreviation ??
    obj?.abbr ??
    obj?.short_name ??
    obj?.code ??
    null
  );
}

function pickTitle(obj) {
  return obj?.title ?? obj?.name ?? obj?.local_title ?? null;
}

function isEnglishNiv(bible) {
  const abbr = String(pickAbbreviation(bible) || "").toUpperCase();
  const title = String(pickTitle(bible) || "").toLowerCase();
  const language =
    bible?.language?.name ||
    bible?.language ||
    bible?.language_tag ||
    bible?.locale ||
    "";
  const isEnglish = String(language).toLowerCase().startsWith("en");
  const looksLikeNiv =
    abbr === "NIV" || title.includes("new international version");
  return looksLikeNiv && (isEnglish || language === "");
}

// In-memory memoization for the lifetime of one warm serverless instance.
// Serverless cold starts will re-verify — this is a light optimization,
// not a durable cache, and is intentionally simple.
let cachedNivVersion = null;

export async function verifyNivAccess({ forceRefresh = false } = {}) {
  if (cachedNivVersion && !forceRefresh) {
    return { configured: true, ...cachedNivVersion };
  }

  requireAppKey(); // fail fast with a clean error if not configured at all

  const biblesResponse = await yvFetch("/v1/bibles");
  const bibleList =
    biblesResponse?.data ?? biblesResponse?.bibles ?? biblesResponse ?? [];
  const nivCandidates = (Array.isArray(bibleList) ? bibleList : []).filter(
    isEnglishNiv
  );

  if (nivCandidates.length === 0) {
    return {
      configured: false,
      reason: "NIV_NOT_FOUND",
      message:
        "No NIV version was found in this app's available Bible catalog."
    };
  }

  const licensesResponse = await yvFetch("/v1/licenses");
  const licenseList =
    licensesResponse?.data ?? licensesResponse?.licenses ?? licensesResponse ?? [];
  const licensedBibleIds = new Set(
    (Array.isArray(licenseList) ? licenseList : []).flatMap(
      (l) => l?.bible_ids ?? l?.bibleIds ?? []
    )
  );

  const licensedNiv = nivCandidates.find((b) =>
    licensedBibleIds.has(pickId(b))
  );

  if (!licensedNiv) {
    return {
      configured: false,
      reason: "NIV_NOT_LICENSED",
      message:
        "NIV was found but this app's YouVersion Platform key does not have license access to it yet. Ask for NIV access to be enabled for this App Key."
    };
  }

  cachedNivVersion = {
    versionId: pickId(licensedNiv),
    versionName: pickTitle(licensedNiv) || "New International Version",
    versionAbbreviation: pickAbbreviation(licensedNiv) || "NIV"
  };

  return { configured: true, ...cachedNivVersion };
}

async function getNivVersionIdOrThrow() {
  const status = await verifyNivAccess();
  if (!status.configured) {
    throw new YouVersionError(status.reason || "NIV_NOT_CONFIGURED", status.message);
  }
  return status.versionId;
}

export async function getBooks() {
  const versionId = await getNivVersionIdOrThrow();
  return yvFetch(`/v1/bibles/${versionId}/books`);
}

export async function getChapters(bookId) {
  const versionId = await getNivVersionIdOrThrow();
  return yvFetch(`/v1/bibles/${versionId}/books/${bookId}/chapters`);
}

export async function getVerses(bookId, chapterId) {
  const versionId = await getNivVersionIdOrThrow();
  return yvFetch(
    `/v1/bibles/${versionId}/books/${bookId}/chapters/${chapterId}/verses`
  );
}

// `reference` should be a USFM-style reference, e.g. "JHN.3" for a whole
// chapter or "JHN.3.16" for a single verse. See lib/usfmBooks.js for the
// book code table.
export async function getPassage(reference) {
  const versionId = await getNivVersionIdOrThrow();
  const data = await yvFetch(
    `/v1/bibles/${versionId}/passages/${encodeURIComponent(reference)}`
  );
  return { versionAbbreviation: "NIV", reference, ...data };
}

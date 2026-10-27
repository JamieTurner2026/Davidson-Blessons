// TEMPORARY diagnostic: reports whether API_BIBLE_KEY reaches this deployment and what
// API.Bible answers. It never returns the key or any part of it. Delete once chapters load.
export const dynamic = "force-dynamic";

const TEST_URL = "https://rest.api.bible/v1/bibles/bba9f40183526463-01/chapters/JHN.1?content-type=text";

export async function GET(): Promise<Response> {
  const key = process.env.API_BIBLE_KEY;
  const info: Record<string, unknown> = {
    keyPresent: Boolean(key),
    keyLength: key?.length ?? 0,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };
  if (key) {
    try {
      const response = await fetch(TEST_URL, { headers: { "api-key": key, accept: "application/json" }, cache: "no-store" });
      info.upstreamStatus = response.status;
      if (!response.ok) info.upstreamBody = (await response.text()).slice(0, 120);
    } catch (error) {
      info.fetchError = error instanceof Error ? error.name : "unknown";
    }
  }
  return Response.json(info, { headers: { "cache-control": "no-store" } });
}

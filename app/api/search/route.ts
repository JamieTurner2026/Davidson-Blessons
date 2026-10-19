import { NextResponse, type NextRequest } from "next/server";

import { ApiBibleError, searchScripture } from "@/lib/apibible";
import { getTranslation } from "@/lib/bibles";
import { searchQuerySchema, type SearchResult } from "@/lib/schemas";

// The only public endpoint: proxies API.Bible search so the key never leaves the server.
export async function GET(request: NextRequest): Promise<NextResponse<SearchResult | { error: string }>> {
  const parsed = searchQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    const badQuery = parsed.error.issues.some((issue) => issue.path[0] === "q");
    return NextResponse.json({ error: badQuery ? "Search needs 2–80 characters." : "Invalid search request." }, { status: 400 });
  }
  const translation = getTranslation(parsed.data.t);
  if (!translation) {
    return NextResponse.json({ error: "Unknown translation." }, { status: 400 });
  }

  try {
    const result = await searchScripture(translation, parsed.data.q, parsed.data.offset);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    const status = error instanceof ApiBibleError && error.status < 500 ? 400 : 502;
    return NextResponse.json({ error: "Search is unavailable right now." }, { status });
  }
}

import { NextResponse } from "next/server";

// Daily cron (vercel.json): free Supabase projects pause after 7 idle days, which would
// break sign-in. Calls the harmless `ping()` function with the public key.

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, reason: "not configured" }, { status: 503 });
  try {
    const response = await fetch(`${url}/rest/v1/rpc/ping`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    return NextResponse.json({ ok: response.ok }, { status: response.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}

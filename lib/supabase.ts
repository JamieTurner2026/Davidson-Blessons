"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// Browser-only Supabase client for optional accounts. The publishable key is public by
// design; Row Level Security limits every signed-in reader to their own `progress` row.

const envSchema = z.object({
  url: z.url(),
  key: z.string().min(20),
});

let client: SupabaseClient | null | undefined;

/** The shared client, or null on the server or when accounts aren't configured (Selah still works signed out). */
export function supabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (client !== undefined) return client;
  // Referenced literally so Next inlines them into the client bundle.
  const env = envSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  client = env.success
    ? createClient(env.data.url, env.data.key, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          // /auth/callback exchanges the code itself, exactly once.
          detectSessionInUrl: false,
          storageKey: "selah:auth",
        },
      })
    : null;
  return client;
}

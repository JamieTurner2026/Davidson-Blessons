"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";

import { finishSignIn } from "@/lib/sync";

const paramsSchema = z.object({
  code: z.string().min(1).max(512).optional(),
  error_description: z.string().max(300).optional(),
});

/** Lands here from the email link or Google, finishes sign-in, then returns to the account panel. */
export function SignInCallback(): ReactNode {
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const params = paramsSchema.safeParse(Object.fromEntries(new URLSearchParams(window.location.search)));
    const run = async (): Promise<void> => {
      if (!params.success || !params.data.code) {
        setProblem(params.success && params.data.error_description ? params.data.error_description : "This sign-in link is missing its code.");
        return;
      }
      const error = await finishSignIn(params.data.code);
      // PKCE: the link only completes in the browser that asked for it (it holds the verifier).
      if (error) setProblem("That sign-in link didn't work. Links work once, expire after an hour, and must be opened in the same browser you requested them from. Request a new one and try again.");
      else router.replace("/journey#account");
    };
    void run();
  }, [router]);

  return problem ? (
    <>
      <h1 className="ws-heading">Couldn&apos;t sign you in</h1>
      <p className="ws-muted" role="alert">
        {problem}
      </p>
      <Link className="ws-pill" href="/journey#account">
        Try again
      </Link>
    </>
  ) : (
    <p className="ws-muted" role="status">
      Signing you in…
    </p>
  );
}

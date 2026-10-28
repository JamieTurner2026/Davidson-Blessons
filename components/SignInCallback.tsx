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

/** Lands here from the account-confirmation email, finishes sign-in, then opens the app. */
export function SignInCallback(): ReactNode {
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const params = paramsSchema.safeParse(Object.fromEntries(new URLSearchParams(window.location.search)));
    const run = async (): Promise<void> => {
      if (!params.success || !params.data.code) {
        setProblem(params.success && params.data.error_description ? params.data.error_description : "This link is missing its code.");
        return;
      }
      const error = await finishSignIn(params.data.code);
      // PKCE: the link only completes in the browser that asked for it (it holds the verifier).
      if (error) setProblem("That confirmation link didn't work. Links work once and expire after a day. Try signing in: if your account is already confirmed, it will just work.");
      else router.replace("/");
    };
    void run();
  }, [router]);

  return problem ? (
    <>
      <h1 className="ws-heading">Couldn&apos;t sign you in</h1>
      <p className="ws-muted" role="alert">
        {problem}
      </p>
      <Link className="ws-pill" href="/">
        Go to sign in
      </Link>
    </>
  ) : (
    <p className="ws-muted" role="status">
      Signing you in…
    </p>
  );
}

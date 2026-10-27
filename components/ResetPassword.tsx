"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";

import { finishSignIn, PASSWORD_MIN, setNewPassword } from "@/lib/sync";

const paramsSchema = z.object({
  code: z.string().min(1).max(512).optional(),
  error_description: z.string().max(300).optional(),
});

/** Lands here from a password-reset email: signs the reader in with the link, then asks for a new password. */
export function ResetPassword(): ReactNode {
  const router = useRouter();
  const [stage, setStage] = useState<"checking" | "ready" | "failed">("checking");
  const [problem, setProblem] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = paramsSchema.safeParse(Object.fromEntries(new URLSearchParams(window.location.search)));
    const run = async (): Promise<void> => {
      if (!params.success || !params.data.code) {
        setProblem(params.success && params.data.error_description ? params.data.error_description : "This reset link is missing its code.");
        setStage("failed");
        return;
      }
      const error = await finishSignIn(params.data.code);
      if (error) {
        setProblem("That reset link didn't work. Links work once, expire after an hour, and must be opened in the browser you requested them from.");
        setStage("failed");
      } else setStage("ready");
    };
    void run();
  }, []);

  const save = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (password !== confirm) {
      setProblem("The two passwords don't match.");
      return;
    }
    setBusy(true);
    const error = await setNewPassword(password);
    setBusy(false);
    if (error) setProblem(error);
    else router.replace("/");
  };

  if (stage === "checking") {
    return (
      <p className="ws-muted" role="status">
        Checking your link…
      </p>
    );
  }
  if (stage === "failed") {
    return (
      <>
        <h1 className="ws-heading">Couldn&apos;t reset your password</h1>
        <p className="ws-muted" role="alert">
          {problem}
        </p>
        <Link className="ws-pill" href="/">
          Back to sign in
        </Link>
      </>
    );
  }
  return (
    <form className="ws-stack gate__panel" onSubmit={(event) => void save(event)} noValidate>
      <h1 className="ws-heading">Choose a new password</h1>
      <label htmlFor="reset-password" className="ws-label">
        New password (at least {PASSWORD_MIN} characters)
      </label>
      <input
        id="reset-password"
        className="ws-input"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        maxLength={72}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <label htmlFor="reset-confirm" className="ws-label">
        Confirm new password
      </label>
      <input
        id="reset-confirm"
        className="ws-input"
        type="password"
        autoComplete="new-password"
        required
        maxLength={72}
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
      />
      <div className="ws-pills ws-pills--start">
        <button type="submit" className="ws-pill ws-pill--primary" disabled={busy}>
          {busy ? "Saving…" : "Save new password"}
        </button>
      </div>
      {problem && (
        <p className="ws-muted gate__message" role="alert">
          {problem}
        </p>
      )}
    </form>
  );
}

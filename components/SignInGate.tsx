"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { createAccount, PASSWORD_MIN, signInWithPassword, useAccount, USERNAME_RULES } from "@/lib/sync";

// Sign-in is required: everything except the /auth/* link pages waits behind this screen,
// so each reader studies in their own account with their own progress.
//
// This is a sign-in requirement, not a wall around the content: Scripture is public, and
// pages are still rendered on the server. What it protects is each person's own progress,
// which Supabase's row-level security keeps readable by its owner only.

type Mode = "sign-in" | "create" | "forgot";

function Field({
  id,
  label,
  value,
  onChange,
  type,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: "text" | "password";
  autoComplete: "username" | "current-password" | "new-password";
}): ReactNode {
  return (
    <div className="ws-stack" style={{ gap: 6, padding: 0 }}>
      <label htmlFor={id} className="ws-label">
        {label}
      </label>
      <input
        id={id}
        className="ws-input"
        type={type}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        required
        maxLength={type === "password" ? 72 : 24}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SignInScreen(): ReactNode {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const switchTo = (next: Mode): void => {
    setMode(next);
    setProblem(null);
    setPassword("");
    setConfirm("");
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setProblem(null);
    if (mode === "create" && password !== confirm) {
      setProblem("The two passwords don't match.");
      return;
    }
    setBusy(true);
    const error = mode === "create" ? await createAccount(username, password) : await signInWithPassword(username, password);
    setBusy(false);
    if (error) setProblem(error);
  };

  const title = mode === "create" ? "Create your account" : mode === "forgot" ? "Forgot your password?" : "Welcome back";

  return (
    <div className="gate">
      <Image src="/art/hero.webp" alt="" width={1200} height={800} priority className="gate__art" />
      <div className="ws-stack gate__panel">
        <span className="ws-muted">Davidson Blessons</span>
        <h1 className="ws-heading">{title}</h1>
        {mode === "forgot" ? (
          <p className="ws-muted">
            Accounts don&apos;t use email, so the password can&apos;t be reset from here. Ask the person who runs Davidson
            Blessons to set a new one for your username, then sign in and change it on your Journey page.
          </p>
        ) : (
          <>
            <p className="ws-muted">
              Sign in to keep your own reading progress, journal, highlights and memory verses, on any device. No email needed.
            </p>
            <form className="ws-stack" style={{ gap: 14, padding: 0 }} onSubmit={(event) => void submit(event)} noValidate>
              <Field
                id="gate-username"
                label={mode === "create" ? `Choose a username (${USERNAME_RULES})` : "Username"}
                value={username}
                onChange={setUsername}
                type="text"
                autoComplete="username"
              />
              <Field
                id="gate-password"
                label={mode === "create" ? `Choose a password (at least ${PASSWORD_MIN} characters)` : "Password"}
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete={mode === "create" ? "new-password" : "current-password"}
              />
              {mode === "create" && (
                <Field id="gate-confirm" label="Type the password again" value={confirm} onChange={setConfirm} type="password" autoComplete="new-password" />
              )}
              <div className="ws-pills ws-pills--start">
                <button type="submit" className="ws-pill ws-pill--primary" disabled={busy}>
                  {busy ? "One moment…" : mode === "create" ? "Create account" : "Sign in"}
                </button>
              </div>
            </form>
            {mode === "create" && (
              <p className="ws-muted gate__message">Write your password down somewhere safe: there&apos;s no email to recover it.</p>
            )}
          </>
        )}
        {problem && (
          <p className="ws-muted gate__message" role="alert">
            {problem}
          </p>
        )}
        <div className="ws-pills ws-pills--start">
          {mode !== "sign-in" && (
            <button type="button" className="ws-pill ws-pill--sm" onClick={() => switchTo("sign-in")}>
              {mode === "forgot" ? "Back to sign in" : "I have an account"}
            </button>
          )}
          {mode !== "create" && (
            <button type="button" className="ws-pill ws-pill--sm" onClick={() => switchTo("create")}>
              Create an account
            </button>
          )}
          {mode === "sign-in" && (
            <button type="button" className="ws-pill ws-pill--sm" onClick={() => switchTo("forgot")}>
              Forgot password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Wraps the whole app (see app/layout.tsx): shows the sign-in screen until someone is signed in. */
export function SignInGate({ children }: { children: ReactNode }): ReactNode {
  const account = useAccount();
  const pathname = usePathname();

  // Supabase auth link pages must open without being signed in.
  if (pathname.startsWith("/auth/")) return children;

  if (account.ready && account.userId) return children;
  return (
    <main className="ws-container">
      {!account.ready ? (
        <p className="ws-muted gate__loading" role="status">
          Loading…
        </p>
      ) : account.status === "off" ? (
        <div className="ws-stack gate__panel" style={{ margin: "60px auto" }}>
          <h1 className="ws-heading">Sign-in isn&apos;t available right now</h1>
          <p className="ws-muted">Davidson Blessons needs an account to save your study progress. Please try again later.</p>
        </div>
      ) : (
        <SignInScreen />
      )}
    </main>
  );
}

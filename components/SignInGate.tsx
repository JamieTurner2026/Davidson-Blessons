"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { createAccount, PASSWORD_MIN, sendPasswordReset, signInWithPassword, useAccount } from "@/lib/sync";

// Sign-in is required: everything except the /auth/* link pages waits behind this screen,
// so each reader studies in their own account with their own progress.
//
// This is a sign-in requirement, not a wall around the content: Scripture is public, and
// pages are still rendered on the server. What it protects is each person's own progress,
// which Supabase's row-level security keeps readable by its owner only.

type Mode = "sign-in" | "create" | "forgot";

function EmailField({ value, onChange }: { value: string; onChange: (value: string) => void }): ReactNode {
  return (
    <div className="ws-stack" style={{ gap: 6, padding: 0 }}>
      <label htmlFor="gate-email" className="ws-label">
        Email
      </label>
      <input
        id="gate-email"
        className="ws-input"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        maxLength={254}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
}): ReactNode {
  return (
    <div className="ws-stack" style={{ gap: 6, padding: 0 }}>
      <label htmlFor={id} className="ws-label">
        {label}
      </label>
      <input
        id={id}
        className="ws-input"
        type="password"
        autoComplete={autoComplete}
        required
        minLength={autoComplete === "new-password" ? PASSWORD_MIN : undefined}
        maxLength={72}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SignInScreen(): ReactNode {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchTo = (next: Mode): void => {
    setMode(next);
    setProblem(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setProblem(null);
    setNotice(null);
    if (mode === "create" && password !== confirm) {
      setProblem("The two passwords don't match.");
      return;
    }
    setBusy(true);
    if (mode === "sign-in") {
      const error = await signInWithPassword(email, password);
      if (error) setProblem(error);
    } else if (mode === "create") {
      const result = await createAccount(email, password);
      if (!result.ok) setProblem(result.error);
      else if (result.confirm) {
        setMode("sign-in");
        setPassword("");
        setConfirm("");
        setNotice(`Almost there: we sent a confirmation link to ${email.trim()}. Open it, then sign in here.`);
      }
    } else {
      const error = await sendPasswordReset(email);
      if (error) setProblem(error);
      else setNotice(`If there's an account for ${email.trim()}, a link to choose a new password is on its way. Open it in this browser.`);
    }
    setBusy(false);
  };

  const title = mode === "create" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";
  const action = mode === "create" ? "Create account" : mode === "forgot" ? "Email me a reset link" : "Sign in";

  return (
    <div className="gate">
      <Image src="/art/hero.webp" alt="" width={1200} height={800} priority className="gate__art" />
      <div className="ws-stack gate__panel">
        <span className="ws-muted">Davidson Blessons</span>
        <h1 className="ws-heading">{title}</h1>
        <p className="ws-muted">
          {mode === "forgot"
            ? "Enter the email you signed up with and we'll send you a link."
            : "Sign in to keep your own reading progress, journal, highlights and memory verses, on any device."}
        </p>
        <form className="ws-stack" style={{ gap: 14, padding: 0 }} onSubmit={(event) => void submit(event)} noValidate>
          <EmailField value={email} onChange={setEmail} />
          {mode !== "forgot" && (
            <PasswordField
              id="gate-password"
              label={mode === "create" ? `Password (at least ${PASSWORD_MIN} characters)` : "Password"}
              value={password}
              onChange={setPassword}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
            />
          )}
          {mode === "create" && (
            <PasswordField id="gate-confirm" label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          )}
          <div className="ws-pills ws-pills--start">
            <button type="submit" className="ws-pill ws-pill--primary" disabled={busy}>
              {busy ? "One moment…" : action}
            </button>
          </div>
        </form>
        {problem && (
          <p className="ws-muted gate__message" role="alert">
            {problem}
          </p>
        )}
        {notice && (
          <p className="gate__message" role="status">
            {notice}
          </p>
        )}
        <div className="ws-pills ws-pills--start">
          {mode !== "sign-in" && (
            <button type="button" className="ws-pill ws-pill--sm" onClick={() => switchTo("sign-in")}>
              I have an account
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

  // Confirmation and password-reset links must open without being signed in.
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

"use client";

import { useState, type ReactNode } from "react";

import { BackupPanel } from "@/components/BackupPanel";
import { deleteSyncedProgress, sendSignInLink, signInWithGoogle, signOut, useAccount, type AccountState } from "@/lib/sync";

function syncLine(account: AccountState): string {
  if (account.status === "syncing") return "Syncing…";
  if (account.status === "offline") return account.error ?? "Offline — will sync later.";
  if (account.lastSyncedAt) {
    const time = new Date(account.lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `Synced at ${time}`;
  }
  return "Synced";
}

function SignedOut(): ReactNode {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const sendLink = async (): Promise<void> => {
    setBusy(true);
    setProblem(null);
    const error = await sendSignInLink(email);
    setBusy(false);
    if (error) setProblem(error);
    else setSent(true);
  };

  const google = async (): Promise<void> => {
    setProblem(null);
    const error = await signInWithGoogle();
    if (error) setProblem(error);
  };

  if (sent) {
    return (
      <div className="ws-stack" style={{ gap: 10, padding: 0 }} role="status">
        <strong style={{ fontWeight: 500 }}>Check your inbox</strong>
        <span className="ws-muted">
          We sent a sign-in link to {email.trim()}. Open it in this browser. It works once and expires in an hour.
        </span>
        <div className="ws-pills ws-pills--start">
          <button type="button" className="ws-pill ws-pill--sm" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-stack" style={{ gap: 14, padding: 0 }}>
      <span className="ws-muted">
        Optional. Sign in to save your progress to an account and pick it up on any device. Nothing changes if you don&apos;t.
      </span>
      <form
        className="ws-pills ws-pills--start"
        onSubmit={(event) => {
          event.preventDefault();
          void sendLink();
        }}
      >
        <label htmlFor="account-email" className="sr-only">
          Email
        </label>
        <input
          id="account-email"
          className="ws-input"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={254}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{ flex: "1 1 220px" }}
        />
        <button type="submit" className="ws-pill ws-pill--primary" disabled={busy}>
          {busy ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      <div className="ws-pills ws-pills--start">
        <button type="button" className="ws-pill" onClick={() => void google()}>
          Continue with Google
        </button>
      </div>
      {problem && (
        <span className="ws-muted" role="alert">
          {problem}
        </span>
      )}
    </div>
  );
}

const CONFIRM_WORD = "DELETE";

function SignedIn({ account }: { account: AccountState }): ReactNode {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const remove = async (): Promise<void> => {
    const error = await deleteSyncedProgress();
    if (error) setProblem(error);
    else {
      setConfirming(false);
      setTyped("");
    }
  };

  return (
    <div className="ws-stack" style={{ gap: 14, padding: 0 }}>
      <span>
        Signed in as <strong style={{ fontWeight: 500 }}>{account.email ?? "your account"}</strong>
      </span>
      <span className="ws-muted" role="status">
        {syncLine(account)}
      </span>
      <div className="ws-pills ws-pills--start">
        <button type="button" className="ws-pill" onClick={() => void signOut()}>
          Sign out
        </button>
        <button type="button" className="ws-pill" onClick={() => setConfirming((value) => !value)} aria-expanded={confirming}>
          Delete synced progress
        </button>
      </div>
      <span className="ws-muted">Signing out keeps your progress in this browser.</span>
      {confirming && (
        <div className="ws-stack" style={{ gap: 10, padding: 0 }}>
          <label htmlFor="account-delete-confirm" className="ws-muted">
            This removes the copy saved to your account and signs you out. This browser keeps its copy. Type {CONFIRM_WORD} to confirm.
          </label>
          <div className="ws-pills ws-pills--start">
            <input
              id="account-delete-confirm"
              className="ws-input"
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              style={{ flex: "1 1 160px" }}
            />
            <button type="button" className="ws-pill" disabled={typed !== CONFIRM_WORD} onClick={() => void remove()}>
              Delete and sign out
            </button>
          </div>
        </div>
      )}
      {problem && (
        <span className="ws-muted" role="alert">
          {problem}
        </span>
      )}
    </div>
  );
}

/** Journey page: optional sign-in + sync, with the backup file as a quieter alternative. */
export function AccountPanel(): ReactNode {
  const account = useAccount();
  return (
    <section id="account" style={{ display: "flex", flexDirection: "column", gap: 22, scrollMarginTop: 30 }}>
      <h2 className="ws-heading">Your account</h2>
      {account.status === "off" ? (
        <span className="ws-muted">Accounts aren&apos;t available right now. Your progress is saved in this browser.</span>
      ) : account.userId ? (
        <SignedIn account={account} />
      ) : (
        <SignedOut />
      )}
      <details className="account__backup">
        <summary className="ws-muted">No account? Move your progress with a text code or backup</summary>
        <BackupPanel heading={false} />
      </details>
    </section>
  );
}

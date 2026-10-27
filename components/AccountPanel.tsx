"use client";

import { useState, type ReactNode } from "react";

import { BackupPanel } from "@/components/BackupPanel";
import { deleteSyncedProgress, signOut, useAccount, type AccountState } from "@/lib/sync";

function syncLine(account: AccountState): string {
  if (account.status === "syncing") return "Syncing…";
  if (account.status === "offline") return account.error ?? "Offline — will sync later.";
  if (account.lastSyncedAt) {
    const time = new Date(account.lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `Synced at ${time}`;
  }
  return "Synced";
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
        <button
          type="button"
          className="ws-pill"
          onClick={() => {
            setProblem(null);
            void signOut().then((error) => error && setProblem(error));
          }}
        >
          Sign out
        </button>
        <button type="button" className="ws-pill" onClick={() => setConfirming((value) => !value)} aria-expanded={confirming}>
          Delete my progress
        </button>
      </div>
      <span className="ws-muted">Signing out saves your progress to your account and clears it from this browser, so whoever signs in next starts fresh.</span>
      {confirming && (
        <div className="ws-stack" style={{ gap: 10, padding: 0 }}>
          <label htmlFor="account-delete-confirm" className="ws-muted">
            This permanently erases your progress, highlights, memory verses and journal from your account and this browser, then signs you out. Your login stays, so you can start over. Type {CONFIRM_WORD} to confirm.
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

/** Journey page: who's signed in, sync status, sign out, and the backup file. */
export function AccountPanel(): ReactNode {
  const account = useAccount();
  return (
    <section id="account" style={{ display: "flex", flexDirection: "column", gap: 22, scrollMarginTop: 30 }}>
      <h2 className="ws-heading">Your account</h2>
      {account.userId && <SignedIn account={account} />}
      <details className="account__backup">
        <summary className="ws-muted">Prefer a file? Save or restore a backup</summary>
        <BackupPanel heading={false} />
      </details>
    </section>
  );
}

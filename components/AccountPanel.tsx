"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { BackupPanel } from "@/components/BackupPanel";
import { changePassword, deleteSyncedProgress, PASSWORD_MIN, signOut, useAccount, usernameOf, type AccountState } from "@/lib/sync";

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

/** Accounts have no email, so this is the only way to replace a password (besides the owner). */
function ChangePassword(): ReactNode {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (next !== again) {
      setResult({ ok: false, text: "The two new passwords don't match." });
      return;
    }
    setBusy(true);
    const error = await changePassword(current, next);
    setBusy(false);
    if (error) setResult({ ok: false, text: error });
    else {
      setResult({ ok: true, text: "Password changed." });
      setCurrent("");
      setNext("");
      setAgain("");
      setOpen(false);
    }
  };

  return (
    <div className="ws-stack" style={{ gap: 10, padding: 0 }}>
      <div className="ws-pills ws-pills--start">
        <button type="button" className="ws-pill" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          Change password
        </button>
      </div>
      {open && (
        <form className="ws-stack gate__panel" onSubmit={(event) => void save(event)} noValidate>
          {(
            [
              ["account-current", "Current password", current, setCurrent, "current-password"],
              ["account-new", `New password (at least ${PASSWORD_MIN} characters)`, next, setNext, "new-password"],
              ["account-again", "Type the new password again", again, setAgain, "new-password"],
            ] as const
          ).map(([id, label, value, setValue, autoComplete]) => (
            <div key={id} className="ws-stack" style={{ gap: 6, padding: 0 }}>
              <label htmlFor={id} className="ws-label">
                {label}
              </label>
              <input
                id={id}
                className="ws-input"
                type="password"
                autoComplete={autoComplete}
                required
                maxLength={72}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
          ))}
          <div className="ws-pills ws-pills--start">
            <button type="submit" className="ws-pill" disabled={busy}>
              {busy ? "Saving…" : "Save new password"}
            </button>
          </div>
        </form>
      )}
      {result && (
        <span className={result.ok ? undefined : "ws-muted"} role={result.ok ? "status" : "alert"}>
          {result.text}
        </span>
      )}
    </div>
  );
}

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
        Signed in as <strong style={{ fontWeight: 500 }}>{usernameOf(account.email) ?? "your account"}</strong>
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
      <ChangePassword />
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

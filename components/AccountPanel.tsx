"use client";

import { useState, type ReactNode } from "react";

import { BackupPanel } from "@/components/BackupPanel";
import {
  changePassword,
  deleteSyncedProgress,
  sendSignInLink,
  signInWithGoogle,
  signInWithUsername,
  signOut,
  signUpWithUsername,
  useAccount,
  type AccountState,
} from "@/lib/sync";
import { displayName, isUsernameAccount } from "@/lib/username";

function syncLine(account: AccountState): string {
  if (account.status === "syncing") return "Syncing…";
  if (account.status === "offline") return account.error ?? "Offline — will sync later.";
  if (account.lastSyncedAt) {
    const time = new Date(account.lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `Synced at ${time}`;
  }
  return "Synced";
}

function PasswordForm(): ReactNode {
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const creating = mode === "create";

  const submit = async (): Promise<void> => {
    setBusy(true);
    setProblem(null);
    const error = creating ? await signUpWithUsername(username, password) : await signInWithUsername(username, password);
    setBusy(false);
    if (error) setProblem(error);
    else setPassword("");
  };

  return (
    <form
      className="ws-stack"
      style={{ gap: 12, padding: 0 }}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="ws-pills ws-pills--start" role="radiogroup" aria-label="Sign in or create an account">
        {(["signin", "create"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={mode === option}
            className="ws-pill ws-pill--sm"
            // Outline, not fill: the submit pill below is this panel's one marigold fill.
            style={mode === option ? { borderColor: "var(--ws-fg)", fontWeight: 500 } : undefined}
            onClick={() => setMode(option)}
          >
            {option === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <span className="ws-muted">
        {creating
          ? "No email needed. Pick a username and a password you'll remember. If you forget it, ask the person who runs the app to reset it."
          : "Sign in with your username and password."}
      </span>
      <label htmlFor="account-username" className="sr-only">
        Username
      </label>
      <input
        id="account-username"
        className="ws-input"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        maxLength={24}
        placeholder="Username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />
      <div className="ws-pills ws-pills--start">
        <label htmlFor="account-password" className="sr-only">
          Password
        </label>
        <input
          id="account-password"
          className="ws-input"
          type={showPassword ? "text" : "password"}
          autoComplete={creating ? "new-password" : "current-password"}
          required
          maxLength={72}
          placeholder={creating ? "Password (8 or more characters)" : "Password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{ flex: "1 1 220px" }}
        />
        <button type="button" className="ws-pill ws-pill--sm" onClick={() => setShowPassword((value) => !value)}>
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
      <div className="ws-pills ws-pills--start">
        <button type="submit" className="ws-pill ws-pill--primary" disabled={busy}>
          {busy ? "One moment…" : creating ? "Create account" : "Sign in"}
        </button>
      </div>
      {problem && (
        <span className="ws-muted" role="alert">
          {problem}
        </span>
      )}
    </form>
  );
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
      <PasswordForm />
      <span className="ws-muted">Other ways to sign in</span>
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
        <button type="submit" className="ws-pill" disabled={busy}>
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

function ChangePassword(): ReactNode {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    const error = await changePassword(password);
    setNote(error ?? "Password changed.");
    if (!error) {
      setPassword("");
      setOpen(false);
    }
  };

  return (
    <div className="ws-stack" style={{ gap: 10, padding: 0 }}>
      <div className="ws-pills ws-pills--start">
        <button type="button" className="ws-pill" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          Change password
        </button>
      </div>
      {open && (
        <form
          className="ws-pills ws-pills--start"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label htmlFor="account-new-password" className="sr-only">
            New password
          </label>
          <input
            id="account-new-password"
            className="ws-input"
            type="password"
            autoComplete="new-password"
            required
            maxLength={72}
            placeholder="New password (8 or more characters)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ flex: "1 1 220px" }}
          />
          <button type="submit" className="ws-pill">
            Save password
          </button>
        </form>
      )}
      {note && (
        <span className="ws-muted" role="status">
          {note}
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
        Signed in as <strong style={{ fontWeight: 500 }}>{displayName(account.email) ?? "your account"}</strong>
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
      {isUsernameAccount(account.email) && <ChangePassword />}
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

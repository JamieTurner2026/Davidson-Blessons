"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { createMember, listMembers, NAME_MAX, PASSWORD_MIN, signInMember, useAccount, type Member } from "@/lib/sync";

// Sign-in is required: everything except the /auth/* link pages waits behind this screen,
// so each member studies in their own account with their own progress. Like the DDA2
// training app: tap your name, then enter your password. No email.
//
// This is a sign-in requirement, not a wall around the content: Scripture is public, and
// pages are still rendered on the server. What it protects is each member's own progress,
// which Supabase's row-level security keeps readable by its owner only.

const FILTER_FROM = 12; // show a "find your name" box once the list gets long

type Step = { kind: "pick" } | { kind: "password"; member: Member } | { kind: "create" };

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function PasswordInput({
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
        maxLength={72}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function MemberTiles({ onPick, onCreate }: { onPick: (member: Member) => void; onCreate: () => void }): ReactNode {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void listMembers().then((result) => {
      if (!live) return;
      if (typeof result === "string") setProblem(result);
      else setMembers(result);
    });
    return () => {
      live = false;
    };
  }, [attempt]);

  const needle = filter.trim().toLowerCase();
  const shown = (members ?? []).filter((member) => member.name.toLowerCase().includes(needle));

  return (
    <>
      <h1 className="ws-heading">Who&apos;s studying today?</h1>
      <p className="ws-muted">
        {members === null && !problem
          ? "Loading members…"
          : members?.length
            ? "Tap your name to sign in."
            : "No members yet. Tap New member to create your account."}
      </p>
      {members && members.length >= FILTER_FROM && (
        <input
          className="ws-input"
          type="search"
          placeholder="Find your name"
          aria-label="Find your name"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      )}
      <div className="gate__tiles">
        {shown.map((member) => (
          <button key={member.id} type="button" className="gate__tile" onClick={() => onPick(member)}>
            <span className="gate__avatar" aria-hidden="true">
              {initialOf(member.name)}
            </span>
            <span className="gate__name">{member.name}</span>
          </button>
        ))}
        <button type="button" className="gate__tile" onClick={onCreate}>
          <span className="gate__avatar gate__avatar--new" aria-hidden="true">
            +
          </span>
          <span className="gate__name">New member</span>
        </button>
      </div>
      {problem && (
        <div className="ws-stack" style={{ gap: 10, padding: 0 }}>
          <p className="ws-muted gate__message" role="alert">
            {problem}
          </p>
          <div className="ws-pills ws-pills--start">
            <button
              type="button"
              className="ws-pill ws-pill--sm"
              onClick={() => {
                setProblem(null);
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SignInScreen(): ReactNode {
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const go = (next: Step): void => {
    setStep(next);
    setProblem(null);
    setPassword("");
    setConfirm("");
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setProblem(null);
    if (step.kind === "create" && password !== confirm) {
      setProblem("The two passwords don't match.");
      return;
    }
    setBusy(true);
    const error =
      step.kind === "password" ? await signInMember(step.member, password) : step.kind === "create" ? await createMember(name, password) : null;
    setBusy(false);
    if (error) setProblem(error);
  };

  const back = (
    <div className="ws-pills ws-pills--start">
      <button type="button" className="ws-pill ws-pill--sm" onClick={() => go({ kind: "pick" })}>
        ← Back
      </button>
    </div>
  );

  return (
    <div className="gate">
      <Image src="/art/hero.webp" alt="" width={1200} height={800} priority className="gate__art" />
      <div className="ws-stack gate__panel">
        <span className="ws-muted">Davidson Blessons</span>
        {step.kind === "pick" && <MemberTiles onPick={(member) => go({ kind: "password", member })} onCreate={() => go({ kind: "create" })} />}

        {step.kind === "password" && (
          <>
            {back}
            <h1 className="ws-heading">Hi, {step.member.name}</h1>
            <form className="ws-stack" style={{ gap: 14, padding: 0 }} onSubmit={(event) => void submit(event)} noValidate>
              {/* Lets password managers file the password under this member. */}
              <input type="hidden" name="username" autoComplete="username" value={step.member.name} />
              <PasswordInput id="gate-password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
              <div className="ws-pills ws-pills--start">
                <button type="submit" className="ws-pill ws-pill--primary" disabled={busy}>
                  {busy ? "One moment…" : "Sign in"}
                </button>
              </div>
            </form>
            <p className="ws-muted gate__message">
              Forgot your password? Ask the person who runs Davidson Blessons to set a new one, then change it on your Journey page.
            </p>
          </>
        )}

        {step.kind === "create" && (
          <>
            {back}
            <h1 className="ws-heading">New member</h1>
            <p className="ws-muted">Your name appears on the sign-in screen. Your progress, journal and highlights stay private to you.</p>
            <form className="ws-stack" style={{ gap: 14, padding: 0 }} onSubmit={(event) => void submit(event)} noValidate>
              <div className="ws-stack" style={{ gap: 6, padding: 0 }}>
                <label htmlFor="gate-name" className="ws-label">
                  Your name
                </label>
                <input
                  id="gate-name"
                  className="ws-input"
                  type="text"
                  autoComplete="nickname"
                  required
                  maxLength={NAME_MAX}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <PasswordInput
                id="gate-new-password"
                label={`Choose a password (at least ${PASSWORD_MIN} characters)`}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              <PasswordInput id="gate-confirm" label="Type the password again" value={confirm} onChange={setConfirm} autoComplete="new-password" />
              <div className="ws-pills ws-pills--start">
                <button type="submit" className="ws-pill ws-pill--primary" disabled={busy}>
                  {busy ? "One moment…" : "Create account"}
                </button>
              </div>
            </form>
            <p className="ws-muted gate__message">Write your password down somewhere safe: there&apos;s no email to recover it.</p>
          </>
        )}

        {problem && (
          <p className="ws-muted gate__message" role="alert">
            {problem}
          </p>
        )}
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

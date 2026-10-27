"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";

import { mergeStudy, stableStringify } from "@/lib/merge";
import { supabase } from "@/lib/supabase";
import {
  currentStudy,
  forgetLocalStudy,
  replaceStudy,
  salvageStudy,
  setStudyScope,
  setWriteHook,
  type StudyState,
} from "@/lib/study-store";

// Accounts are required: components/SignInGate.tsx shows the sign-in screen until someone
// is signed in. Each reader's working copy lives in this browser under their own key; their
// account's `progress` row is the synced copy. Every pull MERGES (lib/merge.ts), so two
// devices can never overwrite each other. Pushes are debounced after each local change.

export type SyncStatus = "off" | "signed-out" | "syncing" | "synced" | "offline";

export interface AccountState {
  /** False until the saved session (if any) has been checked, so the gate doesn't flash. */
  ready: boolean;
  status: SyncStatus;
  email: string | null;
  userId: string | null;
  lastSyncedAt: number | null;
  error: string | null;
}

const PUSH_DELAY_MS = 2000;
const PULL_THROTTLE_MS = 30_000;
const SERVER_SNAPSHOT: AccountState = { ready: false, status: "off", email: null, userId: null, lastSyncedAt: null, error: null };

let account: AccountState = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let started = false;
let pushTimer: number | null = null;
let lastPullAt = 0;
let lastPushed: string | null = null;

function setAccount(patch: Partial<AccountState>): void {
  account = { ...account, ...patch };
  listeners.forEach((listener) => listener());
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => account,
    () => SERVER_SNAPSHOT,
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

/** Saves to the account. Resolves true when the account copy is up to date. */
async function push(state: StudyState): Promise<boolean> {
  const client = supabase();
  const userId = account.userId;
  if (!client || !userId) return false;
  const body = stableStringify(state);
  if (body === lastPushed) return true;
  setAccount({ status: "syncing" });
  const { error } = await client.from("progress").upsert({ user_id: userId, state }, { onConflict: "user_id" });
  if (error) {
    setAccount({ status: "offline", error: "Couldn't save to your account. Your progress is safe here and will sync later." });
    return false;
  }
  lastPushed = body;
  setAccount({ status: "synced", lastSyncedAt: Date.now(), error: null });
  return true;
}

function schedulePush(): void {
  if (!account.userId) return;
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void push(currentStudy());
  }, PUSH_DELAY_MS);
}

function flushPush(): void {
  if (pushTimer === null) return;
  window.clearTimeout(pushTimer);
  pushTimer = null;
  void push(currentStudy());
}

const rowSchema = z.object({ state: z.unknown() }).nullable();

/** Fetches the account copy, merges it with this browser's, and saves the result both ways. */
async function pull(): Promise<void> {
  const client = supabase();
  const userId = account.userId;
  if (!client || !userId) return;
  lastPullAt = Date.now();
  setAccount({ status: "syncing" });
  const { data, error } = await client.from("progress").select("state").eq("user_id", userId).maybeSingle();
  const row = rowSchema.safeParse(data);
  if (error || !row.success) {
    setAccount({ status: "offline", error: "Couldn't reach your account. Your progress is safe here." });
    return;
  }
  const local = currentStudy();
  const remote = row.data ? salvageStudy(row.data.state) : null;
  const merged = remote ? mergeStudy(local, remote) : local;
  if (stableStringify(merged) !== stableStringify(local)) replaceStudy(merged);
  lastPushed = remote ? stableStringify(remote) : null;
  await push(merged);
  if (account.status === "syncing") setAccount({ status: "synced", lastSyncedAt: Date.now(), error: null });
}

/** Starts listening for sign-in and local changes. Safe to call more than once. */
export function startSync(): void {
  if (started) return;
  started = true;
  const client = supabase();
  if (!client) {
    setAccount({ ready: true, status: "off" });
    return;
  }
  setAccount({ status: "signed-out" });
  setWriteHook(() => schedulePush());

  client.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;
    if (!user) {
      lastPushed = null;
      setStudyScope(null);
      setAccount({ ready: true, status: "signed-out", email: null, userId: null, lastSyncedAt: null });
      return;
    }
    const isNewUser = user.id !== account.userId;
    // Switch to this reader's own saved progress before anything renders with it.
    setStudyScope(user.id);
    setAccount({ ready: true, email: user.email ?? null, userId: user.id, error: null });
    // Supabase calls back synchronously inside its own lock; do the network work afterwards.
    if (isNewUser || event === "SIGNED_IN") window.setTimeout(() => void pull(), 0);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPush();
    else if (account.userId && Date.now() - lastPullAt > PULL_THROTTLE_MS) void pull();
  });
}

// ── Actions for the sign-in screen and Account panel ──────────────

const emailSchema = z.email();
export const PASSWORD_MIN = 8;
const UNAVAILABLE = "Sign-in isn't available right now. Please try again later.";

function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

/** Plain-language versions of Supabase's auth errors. */
function friendly(error: { message: string }): string {
  const text = error.message.toLowerCase();
  if (text.includes("invalid login credentials")) return "That email and password don't match. Try again, or reset your password.";
  if (text.includes("email not confirmed")) return "Please confirm your email first: open the link we sent you, then sign in.";
  if (text.includes("already registered")) return "There's already an account with that email. Sign in instead.";
  if (text.includes("rate limit") || text.includes("too many")) return "Too many tries. Please wait a few minutes and try again.";
  if (text.includes("password")) return `Please choose a password with at least ${PASSWORD_MIN} characters.`;
  return error.message;
}

function checkEmail(email: string): string | null {
  return emailSchema.safeParse(email.trim()).success ? null : "That doesn't look like an email address.";
}

function checkPassword(password: string): string | null {
  return password.length >= PASSWORD_MIN ? null : `Please use at least ${PASSWORD_MIN} characters.`;
}

/** Signs in with email and password. Returns an error message, or null on success. */
export async function signInWithPassword(email: string, password: string): Promise<string | null> {
  const client = supabase();
  if (!client) return UNAVAILABLE;
  const invalid = checkEmail(email);
  if (invalid) return invalid;
  try {
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    return error ? friendly(error) : null;
  } catch (error) {
    return message(error);
  }
}

export type CreateResult = { ok: true; confirm: boolean } | { ok: false; error: string };

/** Creates an account. `confirm` means the reader must open the confirmation email before signing in. */
export async function createAccount(email: string, password: string): Promise<CreateResult> {
  const client = supabase();
  if (!client) return { ok: false, error: UNAVAILABLE };
  const invalid = checkEmail(email) ?? checkPassword(password);
  if (invalid) return { ok: false, error: invalid };
  try {
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) return { ok: false, error: friendly(error) };
    return { ok: true, confirm: !data.session };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

/** Emails a password-reset link. Returns an error message, or null on success. */
export async function sendPasswordReset(email: string): Promise<string | null> {
  const client = supabase();
  if (!client) return UNAVAILABLE;
  const invalid = checkEmail(email);
  if (invalid) return invalid;
  try {
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    return error ? friendly(error) : null;
  } catch (error) {
    return message(error);
  }
}

/** Sets a new password for the signed-in reader (after opening a reset link). */
export async function setNewPassword(password: string): Promise<string | null> {
  const client = supabase();
  if (!client) return UNAVAILABLE;
  const invalid = checkPassword(password);
  if (invalid) return invalid;
  try {
    const { error } = await client.auth.updateUser({ password });
    return error ? friendly(error) : null;
  } catch (error) {
    return message(error);
  }
}

/** Finishes an email-confirmation or password-reset link. Returns an error message, or null on success. */
export async function finishSignIn(code: string): Promise<string | null> {
  const client = supabase();
  if (!client) return UNAVAILABLE;
  try {
    const { error } = await client.auth.exchangeCodeForSession(code);
    return error ? error.message : null;
  } catch (error) {
    return message(error);
  }
}

/**
 * Saves the latest progress to the account, clears it from this browser so the next person
 * starts fresh, then signs out. If the save fails, nothing is cleared and the reader stays
 * signed in. Returns an error message, or null on success.
 */
export async function signOut(): Promise<string | null> {
  const userId = account.userId;
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  pushTimer = null;
  if (userId && !(await push(currentStudy()))) {
    return "Couldn't save your latest progress to your account, so you're still signed in. Check your connection and try again.";
  }
  if (userId) forgetLocalStudy(userId);
  try {
    await supabase()?.auth.signOut();
  } catch {
    // Already signed out or offline: the local session is cleared either way.
  }
  return null;
}

/** Deletes the reader's progress from their account and this browser, then signs out. The login itself stays. */
export async function deleteSyncedProgress(): Promise<string | null> {
  const client = supabase();
  const userId = account.userId;
  if (!client || !userId) return "You're not signed in.";
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  pushTimer = null;
  try {
    const { error } = await client.from("progress").delete().eq("user_id", userId);
    if (error) return error.message;
    lastPushed = null;
    forgetLocalStudy(userId);
    await client.auth.signOut();
    return null;
  } catch (error) {
    return message(error);
  }
}

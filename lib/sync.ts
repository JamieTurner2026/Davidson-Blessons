"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";

import { mergeStudy, stableStringify } from "@/lib/merge";
import { supabase } from "@/lib/supabase";
import { currentStudy, replaceStudy, salvageStudy, setWriteHook, type StudyState } from "@/lib/study-store";
import { usernameToEmail, validatePassword, validateUsername } from "@/lib/username";

// Optional account sync. This browser's localStorage stays the working copy; the account's
// `progress` row is the synced copy. Every pull MERGES (lib/merge.ts), so two devices can
// never overwrite each other. Pushes are debounced after each local change.

export type SyncStatus = "off" | "signed-out" | "syncing" | "synced" | "offline";

export interface AccountState {
  status: SyncStatus;
  email: string | null;
  userId: string | null;
  lastSyncedAt: number | null;
  error: string | null;
}

const PUSH_DELAY_MS = 2000;
const PULL_THROTTLE_MS = 30_000;
const SERVER_SNAPSHOT: AccountState = { status: "off", email: null, userId: null, lastSyncedAt: null, error: null };

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

async function push(state: StudyState): Promise<void> {
  const client = supabase();
  const userId = account.userId;
  if (!client || !userId) return;
  const body = stableStringify(state);
  if (body === lastPushed) return;
  setAccount({ status: "syncing" });
  const { error } = await client.from("progress").upsert({ user_id: userId, state }, { onConflict: "user_id" });
  if (error) {
    setAccount({ status: "offline", error: "Couldn't save to your account. Your progress is safe here and will sync later." });
    return;
  }
  lastPushed = body;
  setAccount({ status: "synced", lastSyncedAt: Date.now(), error: null });
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
    setAccount({ status: "off" });
    return;
  }
  setAccount({ status: "signed-out" });
  setWriteHook(() => schedulePush());

  client.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;
    if (!user) {
      lastPushed = null;
      setAccount({ status: "signed-out", email: null, userId: null, lastSyncedAt: null });
      return;
    }
    const isNewUser = user.id !== account.userId;
    setAccount({ email: user.email ?? null, userId: user.id, error: null });
    // Supabase calls back synchronously inside its own lock; do the network work afterwards.
    if (isNewUser || event === "SIGNED_IN") window.setTimeout(() => void pull(), 0);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPush();
    else if (account.userId && Date.now() - lastPullAt > PULL_THROTTLE_MS) void pull();
  });
}

// ── Actions for the Account panel ─────────────────────────────────

const emailSchema = z.email();

function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

/** Sends a one-time sign-in link. Returns an error message, or null on success. */
export async function sendSignInLink(email: string): Promise<string | null> {
  const client = supabase();
  if (!client) return "Accounts aren't available right now.";
  const parsed = emailSchema.safeParse(email.trim());
  if (!parsed.success) return "That doesn't look like an email address.";
  try {
    const { error } = await client.auth.signInWithOtp({ email: parsed.data, options: { emailRedirectTo: callbackUrl() } });
    return error ? error.message : null;
  } catch (error) {
    return message(error);
  }
}

export async function signInWithGoogle(): Promise<string | null> {
  const client = supabase();
  if (!client) return "Accounts aren't available right now.";
  try {
    const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl() } });
    return error ? error.message : null;
  } catch (error) {
    return message(error);
  }
}

/** Plain-language text for the sign-in problems people can actually fix; never echoes server text. */
function passwordAuthMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code === "user_already_exists") return "That username is taken. Pick another.";
  if (code === "invalid_credentials") return "That username or password isn't right.";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") return "Too many tries. Wait a minute and try again.";
  if (code === "weak_password") return "That password is too easy to guess. Try a longer one.";
  if (code === "signup_disabled" || code === "email_provider_disabled") return "New accounts are switched off right now.";
  return "Something went wrong. Try again.";
}

/** Creates an account from a username and password and signs in. Returns an error message, or null. */
export async function signUpWithUsername(username: string, password: string): Promise<string | null> {
  const client = supabase();
  if (!client) return "Accounts aren't available right now.";
  const problem = validateUsername(username) ?? validatePassword(password);
  if (problem) return problem;
  try {
    const { data, error } = await client.auth.signUp({ email: usernameToEmail(username), password });
    if (error) return passwordAuthMessage(error);
    if (!data.session) return "The account was made but couldn't sign in. Ask the person who runs the app to check the sign-in settings.";
    return null;
  } catch {
    return "Couldn't reach your account. Check your connection and try again.";
  }
}

/** Signs in with a username and password. Returns an error message, or null on success. */
export async function signInWithUsername(username: string, password: string): Promise<string | null> {
  const client = supabase();
  if (!client) return "Accounts aren't available right now.";
  if (validateUsername(username) || password.length === 0) return "Enter your username and password.";
  try {
    const { error } = await client.auth.signInWithPassword({ email: usernameToEmail(username), password });
    return error ? passwordAuthMessage(error) : null;
  } catch {
    return "Couldn't reach your account. Check your connection and try again.";
  }
}

/** Changes the signed-in account's password. Returns an error message, or null on success. */
export async function changePassword(password: string): Promise<string | null> {
  const client = supabase();
  if (!client || !account.userId) return "You're not signed in.";
  const problem = validatePassword(password);
  if (problem) return problem;
  try {
    const { error } = await client.auth.updateUser({ password });
    return error ? passwordAuthMessage(error) : null;
  } catch {
    return "Couldn't reach your account. Check your connection and try again.";
  }
}

/** Finishes a sign-in link or Google redirect. Returns an error message, or null on success. */
export async function finishSignIn(code: string): Promise<string | null> {
  const client = supabase();
  if (!client) return "Accounts aren't available right now.";
  try {
    const { error } = await client.auth.exchangeCodeForSession(code);
    return error ? error.message : null;
  } catch (error) {
    return message(error);
  }
}

/** Signs out. This browser keeps its copy of the progress. */
export async function signOut(): Promise<void> {
  flushPush();
  try {
    await supabase()?.auth.signOut();
  } catch {
    // Already signed out or offline: the local session is cleared either way.
  }
}

/** Deletes the account's synced copy, then signs out. This browser keeps its copy. */
export async function deleteSyncedProgress(): Promise<string | null> {
  const client = supabase();
  const userId = account.userId;
  if (!client || !userId) return "You're not signed in.";
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  pushTimer = null;
  try {
    const { error } = await client.from("progress").delete().eq("user_id", userId);
    if (error) return error.message;
    await client.auth.signOut();
    return null;
  } catch (error) {
    return message(error);
  }
}

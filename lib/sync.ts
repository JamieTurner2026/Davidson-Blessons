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

// Accounts are required: components/SignInGate.tsx shows the sign-in screen (tap your name,
// enter your password) until someone is signed in. Each reader's working copy lives in this browser under their own key; their
// account's `progress` row is the synced copy. Every pull MERGES (lib/merge.ts), so two
// devices can never overwrite each other. Pushes are debounced after each local change.

export type SyncStatus = "off" | "signed-out" | "syncing" | "synced" | "offline";

export interface AccountState {
  /** False until the saved session (if any) has been checked, so the gate doesn't flash. */
  ready: boolean;
  status: SyncStatus;
  /** The member's display name (shown on their sign-in tile). */
  name: string | null;
  email: string | null;
  userId: string | null;
  lastSyncedAt: number | null;
  error: string | null;
}

const PUSH_DELAY_MS = 2000;
const PULL_THROTTLE_MS = 30_000;
const SERVER_SNAPSHOT: AccountState = { ready: false, status: "off", name: null, email: null, userId: null, lastSyncedAt: null, error: null };

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
      setAccount({ ready: true, status: "signed-out", name: null, email: null, userId: null, lastSyncedAt: null });
      return;
    }
    const isNewUser = user.id !== account.userId;
    // Switch to this reader's own saved progress before anything renders with it.
    setStudyScope(user.id);
    const metaName = z.string().safeParse(user.user_metadata?.display_name);
    const name = metaName.success ? metaName.data : null;
    setAccount({ ready: true, name, email: user.email ?? null, userId: user.id, error: null });
    // Supabase calls back synchronously inside its own lock; do the network work afterwards.
    if (isNewUser || event === "SIGNED_IN") {
      window.setTimeout(() => {
        void ensureProfile(user.id, user.email ?? null, name);
        void pull();
      }, 0);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPush();
    else if (account.userId && Date.now() - lastPullAt > PULL_THROTTLE_MS) void pull();
  });
}

// ── Actions for the sign-in screen and Account panel ──────────────

export const PASSWORD_MIN = 8;
export const NAME_MAX = 30;
const UNAVAILABLE = "Sign-in isn't available right now. Please try again later.";

// Sign-in works like the DDA2 training app: tap your name, then enter your password. No email.
// Supabase keys accounts by email, so each member gets a placeholder address on this app's own
// domain (never mailed: "Confirm email" must stay off). The public `profiles` table lists names
// for the sign-in tiles; it holds no progress (docs/RUNBOOKS.md has its SQL).
const KEY_DOMAIN = "davidson-blessons.vercel.app";

export interface Member {
  id: string;
  name: string;
  /** The member's placeholder sign-in email. */
  key: string;
}

const memberRowsSchema = z.array(z.object({ id: z.string(), display_name: z.string(), username_key: z.string() }));

/** Everyone who can sign in, by name. Returns an error message if the list can't be loaded. */
export async function listMembers(): Promise<Member[] | string> {
  const client = supabase();
  if (!client) return UNAVAILABLE;
  try {
    const { data, error } = await client.from("profiles").select("id, display_name, username_key").order("display_name");
    const rows = memberRowsSchema.safeParse(data);
    if (error || !rows.success) return "Couldn't load the list of members. Check your connection and try again.";
    return rows.data.map((row) => ({ id: row.id, name: row.display_name, key: row.username_key }));
  } catch {
    return "Couldn't load the list of members. Check your connection and try again.";
  }
}

function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

function newKey(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20) || "member";
  const random = Array.from(crypto.getRandomValues(new Uint8Array(4)), (byte) => byte.toString(36).padStart(2, "0")).join("");
  return `${slug}-${random}@${KEY_DOMAIN}`;
}

/** Plain-language versions of Supabase's auth errors. */
function friendly(error: { message: string }): string {
  const text = error.message.toLowerCase();
  if (text.includes("invalid login credentials")) return "That password isn't right. Try again.";
  if (text.includes("email not confirmed") || text.includes("email address") || text.includes("invalid email")) {
    return "Sign-up isn't set up correctly yet. Please let the site owner know.";
  }
  if (text.includes("rate limit") || text.includes("too many")) return "Too many tries. Please wait a few minutes and try again.";
  if (text.includes("password")) return `Please choose a password with at least ${PASSWORD_MIN} characters.`;
  return error.message;
}

function checkPassword(password: string): string | null {
  return password.length >= PASSWORD_MIN ? null : `Please use at least ${PASSWORD_MIN} characters.`;
}

/** Signs a member in. Returns an error message, or null on success. */
export async function signInMember(member: Member, password: string): Promise<string | null> {
  const client = supabase();
  if (!client) return UNAVAILABLE;
  try {
    const { error } = await client.auth.signInWithPassword({ email: member.key, password });
    return error ? friendly(error) : null;
  } catch (error) {
    return message(error);
  }
}

/** Creates a member (their name tile appears once they're signed in) and signs them in. */
export async function createMember(name: string, password: string): Promise<string | null> {
  const client = supabase();
  if (!client) return UNAVAILABLE;
  const displayName = cleanName(name);
  if (!displayName) return "Please enter your name.";
  const invalid = checkPassword(password);
  if (invalid) return invalid;
  try {
    const { data, error } = await client.auth.signUp({
      email: newKey(displayName),
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return friendly(error);
    // No session means Supabase is still set to confirm emails, which can never arrive here.
    return data.session ? null : "Your account was created, but sign-up isn't set up correctly yet. Please let the site owner know.";
  } catch (error) {
    return message(error);
  }
}

/** Adds the signed-in member's name tile if it's missing (e.g. sign-up succeeded but the insert didn't). */
async function ensureProfile(userId: string, email: string | null, name: string | null): Promise<void> {
  const client = supabase();
  if (!client || !email || !name) return;
  await client
    .from("profiles")
    .upsert({ id: userId, display_name: name, username_key: email }, { onConflict: "id", ignoreDuplicates: true });
}

/** Changes the signed-in member's password after checking their current one. */
export async function changePassword(current: string, next: string): Promise<string | null> {
  const client = supabase();
  if (!client) return UNAVAILABLE;
  if (!account.email) return "You're not signed in.";
  const invalid = checkPassword(next);
  if (invalid) return invalid;
  try {
    const check = await client.auth.signInWithPassword({ email: account.email, password: current });
    if (check.error) return "Your current password isn't right.";
    const { error } = await client.auth.updateUser({ password: next });
    return error ? friendly(error) : null;
  } catch (error) {
    return message(error);
  }
}

/** Finishes a Supabase auth link (/auth/callback). Not used by username sign-in; kept for links already sent. */
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

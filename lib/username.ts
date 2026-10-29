// Username + password sign-in on top of Supabase Auth, which only knows emails: a username is
// stored as a made-up address on a domain that can never receive mail (".invalid" is reserved).
// People never see it; the account panel shows the username. Pure: no storage, no network.

export const USERNAME_DOMAIN = "users.davison-blesson.invalid";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,23}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // the password hash only reads the first 72 bytes

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

/** A friendly problem with the username, or null if it's fine. */
export function validateUsername(input: string): string | null {
  const name = normalizeUsername(input);
  if (name.length < 3 || name.length > 24) return "Pick a username with 3 to 24 characters.";
  if (!USERNAME_PATTERN.test(name)) return "Use letters, numbers, dots, dashes or underscores, starting with a letter or number.";
  return null;
}

/** A friendly problem with the password, or null if it's fine. */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use a password with at least ${MIN_PASSWORD} characters.`;
  if (new TextEncoder().encode(password).length > MAX_PASSWORD) return "That password is too long. Keep it under 72 characters.";
  return null;
}

export function usernameToEmail(input: string): string {
  return `${normalizeUsername(input)}@${USERNAME_DOMAIN}`;
}

export function isUsernameAccount(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${USERNAME_DOMAIN}`));
}

/** What to show as "who is signed in": the username for password accounts, else the email. */
export function displayName(email: string | null | undefined): string | null {
  if (!email) return null;
  return isUsernameAccount(email) ? email.slice(0, email.lastIndexOf("@")) : email;
}

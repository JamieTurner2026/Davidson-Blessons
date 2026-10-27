# Runbooks

## Accounts (Supabase) — one-time setup

Sign-in is **required**, with a **username + password** (no email), and uses the Supabase project
**selah** (`gohyiyppobpqfxrsnlns`, us-east-1, free). The `progress` table, its owner-only access rules
and the keep-alive are already in place. Until steps 1 and 2 are done, the app shows "Sign-in isn't
available right now" instead of the sign-in screen, so do them **before** deploying the sign-in
change to production.

### 1. Vercel environment variables (Production, Preview and Development)
In the **davison-blesson** project → Settings → Environment Variables:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gohyiyppobpqfxrsnlns.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key (Supabase → Project Settings → API Keys) |
| `CRON_SECRET` *(optional)* | any long random string; Vercel sends it to `/api/keepalive` |

Both `NEXT_PUBLIC_` values are public by design: Row Level Security protects the data. Redeploy
after adding them, because they're built into the page.

### 2. Supabase → Authentication → Sign In / Providers → Email
- **Enable Email provider:** on. (Usernames are stored as placeholder emails behind the scenes.)
- **Confirm email:** **off.** This is required: with it on, new accounts would wait for an email that
  can never arrive, and the sign-up screen says "sign-up isn't set up correctly".
- **Minimum password length:** 8.
- Google and the email-link ("magic link") sign-in aren't used; leave them off. No email service
  (Resend) is needed.

### Resetting a forgotten password (owner)
There's no email, so readers can't reset their own. In **Supabase → SQL Editor**, run (replace the
username and the temporary password):

```sql
update auth.users
set encrypted_password = extensions.crypt('TempPassword123', extensions.gen_salt('bf'))
where email = 'their-username@davidson-blessons.vercel.app';
```

Give them the temporary password; they sign in and choose a new one under **Journey → Your account →
Change password**. Their progress is untouched.

### Check it works
1. Open the site: you see the sign-in screen, whatever page you open.
2. **Create an account** with a username and password: you're signed straight in.
3. Read a chapter, write a journal note, then open `/journey#account`: "Signed in as <username> · Synced at …".
4. **Sign out**, then create a second account: it starts with no progress.
5. Sign back in to the first account (on any device): its progress and journal are there.
6. **Change password** on `/journey#account`, sign out, and sign in with the new one.

## Keep-alive
Free Supabase projects pause after 7 days without activity. `vercel.json` runs `/api/keepalive`
daily at 12:00 UTC, which calls the `ping()` SQL function. If sign-in ever breaks after a quiet
stretch, check the project isn't paused in the Supabase dashboard.

## Regression checks
```bash
npx tsx scripts/check-rounds.ts    # every generated question round
npx tsx scripts/verify-trivia.ts   # curated questions + daily-quiz verses
npx tsx scripts/check-merge.ts     # account sync merge rules
npx tsx scripts/check-scope.mts    # two readers sharing one browser
```

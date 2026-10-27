# Runbooks

## Accounts (Supabase) — one-time setup

Sign-in is **required** (email + password) and uses the Supabase project **selah**
(`gohyiyppobpqfxrsnlns`, us-east-1, free). The `progress` table, its owner-only access rules and the
keep-alive are already in place. Until the steps below are done, the app shows "Sign-in isn't
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

### 2. Supabase → Authentication → URL Configuration
- **Site URL:** `https://davidson-blessons.vercel.app`
- **Redirect URLs** (add all):
  - `https://davidson-blessons.vercel.app/auth/**`
  - `https://davison-blesson.vercel.app/auth/**`
  - `https://davison-blesson-*-jamieturner2026s-projects.vercel.app/auth/**` (preview deployments)
  - `http://localhost:3410/auth/**`

Without this, confirmation and reset links send people to the wrong site.

### 3. Supabase → Authentication → Sign In / Providers → Email
- **Enable Email provider:** on. **Minimum password length:** 8.
- **Confirm email:** on is safer (people prove they own the address). It needs step 4, because
  Supabase's built-in email only reaches members of your Supabase team. With it off, new accounts
  can sign in straight away, but "Forgot password" still needs step 4.
- Google and the email-link ("magic link") sign-in aren't used by the app; leave them off.

### 4. Email that reaches everyone (Resend)
1. Create a free [Resend](https://resend.com) account and add an API key.
   - Optional: verify a domain so mail comes from it. Otherwise use `onboarding@resend.dev`
     while testing.
2. Go to **Supabase → Authentication → Emails → SMTP Settings** and enable custom SMTP:
   - host `smtp.resend.com`, port `465`
   - username `resend`, password = the Resend API key
   - sender name "Davidson Blessons"
3. Optional: under **Emails → Templates**, change the "Confirm signup" and "Reset password"
   subjects to mention Davidson Blessons.

### Check it works
1. Open the site: you see the sign-in screen, whatever page you open.
2. **Create an account**, open the confirmation email in the same browser, and you land in the app.
3. Read a chapter, write a journal note, then open `/journey#account`: "Signed in as … · Synced at …".
4. **Sign out**, then create or sign in to a second account: it starts with no progress.
5. Sign back in to the first account (on any device): its progress and journal are there.
6. **Forgot password?** sends a link; it opens `/auth/reset` to choose a new password.

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

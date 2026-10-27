# Runbooks

## Accounts (Supabase) — one-time setup

Selah's optional sign-in uses the Supabase project **selah** (`gohyiyppobpqfxrsnlns`, us-east-1, free).
The table, access rules and keep-alive are already in place. These four dashboard steps make
sign-in work for everyone. Until they're done, Selah works signed out as before.

### 1. Supabase → Authentication → URL Configuration
- **Site URL:** `https://selah-rho-sable.vercel.app`
- **Redirect URLs** (add both):
  - `https://selah-rho-sable.vercel.app/auth/callback`
  - `http://localhost:3410/auth/callback`

Without this, sign-in links send people to `localhost:3000`.

### 2. Google sign-in
1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create a project
   (e.g. "Selah").
2. Set up the OAuth consent screen: External, app name "Selah", your email as support contact.
3. Create an OAuth client ID of type **Web application**.
   - **Authorized redirect URI:** `https://gohyiyppobpqfxrsnlns.supabase.co/auth/v1/callback`
4. Copy the client ID and secret into **Supabase → Authentication → Sign In / Providers → Google**,
   and turn it on.

### 3. Email that reaches everyone (Resend)
Supabase's built-in email only sends to members of your Supabase team, a few per hour.
1. Create a free [Resend](https://resend.com) account and add an API key.
   - Optional: verify a domain so mail comes from it. Otherwise use `onboarding@resend.dev`
     while testing.
2. Go to **Supabase → Authentication → Emails → SMTP Settings** and enable custom SMTP:
   - host `smtp.resend.com`, port `465`
   - username `resend`, password = the Resend API key
   - sender name "Selah"
3. Optional: under **Emails → Templates → Magic Link**, change the subject to "Your Selah
   sign-in link".

### 4. Vercel environment variables (Production + Preview)
| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gohyiyppobpqfxrsnlns.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key (Supabase → Project Settings → API Keys) |
| `CRON_SECRET` *(optional)* | any long random string; Vercel sends it to `/api/keepalive` |

Both `NEXT_PUBLIC_` values are public by design: Row Level Security protects the data. Redeploy
after adding them, because they're built into the page.

### Check it works
1. Open `/journey#account`, enter your email, and open the link **in the same browser**.
2. The panel shows "Signed in as … · Synced at …".
3. On a second device or browser, sign in again. Progress from the first device appears.
4. Sign out. Local progress stays.

## Keep-alive
Free Supabase projects pause after 7 days without activity. `vercel.json` runs `/api/keepalive`
daily at 12:00 UTC, which calls the `ping()` SQL function. If sign-in ever breaks after a quiet
stretch, check the project isn't paused in the Supabase dashboard.

## Regression checks
```bash
npx tsx scripts/check-rounds.ts    # every generated question round
npx tsx scripts/verify-trivia.ts   # curated questions + daily-quiz verses
npx tsx scripts/check-merge.ts     # account sync merge rules
```

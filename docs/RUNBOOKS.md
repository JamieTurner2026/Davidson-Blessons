# Runbooks

## Accounts (Supabase) — one-time setup

Sign-in is **required** and works like the DDA2 training app: **tap your name, then enter your
password** (no email). It uses a Supabase project created for this app (free plan is fine). Each
person's progress is one private row in `public.progress`. Until steps 1–3 are done, the app can't
sign anyone in, so do them **before** deploying the sign-in change to production.

### 1. Create the database (new Supabase project)
1. In Supabase, create a project and wait for it to finish starting.
2. Open **SQL Editor → New query**, paste everything in `docs/supabase-setup.sql`, and run it.
   It creates the `progress` table, the `profiles` member list for the name tiles, their access
   rules and the keep-alive `ping()` function. It's safe to run more than once.
3. **Project Settings → API Keys**: copy the project URL and the `sb_publishable_…` key (step 2).

### 2. Vercel environment variables (Production, Preview and Development)
In the **davison-blesson** project → Settings → Environment Variables:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key (Supabase → Project Settings → API Keys) |
| `CRON_SECRET` *(optional)* | any long random string; Vercel sends it to `/api/keepalive` |

Both `NEXT_PUBLIC_` values are public by design: Row Level Security protects the data. Redeploy
after adding them, because they're built into the page.

### 3. Supabase → Authentication → Sign In / Providers → Email
- **Enable Email provider:** on. (Each member is stored with a placeholder email behind the scenes.)
- **Confirm email:** **off.** This is required: with it on, new members would wait for an email that
  can never arrive, and the sign-up screen says "sign-up isn't set up correctly".
- **Minimum password length:** 8.
- Google and the email-link ("magic link") sign-in aren't used; leave them off. No email service
  (Resend) is needed.

### 4. About the member list
The sign-in screen lists members by name from `public.profiles` (created in step 1). It holds only a
display name and the placeholder sign-in address, never progress. Anyone can read the list (that's
how the name tiles work); each member can only add or change their own entry.

### Removing a member or resetting a forgotten password (owner)
There's no email, so members can't reset their own password. In **Supabase → SQL Editor**:

```sql
-- Find the member's sign-in address
select display_name, username_key from public.profiles order by display_name;

-- Set a temporary password (replace both values)
update auth.users
set encrypted_password = extensions.crypt('TempPassword123', extensions.gen_salt('bf'))
where email = 'their-username-key@davidson-blessons.vercel.app';
```

Give them the temporary password; they sign in and choose a new one under **Journey → Your account →
Change password**. Their progress is untouched. To remove a member completely (their tile,
login and progress), delete them in **Authentication → Users**.

### Check it works
1. Open the site: you see "Who's studying today?", whatever page you open.
2. Tap **New member**, enter a name and password: you're signed straight in, and your name tile
   appears for next time.
3. Read a chapter, write a journal note, then open `/journey#account`: "Signed in as <name> · Synced at …".
4. **Sign out**, tap **New member** again for a second person: they start with no progress.
5. Sign back in as the first member (tap their name, any device): their progress and journal are there.
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

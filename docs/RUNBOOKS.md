# Runbooks

## Accounts (Supabase) — one-time setup

Sign-in is **required** and works like the DDA2 training app: **tap your name, then enter your
password** (no email). It uses the Supabase project **selah** (`gohyiyppobpqfxrsnlns`, us-east-1,
free). The `progress` table, its owner-only access rules and the keep-alive are already in place.
Until steps 1–3 are done, the app can't sign anyone in, so do them **before** deploying the sign-in
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
- **Enable Email provider:** on. (Each member is stored with a placeholder email behind the scenes.)
- **Confirm email:** **off.** This is required: with it on, new members would wait for an email that
  can never arrive, and the sign-up screen says "sign-up isn't set up correctly".
- **Minimum password length:** 8.
- Google and the email-link ("magic link") sign-in aren't used; leave them off. No email service
  (Resend) is needed.

### 3. Supabase → SQL Editor: the member list
The sign-in screen lists members by name from `public.profiles`. It holds only a display name and
the placeholder sign-in address, never progress. Anyone can read the list (that's how the name
tiles work); each member can only add or change their own entry. Run once:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  username_key text not null unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Members are listed on the sign-in screen" on public.profiles
  for select to anon, authenticated using (true);
create policy "Members add their own entry" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Members edit their own entry" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Members remove their own entry" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);
```

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

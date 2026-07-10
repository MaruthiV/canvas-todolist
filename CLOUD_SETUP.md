# Cloud sync setup (Supabase + Google sign-in)

The app works fully offline without this — everything saves to your browser.
Follow these steps to add cloud backup + cross-device sync. ~10 minutes.

## 1. Create a Supabase project
1. Go to https://supabase.com → **New project** (free tier is fine).
2. Wait for it to provision.

## 2. Create the table + security rules
In the Supabase dashboard → **SQL Editor** → run this:

```sql
create table if not exists public.documents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "own doc - select" on public.documents
  for select using (auth.uid() = user_id);
create policy "own doc - insert" on public.documents
  for insert with check (auth.uid() = user_id);
create policy "own doc - update" on public.documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Row-level security means each user can only ever read/write their own row.

## 3. Enable Google sign-in
1. Supabase dashboard → **Authentication → Providers → Google** → enable.
2. It shows a **Callback URL** like
   `https://YOUR-PROJECT.supabase.co/auth/v1/callback` — copy it.
3. In [Google Cloud Console](https://console.cloud.google.com/) →
   **APIs & Services → Credentials → Create OAuth client ID → Web application**:
   - **Authorized redirect URIs**: paste the Supabase callback URL from step 2.
   - (Authorized JavaScript origins: `http://localhost:5173`.)
4. Copy the generated **Client ID** and **Client secret** back into Supabase's
   Google provider settings and save.

## 4. Point the app at your project
1. **Key:** Supabase → **Project Settings → API Keys** → under **Publishable
   key**, copy the value starting with `sb_publishable_…`. This is the modern,
   browser-safe replacement for the old "anon" key (it's guarded by RLS).
   - ⚠️ Do **not** use the **Secret key** (`sb_secret_…`) — that's server-only.
   - (Older projects may instead show an **anon public** JWT under a "Legacy API
     keys" tab; that also works.)
2. **URL:** copy your **Project URL** (`https://YOUR-REF.supabase.co`) from the
   **Connect** button at the top, or Settings → **Data API**.
3. In the project root, copy `.env.example` to `.env` and fill them in:
   ```
   VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```
4. Restart the dev server (`npm run dev`). The top-right will now show
   **“Sign in to sync.”**

## How it behaves
- Every change saves to your browser instantly (works offline).
- When signed in, changes push to the cloud ~1s after you stop typing.
- Go offline and it shows **“Offline — will sync”**; it uploads automatically
  when you're back online. Nothing is lost.
- On another device, sign in with the same Google account to load everything.

### Note on the current sync model
Sync is **document-level, last-write-wins** by timestamp — simple and correct
for using one device at a time. If you edit the *same* account on two devices
while *both* are offline, whichever saves last wins for the whole document. If
you want per-note merging later, that's a natural next step.

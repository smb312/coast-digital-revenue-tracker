# Coast Digital — Revenue Tracker

Next.js (App Router) + TypeScript + Tailwind app that forecasts the business's
monthly profit. Data + auth via Supabase (using `@supabase/ssr`). Deploys to
Vercel.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** for styling
- **Supabase** for Postgres + Auth, wired with `@supabase/ssr`
  - Server client (`src/lib/supabase/server.ts`) for server components,
    route handlers, server actions
  - Browser client (`src/lib/supabase/client.ts`) for client components
  - Session refresh in `middleware.ts` → `src/lib/supabase/middleware.ts`
- **Recharts** for the forecast chart

## Local setup

1. Install deps:
   ```bash
   npm install
   ```
2. Copy env and fill in your Supabase project values:
   ```bash
   cp .env.local.example .env.local
   # then edit .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   `.env.local` is gitignored — never commit secrets.
3. Run the dev server:
   ```bash
   npm run dev
   ```

## Database

The Supabase database already exists; the app does not manage migrations.
`schema.sql` is checked in as **reference documentation only** — it mirrors the
live schema (`line_items`, `monthly_overrides`, and the `monthly_ledger` /
`monthly_summary` views). Do not run it against production.

RLS is enabled and scopes every row to the signed-in user. Inserts must **not**
include `user_id`; the database defaults it to `auth.uid()`.

## Deploy (Vercel)

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as
environment variables in the Vercel project, then deploy.

## Build order

1. ✅ Scaffold + Supabase wiring
2. ⬜ Auth + route protection
3. ⬜ Line Items CRUD
4. ⬜ Dashboard table + chart
5. ⬜ Overrides
6. ⬜ Polish

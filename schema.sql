-- ============================================================================
-- coast-digital-revenue-tracker — DATABASE SCHEMA (REFERENCE ONLY)
-- ============================================================================
-- This file documents the EXISTING Supabase schema the app reads/writes.
-- The database is already provisioned. Do NOT run this to "reset" production.
-- It is checked in so the app's types and queries have a source of truth.
--
-- Key rules the app relies on:
--   * RLS is enabled; every table is scoped to auth.uid().
--   * INSERTs must NOT include user_id — it defaults to auth.uid().
--   * Forecast reads come from the monthly_ledger / monthly_summary views.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type item_kind as enum ('income', 'expense');

create type item_category as enum (
  'client_revenue',
  'referral_revenue',
  'other_income',
  'payroll',
  'operating_expense',
  'other_expense'
);

create type item_frequency as enum ('monthly', 'one_time');

-- ---------------------------------------------------------------------------
-- line_items
-- ---------------------------------------------------------------------------
create table line_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null,
  kind          item_kind not null,
  category      item_category not null,
  amount        numeric(14, 2) not null default 0,
  frequency     item_frequency not null default 'monthly',
  start_month   date not null,
  end_month     date,
  counterparty  text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table line_items enable row level security;

create policy "line_items are owner-only"
  on line_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- monthly_overrides — a one-off amount for a single month of a line item
-- ---------------------------------------------------------------------------
create table monthly_overrides (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  line_item_id  uuid not null references line_items (id) on delete cascade,
  month         date not null,            -- first day of the target month
  amount        numeric(14, 2) not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (line_item_id, month)
);

alter table monthly_overrides enable row level security;

create policy "monthly_overrides are owner-only"
  on monthly_overrides for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- View: monthly_ledger — one row per active item per month in the window.
--   Resolves overrides, honors start/end_month and frequency.
--   An item with end_month stops the month AFTER end_month.
--   A one_time item appears only in its start_month.
-- ---------------------------------------------------------------------------
-- (Definition lives in the database. Columns the app consumes:)
--   month (date), line_item_id (uuid), name (text), kind (item_kind),
--   category (item_category), counterparty (text), amount (numeric)

-- ---------------------------------------------------------------------------
-- View: monthly_summary — per-month rollup.
--   Columns the app consumes:
--     month (date), income (numeric), expenses (numeric), net_profit (numeric)
-- ---------------------------------------------------------------------------

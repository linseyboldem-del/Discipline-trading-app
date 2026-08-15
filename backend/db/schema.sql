-- =====================================================================
-- EdgeFlo-style personal trading discipline app — Supabase schema
-- Run this in the Supabase SQL editor on a fresh project.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- profiles: one row per authenticated user, holds account + risk config
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  account_size numeric not null default 10000,
  timezone text not null default 'Africa/Nairobi',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_upsert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- rules: user-defined risk/discipline rules, checked by the pre-trade
-- checklist before a trade is allowed to be logged as "taken"
-- ---------------------------------------------------------------------
create table if not exists rules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  max_risk_percent numeric not null default 1.0,
  daily_loss_limit_percent numeric not null default 3.0,
  max_trades_per_day int not null default 3,
  min_risk_reward numeric not null default 2.0,
  allowed_sessions text[] not null default array['london','ny_am','ny_pm'],
  require_htf_bias boolean not null default true,
  require_liquidity_sweep boolean not null default true,
  cooldown_minutes_after_loss int not null default 30,
  updated_at timestamptz not null default now()
);

alter table rules enable row level security;

create policy "rules_all_own" on rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- trades: the journal itself
-- ---------------------------------------------------------------------
create table if not exists trades (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null default current_date,
  pair text not null default 'XAUUSD',
  direction text not null check (direction in ('long','short')),
  session text not null check (session in ('asian','london','ny_am','ny_pm','other')),
  model text, -- e.g. 'silver_bullet','ob_fvg','judas_ote','breaker','unicorn'
  entry numeric,
  stop_loss numeric,
  take_profit numeric,
  risk_percent numeric,
  planned_rr numeric,
  realized_r numeric, -- actual R multiple achieved, +2.3, -1.0 etc.
  outcome text not null default 'open' check (outcome in ('open','win','loss','breakeven')),
  emotion_before text, -- e.g. 'calm','fomo','revenge','tilted','confident'
  emotion_after text,
  followed_plan boolean,
  rule_violations text[] default '{}',
  notes text,
  screenshot_url text,
  created_at timestamptz not null default now()
);

alter table trades enable row level security;

create policy "trades_all_own" on trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_trades_user_date on trades (user_id, trade_date desc);

-- ---------------------------------------------------------------------
-- checklist_logs: every pre-trade checklist run, pass or fail, is logged
-- so patterns of rule-breaking are visible later, not just individual trades
-- ---------------------------------------------------------------------
create table if not exists checklist_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid references trades(id) on delete set null,
  created_at timestamptz not null default now(),
  answers jsonb not null,
  passed boolean not null,
  blocked_reasons text[] default '{}'
);

alter table checklist_logs enable row level security;

create policy "checklist_all_own" on checklist_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- coach_feedback: stored AI coaching responses so history isn't lost
-- ---------------------------------------------------------------------
create table if not exists coach_feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  trade_ids uuid[] not null default '{}',
  feedback text not null
);

alter table coach_feedback enable row level security;

create policy "coach_feedback_all_own" on coach_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Convenience view: daily P&L in R, used for the daily-loss-limit check
-- ---------------------------------------------------------------------
create or replace view daily_r_summary as
select
  user_id,
  trade_date,
  count(*) as trade_count,
  coalesce(sum(realized_r) filter (where outcome != 'open'), 0) as total_r,
  coalesce(sum(case when outcome = 'loss' then realized_r else 0 end), 0) as loss_r
from trades
group by user_id, trade_date;

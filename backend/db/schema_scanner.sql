-- =====================================================================
-- Scanner module — additive migration. Run after the original schema.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- market_candles: raw OHLCV pushed in by your MT5 bridge script.
-- Not user-scoped (price data isn't private) but still RLS'd to be safe.
-- ---------------------------------------------------------------------
create table if not exists market_candles (
  pair text not null,
  timeframe text not null check (timeframe in ('D1','H4','H1','M15','M5')),
  candle_time timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume numeric,
  ingested_at timestamptz not null default now(),
  primary key (pair, timeframe, candle_time)
);

alter table market_candles enable row level security;

-- Candles are ingested via the service-role key (bridge script), and read
-- by the backend with the service-role key too, so this policy just makes
-- sure no anon/browser client can read or write them directly.
create policy "market_candles_service_only" on market_candles
  for all using (false) with check (false);

create index if not exists idx_candles_pair_tf_time
  on market_candles (pair, timeframe, candle_time desc);

-- ---------------------------------------------------------------------
-- scanner_config: per-user scanner settings
-- ---------------------------------------------------------------------
create table if not exists scanner_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pairs text[] not null default array['XAUUSD','EURUSD','GBPUSD','US30','NAS100'],
  timeframes text[] not null default array['D1','H4','M15'],
  min_grade_for_alert text not null default 'A' check (min_grade_for_alert in ('A','B','C')),
  telegram_chat_id text,
  telegram_enabled boolean not null default false,
  scan_interval_minutes int not null default 15,
  updated_at timestamptz not null default now()
);

alter table scanner_config enable row level security;

create policy "scanner_config_all_own" on scanner_config
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- signals: graded setups produced by the scanner
-- ---------------------------------------------------------------------
create table if not exists signals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pair text not null,
  direction text not null check (direction in ('long','short')),
  grade text not null check (grade in ('A','B','C')),
  model text not null, -- e.g. 'unicorn','ob_fvg','breaker'
  htf_bias text,
  session text,
  entry numeric,
  stop_loss numeric,
  take_profit numeric,
  planned_rr numeric,
  confluences text[] not null default '{}',
  candle_time timestamptz not null,
  status text not null default 'new' check (status in ('new','acted_on','skipped','expired')),
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table signals enable row level security;

create policy "signals_all_own" on signals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_signals_user_created
  on signals (user_id, created_at desc);

-- Prevent the same pair/timeframe/candle from generating duplicate signals
create unique index if not exists uq_signals_dedupe
  on signals (user_id, pair, model, candle_time);

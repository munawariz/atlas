-- Atlas — schema migration.
--
-- This file is IDEMPOTENT and safe to re-run forever. It never touches user data.
-- Running it against a populated database adds only what is missing (see ATLAS.md §18).
--
-- Money is integer rupiah everywhere: bigint, never numeric, never float, never cents.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type category_kind as enum ('income', 'expense', 'saving', 'investment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type txn_type as enum ('expense', 'income', 'saving', 'investment', 'transfer', 'withdrawal');
exception when duplicate_object then null; end $$;

-- Adopted databases from an older build may predate `withdrawal`.
alter type txn_type add value if not exists 'withdrawal';

-- ---------------------------------------------------------------------------
-- Wallets & categories
-- ---------------------------------------------------------------------------
create table if not exists wallets (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order int not null default 0,
  archived boolean not null default false
);

create table if not exists categories (
  id bigint generated always as identity primary key,
  kind category_kind not null,
  name text not null,
  sort_order int not null default 0,
  archived boolean not null default false,
  unique (kind, name)
);
-- Budget cadence bound to the category: 'daily' | 'weekly' | 'monthly' | 'yearly'.
-- Weeks run Monday->Sunday.
alter table categories add column if not exists period text not null default 'monthly';
-- Marks an expense category as an installment category (one per paylater provider), so the
-- stats page can separate installment spend from normal spend.
alter table categories add column if not exists is_installment boolean not null default false;
-- Favorites float to their own tab in the Add sheet's category picker.
alter table categories add column if not exists is_favorite boolean not null default false;

-- Groups: user-named collections of categories that drive the Add sheet. A group can mix
-- kinds (e.g. "Daily Life" holding an expense, an income and a saving category), and a
-- category can belong to any number of groups.
create table if not exists category_groups (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order int not null default 0,
  archived boolean not null default false
);

create table if not exists category_group_members (
  group_id bigint not null references category_groups(id) on delete cascade,
  category_id bigint not null references categories(id) on delete cascade,
  primary key (group_id, category_id)
);

-- ---------------------------------------------------------------------------
-- The single ledger
-- ---------------------------------------------------------------------------
create table if not exists transactions (
  id bigint generated always as identity primary key,
  occurred_on date not null,
  type txn_type not null,
  amount bigint not null check (amount >= 0),
  description text,
  category_id bigint references categories(id) on delete set null,
  source_wallet_id bigint references wallets(id) on delete set null,
  dest_wallet_id bigint references wallets(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_txn_occurred_on on transactions (occurred_on);
create index if not exists idx_txn_type on transactions (type);
create index if not exists idx_txn_category on transactions (category_id);

-- Normalize descriptions: the app trims on entry, so bring older rows (spreadsheet-era
-- imports) in line. Whitespace-only descriptions become null. A deliberate, lossless
-- exception to the "never touch user data" rule — idempotent, whitespace only.
update transactions
  set description = nullif(btrim(description), '')
  where description is not null
    and (description <> btrim(description) or btrim(description) = '');

-- Opening balances, all stored at the single month given by app_settings.opening_month.
create table if not exists wallet_balances (
  id bigint generated always as identity primary key,
  month date not null,
  wallet_id bigint not null references wallets(id) on delete cascade,
  balance bigint not null default 0,
  unique (month, wallet_id)
);

-- ---------------------------------------------------------------------------
-- Budgets: per-month OVERRIDE beats recurring RULE (ATLAS.md §3.4)
-- ---------------------------------------------------------------------------
create table if not exists budgets (
  id bigint generated always as identity primary key,
  category_id bigint not null references categories(id) on delete cascade,
  month date not null,
  amount bigint not null default 0,
  unique (category_id, month)
);

create table if not exists recurring_budgets (
  id bigint generated always as identity primary key,
  category_id bigint not null references categories(id) on delete cascade,
  amount bigint not null default 0,
  effective_from date not null,
  unique (category_id, effective_from)
);

-- ---------------------------------------------------------------------------
-- Settings. The ONLY place category/wallet choices for automated transactions live,
-- plus `opening_month`. Nothing in the app hardcodes a category name.
-- ---------------------------------------------------------------------------
create table if not exists app_settings (key text primary key, value text);

-- opening_month: the single month `wallet_balances` stores starting balances at.
-- Adopt an existing database's month if one is already in use; otherwise leave it for the app
-- to set on first save. Never overwrite an existing value.
insert into app_settings (key, value)
select 'opening_month', to_char(min(month), 'YYYY-MM-DD') from wallet_balances
having min(month) is not null
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Installments
-- ---------------------------------------------------------------------------
create table if not exists paylater_items (
  id bigint generated always as identity primary key,
  item text not null,
  monthly_amount bigint not null default 0,
  first_month_date date not null,
  last_month_date date not null,
  category_id bigint references categories(id) on delete set null,  -- legacy/unused
  note text
);

-- Installment providers (Credit Card, Paylater, Store Credit...). Each owns a 1:1
-- installment expense category named after it.
create table if not exists paylater_providers (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order integer not null default 0,
  archived boolean not null default false,
  category_id bigint references categories(id) on delete set null
);
alter table paylater_items add column if not exists provider_id bigint
  references paylater_providers(id) on delete set null;

-- Backfill: give every provider its installment category, idempotently.
insert into categories (kind, name, is_installment)
  select 'expense', p.name, true from paylater_providers p where p.category_id is null
  on conflict (kind, name) do update set is_installment = true;
update paylater_providers p set category_id = c.id from categories c
  where c.kind = 'expense' and c.name = p.name and p.category_id is null;

-- One row per PAID installment month. expense_txn_id links the expense it booked.
create table if not exists paylater_payments (
  id bigint generated always as identity primary key,
  item_id bigint not null references paylater_items(id) on delete cascade,
  month date not null,
  expense_txn_id bigint references transactions(id) on delete set null,
  unique (item_id, month)
);

-- ---------------------------------------------------------------------------
-- Forex. `units` is the CURRENT balance; NOT counted in IDR net worth.
-- ---------------------------------------------------------------------------
create table if not exists forex_accounts (
  id bigint generated always as identity primary key,
  name text not null unique,
  currency text not null,          -- ISO code, e.g. 'JPY'
  units numeric not null default 0
);

create table if not exists forex_transactions (
  id bigint generated always as identity primary key,
  account_id bigint not null references forex_accounts(id) on delete cascade,
  occurred_on date not null,
  direction text not null,         -- 'buy' | 'sell'
  idr bigint not null,
  units numeric not null,
  wallet_id bigint references wallets(id) on delete set null,
  txn_id bigint references transactions(id) on delete set null,     -- buy = investment / sell = cost-basis withdrawal
  pl_txn_id bigint references transactions(id) on delete set null,  -- realized P/L on a sell
  realized_pl bigint
);
create index if not exists idx_forex_txn_account on forex_transactions (account_id);

-- ---------------------------------------------------------------------------
-- Loans = money OTHER PEOPLE owe the user, collected monthly (receivables).
-- ---------------------------------------------------------------------------
create table if not exists loans (
  id bigint generated always as identity primary key,
  person text not null,
  note text,
  installment bigint not null default 0,
  lender text
);

create table if not exists loan_payments (
  id bigint generated always as identity primary key,
  loan_id bigint not null references loans(id) on delete cascade,
  period_month date not null,
  paid boolean not null default false,
  income_txn_id bigint references transactions(id) on delete set null,
  amount bigint,                   -- actually collected (may be partial); null = full installment
  unique (loan_id, period_month)
);

-- ---------------------------------------------------------------------------
-- Stocks. Quantity is in lots; 1 lot = 100 shares (IDX market convention).
-- ---------------------------------------------------------------------------
create table if not exists stock_trades (
  id bigint generated always as identity primary key,
  ticker text not null,
  side text not null check (side in ('buy', 'sell')),
  lots integer not null check (lots > 0),
  idr bigint not null,             -- money spent (buy) / received (sell)
  occurred_on date not null,
  opening boolean not null default false,  -- pre-existing holding, books no money movement
  wallet_id bigint references wallets(id) on delete set null,
  txn_id bigint references transactions(id) on delete set null,
  pl_txn_id bigint references transactions(id) on delete set null,
  realized_pl bigint
);
create index if not exists idx_stock_trades_ticker on stock_trades (ticker);

-- Recurring monthly buy target (base rule, versioned like recurring_budgets).
create table if not exists stock_targets (
  id bigint generated always as identity primary key,
  ticker text not null,
  lots integer not null default 1 check (lots > 0),
  price bigint                     -- speculative price/share for cashflow estimates
);
alter table stock_targets add column if not exists effective_from date not null default '1900-01-01';
alter table stock_targets drop constraint if exists stock_targets_ticker_key;
create unique index if not exists stock_targets_ticker_eff_key on stock_targets (ticker, effective_from);

-- Per-month override of a stock buy target (mirrors `budgets`).
create table if not exists stock_target_months (
  id bigint generated always as identity primary key,
  ticker text not null,
  month date not null,
  lots integer not null check (lots > 0),
  price bigint,
  unique (ticker, month)
);
create index if not exists idx_stock_target_months_month on stock_target_months (month);

-- Dividends kept in their own table so lifetime per-ticker totals survive selling out.
create table if not exists stock_dividends (
  id bigint generated always as identity primary key,
  ticker text not null,
  idr bigint not null check (idr > 0),
  occurred_on date not null,
  wallet_id bigint references wallets(id) on delete set null,
  txn_id bigint references transactions(id) on delete set null,
  note text
);
create index if not exists idx_stock_dividends_ticker on stock_dividends (ticker);

-- Bonds: buy/sell move principal in/out of the bond bucket; coupons are income.
create table if not exists bond_trades (
  id bigint generated always as identity primary key,
  name text not null,              -- bond series / issue name, free text
  side text not null check (side in ('buy', 'sell', 'coupon')),
  units numeric not null default 0,
  idr bigint not null,
  occurred_on date not null,
  wallet_id bigint references wallets(id) on delete set null,
  txn_id bigint references transactions(id) on delete set null
);
create index if not exists idx_bond_trades_name on bond_trades (name);

-- ---------------------------------------------------------------------------
-- Materialized monthly deltas + trigger (ATLAS.md §4.1) — performance-critical.
-- balance at end of month M = opening + sum(delta) where month <= M
-- ---------------------------------------------------------------------------
create table if not exists monthly_wallet_delta (
  month date not null,
  wallet_id bigint not null references wallets(id) on delete cascade,
  delta bigint not null default 0,
  primary key (month, wallet_id)
);

create or replace function ft_apply_delta(p_month date, p_wallet bigint, p_amt bigint)
returns void language sql as $$
  insert into monthly_wallet_delta (month, wallet_id, delta) values (p_month, p_wallet, p_amt)
  on conflict (month, wallet_id) do update set delta = monthly_wallet_delta.delta + excluded.delta;
$$;

-- sgn = +1 to apply, -1 to reverse. Mirrors the balance rule in ATLAS.md §3.3 EXACTLY.
create or replace function ft_row_to_delta(r transactions, sgn int)
returns void language plpgsql as $$
declare m date := date_trunc('month', r.occurred_on)::date;
begin
  if r.type in ('income', 'withdrawal') then
    if r.dest_wallet_id is not null then perform ft_apply_delta(m, r.dest_wallet_id, sgn * r.amount); end if;
  elsif r.type = 'transfer' then
    if r.source_wallet_id is not null then perform ft_apply_delta(m, r.source_wallet_id, -sgn * r.amount); end if;
    if r.dest_wallet_id   is not null then perform ft_apply_delta(m, r.dest_wallet_id,    sgn * r.amount); end if;
  else -- expense, saving, investment
    if r.source_wallet_id is not null then perform ft_apply_delta(m, r.source_wallet_id, -sgn * r.amount); end if;
  end if;
end;
$$;

create or replace function ft_txn_delta_trigger() returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then perform ft_row_to_delta(NEW, 1);
  elsif (TG_OP = 'DELETE') then perform ft_row_to_delta(OLD, -1);
  elsif (TG_OP = 'UPDATE') then perform ft_row_to_delta(OLD, -1); perform ft_row_to_delta(NEW, 1);
  end if;
  return null;
end;
$$;

drop trigger if exists txn_delta on transactions;
create trigger txn_delta after insert or update or delete on transactions
  for each row execute function ft_txn_delta_trigger();

-- Rebuild from scratch at the end of the migration (idempotent). This is what makes an
-- adopted database's balances correct on the first run.
truncate monthly_wallet_delta;
insert into monthly_wallet_delta (month, wallet_id, delta)
select date_trunc('month', occurred_on)::date, wid, sum(amt) from (
  select occurred_on, dest_wallet_id   as wid,  amount from transactions where type in ('income','withdrawal') and dest_wallet_id is not null
  union all
  select occurred_on, source_wallet_id as wid, -amount from transactions where type in ('expense','saving','investment') and source_wallet_id is not null
  union all
  select occurred_on, source_wallet_id as wid, -amount from transactions where type = 'transfer' and source_wallet_id is not null
  union all
  select occurred_on, dest_wallet_id   as wid,  amount from transactions where type = 'transfer' and dest_wallet_id   is not null
) s(occurred_on, wid, amt)
group by 1, 2;

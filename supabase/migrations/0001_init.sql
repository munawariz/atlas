-- Finance Tracker 2026 — schema
-- Money is stored as integer rupiah (no decimals). Direction is encoded by `type`,
-- so all `amount` values are non-negative.

create type category_kind as enum ('income', 'expense', 'saving', 'investment');
create type txn_type as enum ('expense', 'income', 'saving', 'investment', 'transfer', 'withdrawal');
-- 'withdrawal' = "Ambil Tabungan": move money from a saving/investment bucket back into a
-- wallet (dest_wallet_id = wallet, category_id = the bucket). Added idempotently for
-- databases created before this type existed.
alter type txn_type add value if not exists 'withdrawal';

create table if not exists wallets (
  id          bigint generated always as identity primary key,
  name        text   not null unique,
  sort_order  int    not null default 0,
  archived    boolean not null default false
);

create table if not exists categories (
  id          bigint generated always as identity primary key,
  kind        category_kind not null,
  name        text   not null,
  sort_order  int    not null default 0,
  archived    boolean not null default false,
  unique (kind, name)
);

-- One row per logged movement of money.
--   expense           : source_wallet = wallet spent from, category = expense category
--   income            : dest_wallet   = wallet received into, category = income category
--   transfer          : source_wallet -> dest_wallet (both wallets)
--   saving/investment : source_wallet = funding wallet, category = the saving/investment bucket
create table if not exists transactions (
  id              bigint generated always as identity primary key,
  occurred_on     date   not null,
  type            txn_type not null,
  amount          bigint not null check (amount >= 0),
  description     text,
  category_id     bigint references categories(id) on delete set null,
  source_wallet_id bigint references wallets(id) on delete set null,
  dest_wallet_id  bigint references wallets(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_txn_occurred_on on transactions (occurred_on);
create index if not exists idx_txn_type on transactions (type);
create index if not exists idx_txn_category on transactions (category_id);

-- Manually entered monthly wallet balances -> networth (mirrors the Dashboard sheet).
create table if not exists wallet_balances (
  id         bigint generated always as identity primary key,
  month      date   not null,                 -- first day of the month
  wallet_id  bigint not null references wallets(id) on delete cascade,
  balance    bigint not null default 0,
  unique (month, wallet_id)
);

create table if not exists budgets (
  id          bigint generated always as identity primary key,
  category_id bigint not null references categories(id) on delete cascade,
  month       date   not null,                -- first day of the month
  amount      bigint not null default 0,
  unique (category_id, month)
);

-- Recurring monthly budgets: `amount` applies to every month from `effective_from`
-- onward, unless a per-month `budgets` row overrides it, or a later rule (greater
-- effective_from) supersedes it. Lets a budget be set once for all months going forward.
create table if not exists recurring_budgets (
  id             bigint generated always as identity primary key,
  category_id    bigint not null references categories(id) on delete cascade,
  amount         bigint not null default 0,
  effective_from date   not null,             -- first month this amount applies (first-of-month)
  unique (category_id, effective_from)
);

-- Budget cadence bound to each category: 'daily' | 'weekly' | 'monthly' | 'yearly'
-- (set on the Categories page). Monthly keeps the per-month override + effective_from
-- versioning; the other periods use a single recurring rule whose amount is the
-- per-period limit. Weeks run Monday→Sunday.
alter table categories add column if not exists period text not null default 'monthly';
-- Marks an expense category as an installment category (one per paylater provider, plus the
-- default "Cicilan Paylater"). Lets the stats page separate installment spend from normal.
alter table categories add column if not exists is_installment boolean not null default false;
update categories set is_installment = true where kind = 'expense' and name = 'Cicilan Paylater' and not is_installment;

-- Key/value app settings. Lets a self-hosting clone map auto-transaction categories &
-- default wallets to their own setup instead of hardcoded names (see lib/settings.ts).
create table if not exists app_settings (
  key   text primary key,
  value text
);

-- Cicilan Paylater — installment purchases, paid over a span of months (any year).
-- category_id (nullable) lets an installment be budgeted/booked under a custom expense
-- category instead of the default "Cicilan Paylater".
create table if not exists paylater_items (
  id                bigint generated always as identity primary key,
  item              text   not null,
  monthly_amount    bigint not null default 0,
  first_month_date  date   not null,
  last_month_date   date   not null,
  category_id       bigint references categories(id) on delete set null,
  note              text
);
alter table paylater_items add column if not exists category_id bigint references categories(id) on delete set null;

-- Installment providers (e.g. ShopeePaylater, GoPayLater, Credit Card) — an optional
-- grouping label for paylater items. Deleting a provider just ungroups its items.
create table if not exists paylater_providers (
  id         bigint  generated always as identity primary key,
  name       text    not null unique,
  sort_order integer not null default 0,
  archived   boolean not null default false,
  category_id bigint references categories(id) on delete set null  -- the provider's installment expense category
);
alter table paylater_providers add column if not exists category_id bigint references categories(id) on delete set null;
alter table paylater_items add column if not exists provider_id bigint references paylater_providers(id) on delete set null;

-- Backfill: give every provider a 1:1 installment expense category (named after it), so
-- existing providers are consistent without waiting for their first payment. Idempotent.
insert into categories (kind, name, is_installment)
  select 'expense', p.name, true from paylater_providers p
  where p.category_id is null
  on conflict (kind, name) do update set is_installment = true;
update paylater_providers p
  set category_id = c.id
  from categories c
  where c.kind = 'expense' and c.name = p.name and p.category_id is null;

-- Migrate older 1..12 month-index columns (2026 only) to real dates. Runs once.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'paylater_items' and column_name = 'first_month') then
    alter table paylater_items add column if not exists first_month_date date;
    alter table paylater_items add column if not exists last_month_date date;
    alter table paylater_items add column if not exists paid_through_date date;
    update paylater_items set
      first_month_date  = make_date(2026, least(12, greatest(1, first_month)), 1),
      last_month_date   = make_date(2026, least(12, greatest(1, last_month)), 1),
      paid_through_date = case when paid_through between 1 and 12 then make_date(2026, paid_through, 1) end
    where first_month_date is null;
    alter table paylater_items alter column first_month_date set not null;
    alter table paylater_items alter column last_month_date set not null;
    alter table paylater_items drop column first_month;
    alter table paylater_items drop column last_month;
    alter table paylater_items drop column paid_through;
  end if;
end
$$;

-- One row per PAID installment month (mirrors loan_payments). A row = that month is paid;
-- expense_txn_id links the expense it booked, so un-paying can remove that exact record.
create table if not exists paylater_payments (
  id             bigint generated always as identity primary key,
  item_id        bigint not null references paylater_items(id) on delete cascade,
  month          date   not null,
  expense_txn_id bigint references transactions(id) on delete set null,
  unique (item_id, month)
);

-- Migrate the old paid_through_date marker into per-month paid rows, then drop it.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'paylater_items' and column_name = 'paid_through_date') then
    insert into paylater_payments (item_id, month)
    select pi.id, gs::date
    from paylater_items pi
    cross join lateral generate_series(
      pi.first_month_date, least(pi.last_month_date, pi.paid_through_date), interval '1 month'
    ) gs
    where pi.paid_through_date is not null
    on conflict (item_id, month) do nothing;
    alter table paylater_items drop column paid_through_date;
  end if;
end
$$;

-- Forex holdings — a balance in a foreign currency. `units` is the CURRENT balance;
-- it is NOT counted in IDR networth — the foreign amount is shown on its own.
create table if not exists forex_accounts (
  id       bigint generated always as identity primary key,
  name     text   not null unique,
  currency text   not null,            -- ISO code, e.g. 'JPY'
  units    numeric not null default 0  -- current balance in the foreign currency
);

-- Per-month log of forex moves (buy = IDR→currency, sell = currency→IDR). A buy books an
-- investment from the wallet into the "Forex" bucket; a sell returns the cost basis to the
-- wallet (withdrawal) and books the realized P/L (Forex Profit income / Forex Loss expense),
-- mirroring the stock_trades module. `txn_id` is the buy/cost-basis ledger row, `pl_txn_id`
-- the realized-P/L row, `realized_pl` the proceeds − cost basis on a sell.
create table if not exists forex_transactions (
  id          bigint generated always as identity primary key,
  account_id  bigint not null references forex_accounts(id) on delete cascade,
  occurred_on date   not null,
  direction   text   not null,         -- 'buy' | 'sell'
  idr         bigint not null,
  units       numeric not null,
  wallet_id   bigint references wallets(id) on delete set null,
  txn_id      bigint references transactions(id) on delete set null,
  pl_txn_id   bigint references transactions(id) on delete set null,  -- realized P/L on a sell
  realized_pl bigint                                                  -- proceeds − cost basis (sells only)
);
alter table forex_transactions add column if not exists pl_txn_id bigint references transactions(id) on delete set null;
alter table forex_transactions add column if not exists realized_pl bigint;

-- Loans — money other people owe the user, collected monthly (receivables).
create table if not exists loans (
  id          bigint generated always as identity primary key,
  person      text   not null,
  note        text,
  installment bigint not null default 0,       -- monthly amount paid back
  lender      text
);

-- One scheduled installment month per row (period_month = first-of-month, any year).
-- income_txn_id links a collected month to the Hutang income record it created, so
-- un-collecting can remove that exact record.
create table if not exists loan_payments (
  id            bigint generated always as identity primary key,
  loan_id       bigint not null references loans(id) on delete cascade,
  period_month  date   not null,
  paid          boolean not null default false,
  income_txn_id bigint references transactions(id) on delete set null,
  unique (loan_id, period_month)
);

alter table loan_payments
  add column if not exists income_txn_id bigint references transactions(id) on delete set null;
-- Actual amount collected for the month (may be partial). Null on legacy rows = full installment.
alter table loan_payments add column if not exists amount bigint;

-- Migrate older period_index (1 = Jan 2026 …) to a real month date. Runs once.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'loan_payments' and column_name = 'period_index') then
    alter table loan_payments add column if not exists period_month date;
    update loan_payments
      set period_month = (date '2025-12-01' + (period_index || ' months')::interval)::date
      where period_month is null;
    alter table loan_payments drop constraint if exists loan_payments_loan_id_period_index_key;
    alter table loan_payments alter column period_month set not null;
    create unique index if not exists loan_payments_loan_month_key on loan_payments (loan_id, period_month);
    alter table loan_payments drop column period_index;
  end if;
end
$$;

-- Stock trades — ticker-level buys/sells (Indonesian lots; 1 lot = 100 shares). Each
-- non-opening trade also books a transactions row (buy = investment from the wallet,
-- sell = withdrawal into it, both category "Stock") so wallet balances + the Stock
-- investment bucket stay consistent. `opening` rows describe pre-existing holdings and
-- book no money movement.
create table if not exists stock_trades (
  id          bigint generated always as identity primary key,
  ticker      text    not null,
  side        text    not null check (side in ('buy', 'sell')),
  lots        integer not null check (lots > 0),
  idr         bigint  not null,                 -- money spent (buy) / received (sell)
  occurred_on date    not null,
  opening     boolean not null default false,   -- pre-existing holding, no wallet movement
  wallet_id   bigint references wallets(id) on delete set null,
  txn_id      bigint references transactions(id) on delete set null,  -- buy=investment, sell=cost-basis withdrawal
  pl_txn_id   bigint references transactions(id) on delete set null,  -- realized P/L on a sell (Trading income / Cut Loss expense)
  realized_pl bigint                                                  -- proceeds − cost basis (sells only)
);
create index if not exists idx_stock_trades_ticker on stock_trades (ticker);
alter table stock_trades add column if not exists pl_txn_id bigint references transactions(id) on delete set null;
alter table stock_trades add column if not exists realized_pl bigint;

-- Bond trades — buys/sells move principal in/out of the "Bonds" investment bucket
-- (buy = investment from a wallet, sell = withdrawal into it); coupons are interest
-- income booked under "Kupon". Each row books a matching transactions row.
create table if not exists bond_trades (
  id          bigint generated always as identity primary key,
  name        text    not null,                 -- series, e.g. ORI024 / SR019 / FR
  side        text    not null check (side in ('buy', 'sell', 'coupon')),
  units       numeric not null default 0,       -- bond units (buy/sell; 0 for coupons)
  idr         bigint  not null,                 -- money spent (buy) / received (sell, coupon)
  occurred_on date    not null,
  wallet_id   bigint references wallets(id) on delete set null,
  txn_id      bigint references transactions(id) on delete set null
);
create index if not exists idx_bond_trades_name on bond_trades (name);
alter table bond_trades add column if not exists units numeric not null default 0;

-- ============================================================================
-- Materialized monthly balances: one row per (month, wallet) holding that month's
-- NET change. A trigger keeps it in sync on every transaction change, so the Stats
-- page reads this tiny table instead of summing the whole transaction history.
-- Balance at end of month M = opening + sum(delta where month <= M).
-- ============================================================================
create table if not exists monthly_wallet_delta (
  month     date   not null,                 -- first day of the month
  wallet_id bigint not null references wallets(id) on delete cascade,
  delta     bigint not null default 0,
  primary key (month, wallet_id)
);

create or replace function ft_apply_delta(p_month date, p_wallet bigint, p_amt bigint)
returns void language sql as $$
  insert into monthly_wallet_delta (month, wallet_id, delta)
  values (p_month, p_wallet, p_amt)
  on conflict (month, wallet_id)
  do update set delta = monthly_wallet_delta.delta + excluded.delta;
$$;

-- Applies a transaction row's effect to the delta table. sgn = +1 to apply, -1 to reverse.
-- Mirrors the balance rule exactly: income +dest, expense/saving/investment -source,
-- transfer -source / +dest.
create or replace function ft_row_to_delta(r transactions, sgn int)
returns void language plpgsql as $$
declare m date := date_trunc('month', r.occurred_on)::date;
begin
  if r.type in ('income', 'withdrawal') then  -- both credit the destination wallet
    if r.dest_wallet_id is not null then perform ft_apply_delta(m, r.dest_wallet_id, sgn * r.amount); end if;
  elsif r.type = 'transfer' then
    if r.source_wallet_id is not null then perform ft_apply_delta(m, r.source_wallet_id, -sgn * r.amount); end if;
    if r.dest_wallet_id is not null then perform ft_apply_delta(m, r.dest_wallet_id, sgn * r.amount); end if;
  else  -- expense, saving, investment
    if r.source_wallet_id is not null then perform ft_apply_delta(m, r.source_wallet_id, -sgn * r.amount); end if;
  end if;
end;
$$;

create or replace function ft_txn_delta_trigger()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    perform ft_row_to_delta(NEW, 1);
  elsif (TG_OP = 'DELETE') then
    perform ft_row_to_delta(OLD, -1);
  elsif (TG_OP = 'UPDATE') then
    perform ft_row_to_delta(OLD, -1);
    perform ft_row_to_delta(NEW, 1);
  end if;
  return null;
end;
$$;

drop trigger if exists txn_delta on transactions;
create trigger txn_delta
  after insert or update or delete on transactions
  for each row execute function ft_txn_delta_trigger();

-- (Re)build the delta table from existing transactions. Idempotent.
truncate monthly_wallet_delta;
insert into monthly_wallet_delta (month, wallet_id, delta)
select date_trunc('month', occurred_on)::date as m, wid, sum(amt)
from (
  select occurred_on, dest_wallet_id   as wid,  amount as amt from transactions where type in ('income','withdrawal') and dest_wallet_id   is not null
  union all
  select occurred_on, source_wallet_id as wid, -amount as amt from transactions where type in ('expense','saving','investment') and source_wallet_id is not null
  union all
  select occurred_on, source_wallet_id as wid, -amount as amt from transactions where type = 'transfer' and source_wallet_id is not null
  union all
  select occurred_on, dest_wallet_id   as wid,  amount as amt from transactions where type = 'transfer' and dest_wallet_id   is not null
) s
group by date_trunc('month', occurred_on)::date, wid;

-- "Ambil Tabungan" is now the 'withdrawal' transaction type, not an income category.
-- Archive the old income category so it's hidden from pickers (history still resolves it).
update categories set archived = true where kind = 'income' and name = 'Ambil Tabungan';

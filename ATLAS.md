# Build "Atlas" — a mobile-first personal finance PWA

You are building a complete, production-ready web application from scratch. Read this entire
document before writing code. Follow it precisely — the data model and money conventions are
load-bearing, and small deviations break the whole ledger.

---

## 0. What you are building

**Atlas** is a single-user (shared-password) personal finance tracker, designed phone-first and
installable as a PWA. It replaces a spreadsheet: you log every movement of money, and the app
derives net worth, budgets, savings buckets, installment schedules, loans receivable, and an
investment portfolio (stocks / bonds / forex) from that one ledger.

Currency is **Indonesian Rupiah (IDR)**. Money is stored as **integer rupiah — never floats,
never cents**.

Everything is self-hostable: the user brings their own Supabase project, sets a password, and
customizes categories/wallets in-app. Nothing is hardcoded to one person's setup.

### 0.1 Language — English by default

**Every string in this app is English**: UI copy, default category names, seeded data, and the
descriptions written onto auto-generated transactions. Do not emit Indonesian — or any other
language — unless the person commissioning the build explicitly asks for it.

`Rp` / `IDR` are a *currency*, not a language choice. Keep them, the same way you'd keep `$` or
`€`. Everything that is genuinely localizable funnels through one place, so a language swap is a
single edit rather than a hunt through the tree:

```ts
// lib/format.ts
export const LOCALE = "en-US";   // number grouping + month names
export const CURRENCY = "IDR";   // the money being tracked — independent of LOCALE
```

If the user *does* ask for Bahasa Indonesia, set `LOCALE = "id-ID"` and apply the substitution
table in **Appendix A**. Nothing else in the build changes.

---

## 1. Tech stack (use exactly these)

| Concern | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, React Server Components, Server Actions) |
| React | **19.2** |
| Language | TypeScript 5, `strict: true` |
| Styling | **Tailwind CSS v4** (CSS-first `@theme` config, `@tailwindcss/postcss`) |
| Database | **Supabase** (Postgres) via `@supabase/supabase-js`, **service-role key, server-only** |
| Auth | Shared password → signed **HS256 JWT** cookie via `jose` |
| Excel export | `exceljs` |
| Migration runner | `pg` in a plain Node script |
| Server-only guard | `server-only` package |
| Fonts | `next/font/google` — **JetBrains Mono** (display/mono) + **Hanken Grotesk** (sans) |

`package.json`:

```json
{
  "name": "atlas",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "migrate": "node scripts/migrate.mjs supabase/migrations/0001_init.sql",
    "seed": "node scripts/migrate.mjs supabase/seed.sql"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.107.0",
    "exceljs": "^4.4.0",
    "jose": "^6.2.3",
    "next": "16.2.7",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "pg": "^8.21.0",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

> **IMPORTANT — Next.js 16 differs from older versions you may have memorized.** Before writing
> routing/middleware/params code, check the installed docs in `node_modules/next/dist/docs/`.
> Known differences this project depends on:
> - **`middleware.ts` is renamed to `proxy.ts`**, and the exported function is `proxy()` (same
>   `NextRequest`/`NextResponse` API, same `config.matcher`). The file lives at the project root.
> - `params` and `searchParams` in pages/layouts are **Promises** — you must `await` them.
> - `cookies()` from `next/headers` is **async** — `await cookies()`.

`tsconfig.json` path alias: `"@/*": ["./*"]`.

`next.config.ts`: enable standalone output **only** inside Docker so Vercel builds are unaffected:

```ts
const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
};
```

No ESLint config, no test runner — this project ships neither. Do not add them unless asked.

---

## 2. Environment variables

Create `.example.env` (committed) and have the user copy it to `.env.local` (gitignored).
**None of these are exposed to the browser** — there are no `NEXT_PUBLIC_*` vars at all.

```bash
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_PASSWORD=change-me-to-something-long
COOKIE_SECRET=replace-with-32+-random-bytes-hex
# Only used by the migrate/seed scripts and the Docker `setup` profile:
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres
```

---

## 3. Core domain model — read this twice

### 3.1 The single ledger

**One `transactions` table** discriminated by a `type` enum. `amount` is always **non-negative**;
direction is implied by `type`. Six types:

| type | Meaning | source_wallet_id | dest_wallet_id | category_id |
|---|---|---|---|---|
| `expense` | Money spent | wallet paid from | — | expense category |
| `income` | Money received | — | wallet received into | income category |
| `saving` | Set aside into a saving bucket | funding wallet | — | saving category |
| `investment` | Put into an investment bucket | funding wallet | — | investment category |
| `transfer` | Between two wallets | from | to | null |
| `withdrawal` | Take money **back out** of a saving/investment bucket | — | wallet received into | the bucket's category (saving **or** investment) |

`withdrawal` is the inverse of `saving`/`investment` — it is *not* income. In the UI it is
labeled **"Withdraw"**.

### 3.1b Category groups — what the Add sheet leads with

Categories keep their hard `kind` (income/expense/saving/investment), but users also organize
them into **groups** — named collections free to mix kinds ("Daily Life" can hold Groceries
(expense), Cashback (income) and Emergency Fund (saving)). A category can belong to **any
number of groups**; membership lives in a `category_group_members` join table.

The Add sheet's picker is a horizontally scrollable **tab row right below the date**:
**Recent** (distinct categories of the latest entries by id, max 5 — the default tab) ·
**Favorite** (categories with `is_favorite`, starred on More → Categories) · one tab per
user group · **All** (every active category, kinds kept together). Tapping a category
**derives the transaction type from its kind** — so the user never picks a type — and the
wallet step follows the money: expense/saving/investment ask for the **From** wallet, income
asks for the **To** wallet. Transfers and withdrawals are not in the Add sheet — they live in
their own **Move sheet** (`components/MoveSheet.tsx`), opened from the tab bar's fourth slot
(which replaced Budget; Budgets is reached via More).

### 3.2 Wallets vs buckets

- **Wallets** hold real cash (Cash, Bank, E-Wallet, Broker). Their sum is **net worth**.
- **Saving/investment categories are buckets**, not wallets. Money moved into a bucket
  *leaves* net worth. `Savings page balance = Σ contributions − Σ withdrawals`.
- **Forex holdings are tracked separately** in a foreign currency and are **never counted in
  IDR net worth** — they're shown on their own line with a live reference rate.

### 3.3 Wallet balance rule (memorize it — it appears in 3 places)

```
balance(wallet, month M) = opening_balance
                         + Σ amount where type IN (income, withdrawal) AND dest_wallet   = wallet
                         − Σ amount where type IN (expense, saving, investment) AND source_wallet = wallet
                         − Σ amount where type = transfer AND source_wallet = wallet
                         + Σ amount where type = transfer AND dest_wallet   = wallet
   ... over all transactions with occurred_on <= end of month M
```

Opening balances live in `wallet_balances` at a single **opening month**. That month is **not a
hardcoded constant** — it is `app_settings.opening_month`, so a database that started at a
different point still reconciles (see §8 and §18).

This rule is implemented **three times and they must agree exactly**:
1. A Postgres trigger maintaining `monthly_wallet_delta` (see §4).
2. `deriveWalletBalances()` in `lib/data.ts` (reads the delta table).
3. The dashboard's per-day recomputation (`bumpWallet` loop).

### 3.4 The "override beats recurring rule" pattern

Used **twice**, identically — for category budgets and for stock buy targets:

- A **recurring rule** table keyed by `(entity, effective_from)`. For a given month, the winning
  rule is the one with the **greatest `effective_from <= month`**.
- A **per-month override** table keyed by `(entity, month)`. If a row exists for that month, it
  **wins outright**.

Three save scopes in the UI:
- `month` → write only the per-month override row.
- `forward` → delete later rules + all overrides `>= month`, then upsert a rule at `effective_from = month`.
- `all` → delete every rule and every override for the entity, then insert one rule at `effective_from = '1900-01-01'`.

### 3.5 Auto-booked transactions

Several features create ledger rows automatically and store the resulting `txn_id` so the action
can be reversed cleanly:

| Action | Ledger rows created |
|---|---|
| Pay an installment month | `expense` from wallet, under the **provider's own** installment category |
| Collect a loan month | `income` into wallet, category `cat_loan` |
| Buy stock | `investment` from wallet → `cat_stock` |
| Sell stock | `withdrawal` of the **cost basis** into wallet from `cat_stock`, **plus** a P/L row: `income`/`cat_stock_profit` if profit, `expense`/`cat_stock_loss` if loss |
| Log dividend | `income` into wallet, category `cat_stock_dividend` |
| Buy bond | `investment` from wallet → `cat_bond` |
| Sell bond | `withdrawal` into wallet from `cat_bond` |
| Bond coupon | `income` into wallet, category `cat_bond_coupon` |
| Buy forex | `investment` from wallet → `cat_forex` |
| Sell forex | `withdrawal` of cost basis into wallet from `cat_forex`, **plus** `income`/`cat_forex_profit` or `expense`/`cat_forex_loss` |

Those `cat_*` values are **`app_settings` keys, not category names**. The app never hardcodes a
category name — it looks the id up through the settings table (§8, `lib/settings.ts`). If a key
is unmapped the action **fails with a message** rather than inventing a category.

Each auto-booked row also gets a generated `description`. **These are English templates** —
they are what the user reads in History, so they matter:

| Event | `description` |
|---|---|
| Stock buy / sell | `Buy {TICKER} {n} lot` · `Sell {TICKER} {n} lot` |
| Stock realized P/L | `Profit {TICKER} {n} lot` · `Loss {TICKER} {n} lot` |
| Dividend | `Dividend {TICKER}` |
| Bond buy / sell / coupon | `Buy {NAME}` · `Sell {NAME}` · `Coupon {NAME}` |
| Forex buy / sell | `Buy {CUR} (forex)` · `Sell {CUR} (forex)` |
| Forex realized P/L | `Profit {CUR} (forex)` · `Loss {CUR} (forex)` |
| Installment payment | the installment item's own name |
| Loan collection | the person's name |

**Cost-basis method is average cost** for both stocks and forex. For stocks it's per-lot:
`avgPerLot = Σ buy_idr / Σ buy_lots`, `realizedCost = round(lots × avgPerLot)`,
`realizedPl = proceeds − realizedCost`. For forex it's a chronological walk (buys add units+cost,
sells remove cost proportionally to units sold).

Undoing any of these deletes the linked `txn_id` (and `pl_txn_id`) rows.

---

## 4. Database schema — `supabase/migrations/0001_init.sql`

Write this as **one idempotent file** that is safe to re-run forever (`create ... if not exists`,
`alter table ... add column if not exists`, `on conflict do nothing`). It must never touch user
data.

```sql
create type category_kind as enum ('income', 'expense', 'saving', 'investment');
create type txn_type as enum ('expense', 'income', 'saving', 'investment', 'transfer', 'withdrawal');
alter type txn_type add value if not exists 'withdrawal';

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
-- Weeks run Monday→Sunday.
alter table categories add column if not exists period text not null default 'monthly';
-- Marks an expense category as an installment category (one per paylater provider), so the
-- stats page can separate installment spend from normal spend.
alter table categories add column if not exists is_installment boolean not null default false;
-- Favorites float to their own tab in the Add sheet's category picker (§3.1b).
alter table categories add column if not exists is_favorite boolean not null default false;

-- Groups: user-named, mixed-kind collections of categories that drive the Add sheet (§3.1b).
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

-- Opening balances, all stored at the single month given by app_settings.opening_month.
create table if not exists wallet_balances (
  id bigint generated always as identity primary key,
  month date not null,
  wallet_id bigint not null references wallets(id) on delete cascade,
  balance bigint not null default 0,
  unique (month, wallet_id)
);

-- Per-month budget OVERRIDE.
create table if not exists budgets (
  id bigint generated always as identity primary key,
  category_id bigint not null references categories(id) on delete cascade,
  month date not null,
  amount bigint not null default 0,
  unique (category_id, month)
);

-- Recurring budget RULE, versioned by effective_from.
create table if not exists recurring_budgets (
  id bigint generated always as identity primary key,
  category_id bigint not null references categories(id) on delete cascade,
  amount bigint not null default 0,
  effective_from date not null,
  unique (category_id, effective_from)
);

-- Key/value app settings. The ONLY place category/wallet choices for automated transactions
-- live, plus `opening_month`. Nothing in the app hardcodes a category name.
create table if not exists app_settings (key text primary key, value text);

-- opening_month: the single month `wallet_balances` stores starting balances at.
-- Adopt an existing database's month if one is already in use; otherwise leave it for the app
-- to set on first save. Never overwrite an existing value.
insert into app_settings (key, value)
select 'opening_month', to_char(min(month), 'YYYY-MM-DD') from wallet_balances
having min(month) is not null
on conflict (key) do nothing;

-- Installment purchases spread over months.
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

-- Foreign-currency holdings. `units` is the CURRENT balance; NOT counted in IDR net worth.
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

-- Loans = money OTHER PEOPLE owe the user, collected monthly (receivables).
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

-- Stock trades. Quantity is in lots; 1 lot = 100 shares (IDX market convention).
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

-- Bonds: buy/sell move principal in/out of the "Bonds" bucket; coupons are income.
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
```

### 4.1 Materialized monthly deltas + trigger (performance-critical)

The Stats page must never sum the whole ledger. Maintain a tiny `(month, wallet)` delta table
with a trigger, then `balance at end of M = opening + Σ delta where month <= M`.

```sql
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

-- sgn = +1 to apply, -1 to reverse. Mirrors the balance rule EXACTLY.
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

-- Rebuild from scratch at the end of the migration (idempotent).
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
```

Because the trigger reverses OLD and applies NEW on UPDATE, editing a transaction's date, wallet,
type, or amount keeps balances correct automatically — including moving it across months.

### 4.2 Seed — `supabase/seed.sql`

Separate, idempotent, **fresh databases only** — never run against a populated one. This is the
one file allowed to contain category names, because it is proposing starting data, not resolving
anything at runtime. All names English:

- Wallets: `Cash`, `Bank`, `E-Wallet`, `Broker`
- Income: `Salary`, `Freelance`, `Loan Repayment`, `Trading Profit`, `Dividend`, `Bond Coupon`, `Forex Profit`
- Expense: `Food`, `Entertainment`, `Other`, `Realized Loss`, `Forex Loss`
- Saving: `Emergency Fund`
- Investment: `Stock`, `Bonds`, `Forex`
- Installment providers `Credit Card`, `Paylater`, `Store Credit`, each with a matching
  `is_installment` expense category of the same name, linked 1:1.

Because nothing is auto-created at runtime any more, **the seed must also write the
`app_settings` mappings** — otherwise a fresh install starts fully unmapped and every automated
feature refuses until the user visits Settings. Resolve by name here, once, at seed time:

```sql
insert into app_settings (key, value)
select v.key, c.id::text
from (values
  ('cat_loan','income','Loan Repayment'),        ('cat_stock','investment','Stock'),
  ('cat_stock_profit','income','Trading Profit'), ('cat_stock_loss','expense','Realized Loss'),
  ('cat_stock_dividend','income','Dividend'),     ('cat_bond','investment','Bonds'),
  ('cat_bond_coupon','income','Bond Coupon'),     ('cat_forex','investment','Forex'),
  ('cat_forex_profit','income','Forex Profit'),   ('cat_forex_loss','expense','Forex Loss')
) as v(key, kind, name)
join categories c on c.kind = v.kind::category_kind and c.name = v.name
on conflict (key) do nothing;   -- never clobber an existing mapping
```

`on conflict do nothing` matters: it makes the seed safe to re-run and, more importantly, means
it can never overwrite a mapping an adopted database already has.

### 4.3 Migration runner — `scripts/migrate.mjs`

Plain Node ESM, no framework. It must:
- Parse `.env.local` manually (simple `KEY=value` reader, strip quotes and `#` comments), falling
  back to `process.env.DATABASE_URL`.
- Split the SQL into statements **respecting `$$…$$` dollar-quoted function bodies** and skipping
  `--` line comments — a naive split on `;` corrupts the trigger functions.
- Run each statement individually (auto-commit, no wrapping transaction), and **skip errors
  matching `/already exists/i`** so re-runs are clean.
- Connect with `ssl: { rejectUnauthorized: false }`.
- Take file paths as argv, defaulting to the schema migration.
- Print `<file> — N statement(s) applied` then `✅ Done. Your data is untouched.`

---

## 5. Auth & route protection

`lib/auth.ts` (no `server-only` — the proxy imports it and must stay Edge-safe):

- `SESSION_COOKIE = "ft_session"`, max age 30 days.
- `getSecret()` reads `COOKIE_SECRET`, **throws** if missing or `< 16` chars.
- `createSessionToken()` — `jose` `SignJWT({ ok: true })`, HS256, issued-at + expiry.
- `verifySessionToken(token?)` — returns boolean, catches everything.
- `verifyPassword(input)` — compares against `APP_PASSWORD` **in constant time**: XOR the lengths,
  then XOR every byte up to `max(a.length, b.length)` using `a[i] ?? 0`; return `diff === 0`.
  Return `false` immediately if `APP_PASSWORD` is unset.
- `COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax", secure: NODE_ENV === "production", path: "/", maxAge }`.

`proxy.ts` at the project root (Next 16's middleware):

```ts
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (pathname === "/login") {
    if (authed) return NextResponse.redirect(new URL("/add", req.url));
    return NextResponse.next();
  }
  if (!authed) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|offline.html|robots.txt).*)"],
};
```

`lib/supabaseServer.ts`: `import "server-only"`, module-level cached client built from
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` with `auth: { persistSession: false, autoRefreshToken: false }`.
Throw a helpful error if either env var is missing. **This must never be imported by a client
component** — every `lib/*` module that touches it starts with `import "server-only"`.

There is **no Supabase RLS and no per-user auth** — the password gate is the entire security
boundary, and the service-role key never leaves the server.

---

## 6. Design system

Dark, "deep navy stats terminal" aesthetic. Mobile-only layout: everything is centered in a
`max-w-md` column. This is a **deliberate visual direction** — do not substitute a generic
Tailwind/shadcn look.

`app/globals.css` — Tailwind v4 CSS-first theme:

```css
@import "tailwindcss";

@theme {
  /* surfaces */
  --color-ink: #0b0e14;
  --color-ink-2: #11151d;
  --color-ink-3: #161c27;
  --color-line: #232c3a;
  /* text */
  --color-paper: #e6edf3;
  --color-paper-dim: #8a939e;
  --color-paper-faint: #586069;
  /* accents */
  --color-green: #3fb950;   --color-red: #f85149;    --color-amber: #e3b341;
  --color-blue: #58a6ff;    --color-purple: #a371f7; --color-teal: #39d3c6;
  /* semantic aliases used across the app */
  --color-gold: #3fb950;    /* primary action */
  --color-gold-soft: #56d364;
  --color-jade: #3fb950;    /* income   */
  --color-clay: #f85149;    /* expense  */
  --color-sky: #58a6ff;     /* saving   */
  --color-plum: #a371f7;    /* invest   */
  --color-sand: #e3b341;    /* transfer */

  --font-display: var(--font-jetbrains), ui-monospace, "SFMono-Regular", monospace;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
  --font-sans: var(--font-hanken), ui-sans-serif, system-ui, sans-serif;
}
```

Also define:

- `:root { color-scheme: dark }`; `html { height: 100% }`; `body { min-height: 100% }`.
  **Use `min-height`, not `height`, on body** — a fixed-height flex body caps its children and
  breaks sticky headers past one screen.
- `.bg-atmosphere` — `position: fixed; inset: 0; z-index: -2`, three layered
  `radial-gradient`s (green 7%, blue 5%, purple 4%) for a subtle glow.
- `.bg-grain` — `position: fixed; inset: 0; z-index: -1; opacity: .035`, an inline SVG
  `feTurbulence` fractal-noise data-URI at `170px` tile.
- `@layer components`: `.label` (font-display, 10px, uppercase, `tracking-[0.16em]`, paper-dim),
  `.card` (`rounded-xl border border-line/70 bg-ink-2`), `.field`
  (`w-full rounded-lg border border-line/80 bg-ink-3 px-4 py-3 text-paper focus:border-green/60`).
- `.hr-dash` — 1px dashed top border in a `color-mix`'d line color.
- `summary { list-style: none }` + hide `::-webkit-details-marker`; `details[open] > summary .chevron { transform: rotate(90deg) }`.
- Animations: `@keyframes reveal` (fade + 12px rise, `.55s cubic-bezier(.2,.7,.2,1)`), `.stagger > *`
  with `nth-child(1..10)` delays 0.03s→0.48s, `@keyframes pop` for toasts. Wrap all of it in
  `@media (prefers-reduced-motion: reduce) { animation: none }`.
- `.safe-top` / `.safe-bottom` → `env(safe-area-inset-*)`.
- Strip number-input spinners.
- **Privacy mode** (see §9.4): under `.amounts-hidden .privacy-scope .tabular-nums:not(input)`,
  set `color: transparent; position: relative` and overlay `::after { content: "••••"; position: absolute; inset: 0 }`
  right-aligned by default, with `.priv-left` / `.priv-center` modifiers. Because the real text
  stays in flow and only turns transparent, **containers never change size**. CSS-only so it
  applies before paint. The `:not(input)` is load-bearing: an `<input>` cannot render `::after`
  content, so masking one blanks the field entirely (invisible amount in the edit sheet) —
  form inputs are always exempt.

`app/layout.tsx` (root): load both Google fonts with `variable` + `display: "swap"`; set metadata
(title "Atlas", manifest, apple-web-app capable, icon set) and `viewport`
(`themeColor: "#0b0e14"`, `maximumScale: 1`, `userScalable: false`, `viewportFit: "cover"`).
Inject a tiny **blocking inline script** that reads `localStorage.ft_hide_amounts` and adds
`amounts-hidden` to `<html>` before paint (no flash). Render `.bg-atmosphere`, `.bg-grain`,
children, and `<RegisterSW />`.

---

## 7. Formatting helpers — `lib/format.ts`

Built on the `LOCALE` / `CURRENCY` constants from §0.1 — never hardcode a locale string at a
call site.

```ts
formatRupiah(n)       // "Rp 7,761,691" — Intl currency, narrowSymbol, 0 fraction digits
formatNumber(n)       // "7,761,691"    — Intl decimal, no symbol
formatRupiahShort(n)  // compact: "Rp 7.8M" | "Rp 950K" | "Rp 1M" | "Rp 1.2B"
monthName(m)          // 1..12 → "January".."December"
todayISO()            // local-time YYYY-MM-DD (offset-corrected, NOT toISOString on raw Date)
formatMonth(iso)      // "Mar 2026"
formatMonthShort(iso) // "Mar '26"
formatDateShort(iso)  // "5 Jun"
```

Use `currencyDisplay: "narrowSymbol"` so IDR renders as `Rp` rather than the verbose `IDR`. If a
runtime lacks narrow-symbol data for IDR, fall back to formatting the number plainly and
prefixing `"Rp "` yourself — never ship `"IDR 7,761,691"`.

Compact units are **`K` / `M` / `B`** (thousand / million / billion). Two details that matter:

- Thresholds sit at **999.5 × unit**, not 1000 × unit, so a value that rounds up (e.g. 999,900)
  carries into the next unit as `"1M"` instead of overflowing its own as `"1000K"`.
- One decimal, with a trailing `.0` dropped so 1,000,000 renders `"1M"` and not `"1.0M"`.

Month names come from a hardcoded English array, not `toLocaleDateString` — it keeps the output
stable regardless of server locale, and `monthName()` is called in tight render loops.

---

## 8. Library modules (`lib/`)

All start with `import "server-only"` **except** `format.ts`, `types.ts`, `txnForm.ts`, `auth.ts`.

### `lib/types.ts`
Shared TS types + constants (no server imports — client components use it):
`CategoryKind`, `TxnType`, `Wallet`, `Category`, `Transaction`, `WalletBalance`, `BudgetPeriod`,
`BUDGET_PERIODS`, `EffectiveBudget`, `PaylaterProvider`, `PaylaterItem`, `PaylaterPayment`,
`ForexAccount`, `ForexTransaction`, `Loan`, `LoanPayment`, plus:

```ts
export const TYPE_TO_CATEGORY_KIND: Record<TxnType, CategoryKind | null> = {
  expense: "expense", income: "income", saving: "saving", investment: "investment",
  transfer: null,
  withdrawal: null, // draws from saving OR investment — handled specially in the form
};
export const TXN_TYPES = [
  { value: "expense", label: "Expense" }, { value: "income", label: "Income" },
  { value: "saving", label: "Saving" },   { value: "investment", label: "Invest" },
  { value: "transfer", label: "Transfer" }, { value: "withdrawal", label: "Withdraw" },
];
```

### `lib/txnForm.ts`
`parseTransactionForm(formData) → { row?, error? }`. Pure, shared by Add and Edit. Validates:
amount > 0; date present; category required for expense/income/saving/investment/withdrawal
(with type-specific error copy: *"Choose where it's going."*, *"Choose which savings to withdraw from."*);
source wallet required for expense; dest wallet required for income & withdrawal; both wallets for
transfer **and they must differ**. Then **normalizes**: `category_id` null for transfer;
`source_wallet_id` null for income & withdrawal; `dest_wallet_id` only for transfer/income/withdrawal.

### `lib/data.ts`
Central read layer.
- `nextMonthKey` / `prevMonthKey` — pure `YYYY-MM-01` arithmetic.
- `getOpeningMonth()` — resolves the opening month, cached per request:
  1. `app_settings.opening_month` if set;
  2. else the earliest `month` present in `wallet_balances`;
  3. else the month **before** the earliest transaction (so opening balances precede all activity);
  4. else the current month.
  When it falls through to 2–4 it **persists the result** to `app_settings.opening_month`, so the
  value is decided exactly once and never drifts afterwards.
- `getOpeningBalances()` — reads `wallet_balances` at that month.
- `deriveWalletBalances(monthKey)` — opening + `Σ monthly_wallet_delta where month <= monthKey`.

> The opening month is both a **read and a write** key — `/balances` upserts at it. Resolve it in
> one helper and use that everywhere; two call sites disagreeing about which month is "opening"
> silently corrupts net worth.
- `getWallets(includeArchived)`, `getCategories(includeArchived)` (defaults `period`/`is_installment`
  so the app works pre-migration), `walletMap()`, `categoryMap()`.
- `getMonthTransactions`, `listTransactions(filter)` (default limit 200), `getTransaction(id)`.
- `getBudgetsForMonth(monthKey)` — implements §3.4 for budgets. Order recurring rules
  **ascending by effective_from** so the last write into the Map wins. Tolerate error code
  `42P01` (table not migrated).
- `getPaylaterItems / getPaylaterPayments / getPaylaterProviders / getLoans / getLoanPayments`.
- `getChartData()` — **one pass over the whole ledger** producing `months`, `flows`
  (income/expense/saving/investment per month), `dailyFlows` (per active day, for the 1-month
  view), `catTotals` (per month+category+kind), `catEntries` (per month+category+**normalized
  description**, with `count`/`total`/`max` so identical notes collapse and the payload stays
  small), and `networth` (opening baseline + cumulative monthly deltas). Transfers excluded.
  A `withdrawal` **nets against its bucket's kind** (`f[kind] -= amount`) rather than counting
  as its own flow.
- `getSavingsBuckets(asOf?)` — cumulative per-bucket `contributed`/`withdrawn`/`balance`. Uses
  **active categories only**, so an archived bucket (e.g. a legacy "Forex Yen") can't double-count
  against the Forex module.
- `getYearTransactions(year)`, `getDataYears()`.

> **Pagination is mandatory** on every full-ledger read: PostgREST caps responses at 1000 rows.
> Loop `for (let from = 0; ; from += 1000)` with `.order("id").range(from, from + 999)` and break
> when a batch is short. `deriveWalletBalances` is the exception — the delta table is tiny.

### `lib/settings.ts`

**This module is the single point where the app decides which category an automated transaction
uses. No category name may appear anywhere else in the codebase.** Not in an action, not in a
page, not in a migration. Everything resolves through `app_settings` by **id**.

```ts
export const CATEGORY_SETTINGS = [
  { key: "cat_loan",           label: "Loan collection",       kind: "income" },
  { key: "cat_stock",          label: "Stock holding",         kind: "investment" },
  { key: "cat_stock_profit",   label: "Stock realized profit", kind: "income" },
  { key: "cat_stock_loss",     label: "Stock realized loss",   kind: "expense" },
  { key: "cat_stock_dividend", label: "Stock dividend",        kind: "income" },
  { key: "cat_bond",           label: "Bond holding",          kind: "investment" },
  { key: "cat_bond_coupon",    label: "Bond coupon",           kind: "income" },
  { key: "cat_forex",          label: "Forex holding",         kind: "investment" },
  { key: "cat_forex_profit",   label: "Forex realized profit", kind: "income" },
  { key: "cat_forex_loss",     label: "Forex realized loss",   kind: "expense" },
]; // each also carries a `help` string shown on the Settings page

export const WALLET_SETTINGS = [
  { key: "wallet_stock", label: "Default stock wallet" },
  { key: "wallet_bond",  label: "Default bond wallet" },
];
```

Note what is **absent**: there is no `default` name and no `match` hint. Those were the
hardcoding. A key is either mapped to a real category id or it is unmapped — there is no third
state where the app guesses.

#### API

```ts
getSettings(): Promise<Record<string, string>>          // tolerate 42P01
getSetting(key): Promise<string | null>

// Read path — pure, no writes. Returns null when unmapped or when the mapped id is stale.
mappedCategoryId(settings, cats, key): number | null
mappedWalletId(settings, wallets, key): number | null

// Write path — used inside server actions. NEVER creates a category.
resolveCategoryId(key): Promise<number | null>

// Which required keys are still unmapped. Drives the setup banner.
missingSettings(): Promise<{ key: string; label: string; kind: string }[]>
```

`resolveCategoryId(key)` reads the mapped id and verifies the category still exists (a stale id
from a deleted category counts as unmapped). It returns `null` rather than inventing anything.

#### Unmapped is a real, handled state

Every caller must handle `null`. Two patterns, both required:

1. **Actions refuse and explain.** A stock sale with `cat_stock` unmapped returns
   `{ error: "No category is mapped for \"Stock holding\". Set it in More → Settings." }` and
   writes **nothing** — no partial ledger rows, no orphaned trade.
2. **Read paths degrade quietly.** `mappedCategoryId` returning `null` means the dashboard skips
   the loan auto-budget row and the cashflow page omits that line. No crash, no placeholder.

#### First-run setup, not silent creation

Because nothing is auto-created, a fresh install needs one setup pass. Provide it as a
**guided flow on `/more/settings`**, plus a dismissible banner on `/dashboard` whenever
`missingSettings()` is non-empty, linking to it.

The settings page offers an **"Auto-detect"** button. This is the *only* place name-matching is
allowed, it runs **interactively**, and it never writes without the user confirming the result:

```ts
// lib/settings.ts — used ONLY by the interactive Auto-detect button.
// Ordered candidates; first case-insensitive exact match on a category of the right kind wins.
export const DETECT_HINTS: Record<string, string[]> = {
  cat_loan:           ["Loan Repayment", "Loan Collection", "Hutang"],
  cat_stock:          ["Stock", "Stocks", "Saham"],
  cat_stock_profit:   ["Trading Profit", "Trading", "Realized Gain"],
  cat_stock_loss:     ["Realized Loss", "Cut Loss", "Trading Loss"],
  cat_stock_dividend: ["Dividend", "Dividends", "Dividen"],
  cat_bond:           ["Bonds", "Bond", "Obligasi"],
  cat_bond_coupon:    ["Bond Coupon", "Coupon", "Kupon"],
  cat_forex:          ["Forex", "FX", "Foreign Currency"],
  cat_forex_profit:   ["Forex Profit", "FX Profit"],
  cat_forex_loss:     ["Forex Loss", "FX Loss"],
};
```

Auto-detect fills the `<select>`s in the form; the user reviews and presses Save. Anything it
could not match stays blank for manual choice. Including legacy Indonesian names here is
deliberate — it is what lets an existing database adopt the new build without duplicates
(see §18) — and it costs nothing, because these strings are never consulted at runtime.

`saveSettings` currently filters out empty values, which makes a mapping impossible to *clear*.
Fix that: write every submitted key, deleting the row when the value is blank.

### `lib/stocks.ts`
`StockTrade`, `StockTarget`, `StockTargetMonth`, `MonthStockTarget`, `StockDividend`,
`StockHolding`, `StockPortfolio` types + queries. Key pieces:
- `getStockTargetsForMonth(monthKey)` — §3.4 resolution, returns `source: "month" | "base"` and
  `hasBase` so the UI can offer "revert to base".
- `getLiveStockPrice(ticker)` — Yahoo Finance
  `https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}{EXCHANGE_SUFFIX}?interval=1d&range=1d`,
  a `Mozilla/5.0` UA, `next: { revalidate: 600 }`. Read
  `chart.result[0].meta.regularMarketPrice`. **Return `null` on any failure** — never throw.
  `EXCHANGE_SUFFIX` is an exported constant defaulting to `".JK"` (Jakarta / IDX, which is what
  an IDR portfolio implies); expose it as a constant rather than inlining it so another market
  is a one-line change.
- `getStockPortfolio(asOf?, livePrices = true)` — aggregate buys/sells per ticker,
  `lots = buyLots − sellLots`, keep only `lots > 0`, `avgPerLot = buyIdr / buyLots`,
  `avgPerShare = avgPerLot / 100`, `value = lots × 100 × price`. Fetch prices in parallel.
  `livePrices=false` for past-year snapshots. Report `missing` tickers separately and exclude them
  from `pricedValue`/`pricedCost` so P/L is never computed against a partial set.

### `lib/bonds.ts`
`getBondTrades()` (coerce `units` to Number — numeric comes back as string) and
`getBondPortfolio(asOf?)` → per-bond `units = buyU − sellU`, `invested = Σbuy − Σsell`,
`coupons = Σcoupon`, plus totals.

### `lib/forex.ts`
- `FALLBACK_RATE = { JPY: 110 }`.
- `getForexAccounts` / `getForexTransactions` / `getForexTxnByTxnId(txnId)` (lets the history
  editor detect a forex row).
- `forexAvgCost(txns)` — **pure**, takes only `direction|idr|units|occurred_on`. Sort chronologically;
  buys add units + cost; sells remove cost proportionally (`cost -= cost * sold/units`). Returns
  `cost / units`, or 0 with no history.
- `forexUnitsAt(monthKey)` — current balance minus every move **after** that month.
- `getForexRate(currency)` — `https://open.er-api.com/v6/latest/{CUR}` → `rates.IDR`,
  `next: { revalidate: 3600 }`, falling back to `FALLBACK_RATE`. Reference only.

### `lib/snapshot.ts`
`gatherSnapshot(year)` → one `Snapshot` object with that year's flows, year-start and year-end
net worth, all transactions, and holdings **as of year-end** (`cutoff = ${year}-12-31`,
`endMonth = ${year}-12-01`). Skip live stock prices unless it's the current year.
`trackedTotal = netWorth + savingsTotal + forexTotal + loansOutstanding − paylaterRemaining`.

---

## 9. Shared components (`components/`)

### 9.1 `TxnFields.tsx` (client) — the heart of data entry
Controlled fields shared by Add and Edit; **all values submitted through hidden inputs**, so the
parent only needs `<form action={…}>`.

- Horizontal scrolling **type pill row** — each type gets its own accent background when active
  (`expense`→clay, `income`→jade, `saving`/`withdrawal`→sky, `investment`→plum, `transfer`→sand).
  Switching type clears the category.
- **Hero amount card**: `Rp` prefix + a borderless centered numeric input. It formats with
  thousand separators live (`e.target.value.replace(/\D/g, "")` into state, `formatNumber()` out),
  and **scales its own font size down** as the number grows (42→36→30→25→21px by character count)
  inside a **fixed-height slot**, so the card never resizes.
- **Category chips** — filtered by `TYPE_TO_CATEGORY_KIND[type]`; for `withdrawal`, show
  saving **and** investment categories. Section label changes: "Category" / "Goes to" / "Take from".
- **Wallet chips** — label changes: "Paid from" (expense) / "Received in" (income, withdrawal) /
  "From wallet". Transfers render two separate From/To chip groups.
- Description input (labeled "Note" for saving/investment/withdrawal) and a native date input.
- `persist` prop (Add only): on mount, reset the date to today and restore
  `{ type, sourceWalletId, destWalletId }` from `localStorage.ft_last`; write it back on change.
  Never persist amount/description/category.

### 9.2 `BottomNav.tsx` (client)
Sticky bottom nav, `bg-ink/85 backdrop-blur-xl`, five slots:
Home (`/dashboard`) · History · **Add** · Budget (`/more/budgets`) · More.
"Add" is a **raised 64px green circle** pulled up `-mt-7` with `ring-4 ring-ink` and a green glow
shadow. Active tabs get a green pill background + green label. Inline SVG icons.

### 9.3 `MonthSwitcher.tsx` / `DaySwitcher.tsx` (client)
- `MonthSwitcher` — ‹ Month / Year › ; pushes `?m=YYYY-MM-01` (merging extra `params`) inside a
  `useTransition`, dimming to 50% while pending.
- `DaySwitcher` — big arrows step the **month** (jumping to day 1); a smaller row below steps
  ±1 day and shows `"Mon, 5"` with an invisible full-size `<input type="date">` overlaid for
  tap-to-pick. **All day math in UTC** (`Date.UTC`) so it never drifts across timezones.

### 9.4 `PrivacyToggle.tsx` (client)
Eye / eye-off button that toggles `amounts-hidden` on `<html>` and persists to
`localStorage.ft_hide_amounts`. Pairs with the CSS in §6 and the no-flash script in the root
layout. Any page that should be maskable wraps its content in `.privacy-scope`, and each masked
number carries `tabular-nums` plus optionally `priv-left` / `priv-center`.

### 9.5 Others
- `MoneyInput.tsx` — a named input that formats thousands as you type. Server actions strip
  separators with a shared `digits()` helper.
- `SubmitButton.tsx` — uses `useFormStatus()` to auto-disable + dim while its form action is in
  flight; `label` prop sets both `aria-label` and `title` for icon-only buttons.
- `RefreshOnFocus.tsx` — `router.refresh()` on mount and on `focus` / `visibilitychange`.
- `SortableList.tsx` — pointer-based drag reorder that calls a server action with the new id order.
- `icons.tsx` — shared stroke-`currentColor` SVGs: Pencil, Trash, Check, Chart, ChevronUp/Down,
  Grip, Eye, EyeOff.
- `RegisterSW.tsx` — registers `/sw.js`.

---

## 10. Routes — build every one of these

```
app/
  layout.tsx              root: fonts, metadata, viewport, atmosphere, no-flash privacy script
  page.tsx                redirect → /add
  global-error.tsx        root error boundary
  globals.css
  login/page.tsx          client, useActionState
  login/actions.ts        "use server" — verify password, set cookie, redirect /add
  snapshot/route.ts       GET ?year= → .xlsx download (runtime "nodejs")
  (app)/
    layout.tsx            max-w-md column, sticky header, BottomNav
    loading.tsx  error.tsx
    add/                  page.tsx · AddForm.tsx · actions.ts
    dashboard/            page.tsx · StatsTabs · InstallmentsTab · SavingInvestmentTab · SpendBreakdown
    history/              page.tsx · HistoryClient.tsx · actions.ts · [id]/{page,EditForm,ForexEditForm}
    charts/               page.tsx · ChartsClient.tsx
    savings/page.tsx
    balances/             page.tsx · BalancesForm.tsx · actions.ts
    stocks/               page.tsx · StockTradeForm · StockDividendForm · actions.ts
    stocks/targets/       page.tsx · StockTargetRow.tsx
    bonds/                page.tsx · BondTradeForm.tsx · actions.ts
    backup/page.tsx
    more/                 page.tsx · ManageRow.tsx · actions.ts   ← the big action hub (~940 lines)
    more/budgets/         page.tsx · BudgetRow.tsx
    more/cashflow/page.tsx
    more/categories/      page.tsx · CategoryList · CategoryPeriodSelect · CategoryInstallmentToggle
    more/wallets/page.tsx
    more/providers/       page.tsx · ProviderList.tsx
    more/paylater/        page.tsx · PaylaterToggle · PaylaterEdit · PaylaterMonths · PaylaterPayGroup
    more/loans/           page.tsx · PaymentGrid.tsx
    more/forex/           page.tsx · ForexConvert · ForexAddCurrency
    more/settings/page.tsx
```

Every data page sets `export const dynamic = "force-dynamic"`.

### `(app)/layout.tsx`
`mx-auto max-w-md min-h-dvh flex flex-col`. Sticky header (`z-30`, `bg-ink`, `safe-top`) with the
app icon + lowercase "atlas" wordmark linking to `/dashboard`, and an "Account" pill linking to
`/more`. Then `<main class="flex-1 px-4 pb-4">` and `<BottomNav />`.

> **Do not put `backdrop-blur` on the sticky header.** A sticky element that also has a
> `backdrop-filter` silently stops sticking in Chromium. Use a solid `bg-ink`. (The bottom nav is
> not sticky-critical, so it may blur.)

### `/login`
Centered card: 80px icon, giant lowercase `atlas` wordmark, `label`-styled "Financial Tracker"
with `letterSpacing: .34em`, tagline, a single password field, and an "Unlock" button.
`useActionState` shows `state.error` ("Wrong password.") and a pending "Unlocking…" state.

### `/add`
Server page loads wallets + categories + `todayISO()`. `AddForm` (client) wraps `TxnFields` in a
`<form action={formAction}>` driven by `useActionState`. On success the action returns
`{ ok, nonce: Date.now(), savedLabel }`; the form **remounts `TxnFields` via an incrementing
`key`** to clear it, and shows a floating pill toast (`.pop` animation) for 1.6s.

### `/dashboard` — the Stats home (largest page)
Day-scoped via `?d=YYYY-MM-DD` (default today). The selected day's **month** drives every monthly
section. Loads ~15 sources in one `Promise.all`. Three tabs (`StatsTabs`, client, instant switch —
all three panels are server-rendered and passed as props):

**Overview tab**
1. **Net worth hero** — `Networth · end of day`, computed as start-of-month balances
   (`deriveWalletBalances(prevMonthKey)`) plus this month's moves up to and including the selected
   day. Shows the day's ▲/▼ delta, a 2-column per-wallet grid, and — if any forex holdings — a
   separate "Forex · in IDR" block (units as of that day, the day's unit change, live rate,
   explicitly labeled *separate* from net worth). Corner controls: `PrivacyToggle` + a Charts link.
   Empty state links to `/balances`.
2. **Spent this day** — a `<details>` whose summary is the day's total spend (plus income earned)
   and which expands into the day's expense list.
3. **Daily budgets · today** — for every category with `period === "daily"`, a clickable row with
   an SVG **progress ring** showing `%` used (green < 80, amber 80–100, red > 100), amount left or
   over, expanding into that day's matching transactions.
4. **Income & expense · {Month}** — three stat cards (Income / Expense / Net) for the whole month.
5. **Budget vs actual** — three cards (Expense limits, Income targets, Saving targets). Convert
   every cadence to a **monthly equivalent** (`daily × 30.4`, `weekly × 4.345`, `yearly ÷ 12`) so
   the panel reads consistently whichever day is selected. Each card shows counts
   (`N over / N near / N on track`, or `N of M met` for targets), a total bar, then rows sorted by
   `%`. Expense rows below 80% collapse behind "Show all (N on track)"; target kinds list all.
   Each row expands into its transactions. Installment categories are **excluded** (they're fixed
   and non-actionable — track them on the Installments tab). The loan-collection category gets an
   **`auto` badge** and its budget is the total expected to collect that month.
6. **Where it went · {Month}** — `SpendBreakdown` (client): an SVG **donut** of expenses by
   category (top 8 + "Other") over a legend. Tapping a slice or row isolates it — its slice stays
   lit, others dim to 20%, the donut center swaps to that category's name/amount/% and its
   transactions expand inline.

**Installments tab** — this month's active installments grouped by provider (provider `sort_order`;
no-provider items fall into a trailing "Other"), with per-group total / paid / owed.

**Saving & Investment tab** — monthly stock buy targets with per-ticker progress bars
(`bought / target lots`, `✓ met` badge, estimated `Rp/mo` using the target's speculative price or
the ticker's all-time average buy price), plus this month's net saving/investment contributions
(withdrawals subtract) as Saved/Invested totals and per-bucket bars.

### `/history`
Server page loads the month's transactions (limit 1000) + all categories/wallets (archived
included, so old rows still resolve names). `HistoryClient` does **all filtering client-side**:
- A precomputed `searchIndex` per transaction (note + category + wallets + amount, raw *and*
  formatted) so typing is a single substring check.
- Type filter, category filter (options = categories present this month, plus the active selection
  so a filter keeps working across months).
- Filters persist in `sessionStorage.ft_history_filters`. **Restore first, then start persisting** —
  guard writes behind a `hydrated` flag or StrictMode's double-invoked effects wipe the saved value.
- Per-type sign/color prefixes: expense `−` clay, income `+` jade, saving/investment `→`,
  withdrawal `←` sky, transfer neutral. Meta line differs per type
  (`transfer: "From → To"`, `withdrawal: "Bucket → Wallet"`, etc.).
- **Bulk select mode**: select many rows **of a single type**, then set source wallet / dest wallet
  / category / date in one `bulkUpdateTransactions` call. Only the fields meaningful for that type
  are offered.

`/history/[id]` — loads the transaction *and* checks `getForexTxnByTxnId`. If it's a forex-booked
row, render `ForexEditForm` (edit direction/currency/wallet/IDR/units/date — the action fully
reverts and re-books, since a sell's cost basis depends on the rest of the log); otherwise
`EditForm` (reuses `TxnFields`). Save/delete `redirect()` back to `/history?m=<that row's month>`
so you land where you were, not on the current month.

### `/charts`
Server loads `getChartData()` once. `ChartsClient` (client, hand-rolled SVG — **no chart library**):
- **Sticky range bar** pinned below the app header at
  `top: calc(env(safe-area-inset-top) + 3.25rem)` with a solid `bg-ink`. Presets `1M / 3M / 6M /
  12M / All` are the N months **ending at an anchor month** (a dropdown), plus a `Custom` from→to
  pair. `lo`/`hi` are normalized so From-after-To still works.
- **Net worth** area chart with the delta over the window (includes one leading point before the
  window so the area has a baseline).
- **Cash flow** multi-line chart with a tappable legend to isolate a series. In **1M mode it zooms
  to per-day points across the whole month**, zero-filled.
- **Category breakdown** for the chosen kind and scope, tappable to drill down.
- **Drilldown**: a pie of that category's composition by description (top 7 + "Other"), total,
  avg/month over active months, entry count, biggest single transaction, and the most frequent
  entry (skipping blank notes).
- **Category-over-time**: pick any category with activity (grouped by kind) and trace it
  month-by-month, zero-filled, with total / average / peak month.

Palette: `#f85149 #e3b341 #58a6ff #a371f7 #3fb950 #db61a2 #f0883e #56d364 #79c0ff #d2a8ff`.

### `/savings`
Read-only. Hero "Set aside · all time" with Saved / Invested split, then a card per bucket:
balance, a bar relative to the largest bucket, and `in` / `out` totals. Copy must state the
balance is **held outside wallet net worth**.

### `/balances`
Edit the per-wallet **opening** balance, stored at `getOpeningMonth()` — resolve it, never assume
a literal. Shows each wallet's current derived balance alongside, and the resulting net worth.
Action upserts on `(month, wallet_id)` at that same resolved month.

### `/stocks`
Live portfolio hero (market value, ▲/▼ P/L + %, cost, lifetime realized P/L, and a warning listing
tickers with no live price). Trade form (buy/sell, ticker, lots, IDR, wallet, date). A link card to
`/stocks/targets` showing estimated monthly buying. **Expandable holding cards** per ticker:
lots, avg/share → live price, dividends received (+ % on cost), market value and P/L; expanded:
invested / cost basis now / dividends / proceeds / realized P/L, and a merged buy·sell·dividend
timeline (newest first). Then a dividends section (total received, per-ticker breakdown, log form,
deletable list) and a recent trades list (deletable).

`/stocks/targets` — month-scoped (`?m=`). Estimated monthly buying total, an add form (scope
`all`), and a row per ticker showing `bought / target lots`, price source
(`own` speculative / `live` / none), and per-row scope controls (`This month →` / `All months` /
`This month only`) plus "revert to base" when a month override exists.

### `/bonds`
Portfolio (principal held, coupons received) and a form for buy / sell / coupon. Coupons carry no
units. Deleting a trade removes its ledger row.

### `/more/forex`
One card per currency: balance in foreign units (labeled **"not in networth"**), Invested (average
cost basis) vs live Value, ▲/▼ gain/loss and %, live rate vs average rate, realized P/L booked to
date, and a direct "Set balance" correction form (no transaction booked). Below each card, a
convert form (buy/sell IDR ↔ currency from a wallet). An "add currency" modal takes an ISO code,
name, and an optional opening balance **with its IDR cost** (seeded as a wallet-less opening
`buy` so the holding starts with a cost basis). Finally a month-grouped history log.

### `/more` (index)
A settings list: Charts · Expected cashflow · Starting balances · Savings, then a collapsible
**Investment** group (Stocks · Bonds · Forex), then Budgets · My Installment · Loans · Wallets ·
Categories · Settings, then a Backup snapshot card and a Log out form.

### `/more/budgets`
Month-scoped, tabbed by kind (Expense / Income / Saving). Header card shows **Expected cashflow /mo**
= planned income − planned expense − planned saving (monthly-equivalent), with a red warning when
negative. Each row is a `BudgetRow` (client) with an amount input and a **scope picker**
(`This month →` / `This month only` / `All months`; yearly is a single whole-year limit) and an
inline **period select**. Auto categories (loan collection, every installment category) render as
read-only rows with an `auto` badge and their computed value. Explanatory footnotes are part of
the design — keep them.

### `/more/cashflow`
Forward-looking plan for a month: expected net hero, four flow totals (income in; expense, saving,
investment out), and a per-flow line breakdown. Sources: category budgets (monthly-equivalent),
expected loan collection, active installments (by provider category, plus an "Installments · no
provider" line), and stock buy targets priced by their speculative price or a held ticker's live
price. Warn when targets are unpriced and therefore uncounted.

### `/more/categories`, `/more/wallets`, `/more/providers`
Add form + list with rename / archive-toggle / reorder. Categories are grouped by kind, support
**drag reorder** (`SortableList` → `reorderCategories`), a **period select**, an
**installment toggle**, and **hard delete only when already archived** (FK design makes it safe:
transactions go uncategorized, budgets cascade, paylater unlinks). Wallets reorder with up/down
buttons that renumber `sort_order` 0..n so ordering is always gap-free.

### `/more/paylater` ("My Installment")
Month-scoped. Summary (count due, owed, already paid). Add form (item, monthly Rp, first/last
month, provider, note). Active items **grouped by provider** with a per-group "Pay all" that books
one expense per unpaid item in one go. Each item card shows `monthsLeft / totalMonths`, a
per-month paid/unpaid chip strip, a pay toggle (choose wallet + date, or "already paid elsewhere"
to skip the transaction), inline edit, and delete.

Sort order for active items: **(1) single-month items first**, then (2) most months still owed,
then (3) shorter total schedule — so a 6-month/1-left ranks above a 12-month/1-left.

### `/more/loans`
Money **other people owe you**. Tabs Unfinished / Finished / All. Add form (person, via/lender,
monthly Rp, note, start month, # months → lays out the schedule, capped at 60). Each loan card
shows outstanding, % collected, a progress bar, and a `PaymentGrid` of scheduled months where you
can collect (wallet + date + **partial amount**), un-collect, and schedule/unschedule months in an
edit mode. A loan is *finished* only when every scheduled month is **fully** collected.

### `/more/settings`
Two sections of `<select>`s — automated transaction categories (from `CATEGORY_SETTINGS`, each
filtered to its declared `kind`) and default wallets — upserted into `app_settings`.

Every `<select>` includes a blank `— not set —` option, and **blank must be saveable** so a
mapping can be cleared. Unmapped rows are visually flagged (amber left border + "Not set" chip)
so the page doubles as the setup checklist.

An **Auto-detect** button runs `DETECT_HINTS` (§8) against the existing categories and fills the
form **without saving** — the user reviews and presses Save. It reports what it matched and what
it could not, e.g. *"Matched 8 of 10. Stock realized profit and Bond coupon need a manual pick."*

This page is the app's only setup surface, so it must be reachable from the dashboard banner
described in §8, not just buried under More.

### `/backup` + `/snapshot`
`/backup` lists years with data (always including the current year) linking to
`/snapshot?year=YYYY`. The route handler builds a **multi-sheet `.xlsx`** with `exceljs`:
`Summary` (year flows, year-end status, tracked net total), `Transactions`, `Wallets`, `Savings`,
`Stocks`, `Bonds`, `Forex`, `Loans`, `Paylater`. Bold header rows, `#,##0` number format on money
columns, bold TOTAL rows. Respond with the buffer,
`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
`Content-Disposition: attachment; filename="finance-snapshot-{year}.xlsx"`, `Cache-Control: no-store`.

---

## 11. Server actions — conventions

All mutations are Server Actions (`"use server"`). There are no API routes except `/snapshot`.

Shared helpers, duplicated per action file (they're 3 lines each, keep them local):

```ts
const digits  = (v) => parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
const optInt  = (v) => { const n = parseInt(String(v ?? ""), 10); return Number.isFinite(n) && n > 0 ? n : null; };
const units   = (v) => parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const monthDate = (v) => { const m = /^(\d{4}-\d{2})(?:-\d{2})?$/.exec(String(v ?? "").trim()); return m ? `${m[1]}-01` : null; };
```

Rules:
- **No action may contain a category name.** Call `resolveCategoryId("cat_stock")` and handle
  `null` by returning an error — never fall back to a literal, never create a category.
- **Check every required mapping before the first write.** These actions insert several rows
  (cost-basis withdrawal + P/L row + trade row); discovering an unmapped category halfway through
  leaves a half-booked trade. Resolve everything up front, bail if anything is `null`, then write.
- Every action ends with the `revalidatePath()` calls for **every** page its data feeds
  (e.g. a stock trade revalidates `/stocks`, `/dashboard`, `/savings`, `/history`).
- Actions used with `useActionState` return `{ ok?, error?, nonce?: Date.now(), savedLabel? }`;
  the `nonce` is what lets the client detect a repeat success and reset the form.
- Actions bound to a row use `action={fn.bind(null, id)}`.
- Un-doing an auto-booked action **deletes the linked `txn_id` / `pl_txn_id` rows** before
  deleting its own row.
- `payPaylaterMonths` (bulk) must **skip months already marked paid** so re-running never
  double-books.
- Provider ↔ category stay 1:1: `resolveProviderCategory()` reuses the linked category if it still
  exists, else finds/creates an expense category named after the provider (marking it
  `is_installment`) and links it back. Renaming a provider renames its category (best effort).

---

## 12. PWA

- `public/manifest.webmanifest` — name/short_name "Atlas", `start_url: "/add"`, `scope: "/"`,
  `display: "standalone"`, `orientation: "portrait"`, background & theme `#0b0e14`, icons
  192 / 512 / 512-maskable.
- `public/sw.js` — deliberately conservative, `const CACHE = "ft-v3"`:
  - `install` precaches `/offline.html`, `/icons/icon-192.png`, `/manifest.webmanifest`, then `skipWaiting()`.
  - `activate` deletes every cache except the current one, then `clients.claim()`.
  - `fetch`: ignore non-GET and cross-origin. `/_next/static` and `/icons` → **cache-first, but
    only ever store a response when `res.ok`** (a transient 404/500 must never poison the cache).
    Navigations → **network-first**, falling back to `/offline.html` only when `fetch` rejects
    (a 5xx passes through so the app's error boundary can offer a retry). Everything else:
    untouched, straight to the network.
  - Bump `CACHE` whenever the file changes.
- `public/offline.html` — a standalone styled offline shell matching the dark theme.
- `scripts/gen-icons.mjs` — generates the icon set from a source `public/brand-icon.png`.

---

## 13. Docker self-hosting

`Dockerfile` — multi-stage on `node:22-alpine`:
- `base` (+ `libc6-compat`) → `deps` (`npm ci`, cached on the lockfile) → `builder`
  (`DOCKER_BUILD=1`, `npm run build` → standalone).
- A separate **`tools`** stage containing only `node_modules`, `package.json`, `scripts/`, and
  `supabase/` — so `pg` and the SQL never enter the runtime image.
- `runner`: copy `public`, `.next/standalone`, `.next/static`; create a non-root `nextjs:nodejs`
  user; `PORT=3000`, `HOSTNAME=0.0.0.0`; `CMD ["node", "server.js"]`.

`docker-compose.yml` — an `app` service (env_file `.env.local`, healthcheck hitting `/login`) plus
`migrate` and `seed` one-offs behind `profiles: ["setup"]` targeting the `tools` stage.

Document in the README that **HTTPS is required** in production (the session cookie is `Secure`),
so a TLS reverse proxy must sit in front.

---

## 14. Non-obvious rules — violating these causes real bugs

1. **Never `backdrop-filter` on a sticky element.** It silently stops sticking in Chromium.
   This broke the app header on every page once already.
2. **`body { min-height: 100% }`, never `height`.** A fixed-height flex body caps its children and
   kills sticky positioning past one screen.
3. **Paginate every full-table read** — PostgREST caps at 1000 rows.
4. **Tolerate error code `42P01`** ("table does not exist") on newer tables so the app still boots
   against a partially migrated DB.
5. **Coerce Postgres `numeric` to `Number`** on read (forex/bond units) — the client returns strings.
6. **Resolve recurring rules by ordering `effective_from` ascending** so the last Map write wins.
7. **`todayISO()` must offset-correct** before `toISOString()`, or the date flips near midnight in
   non-UTC timezones. `DaySwitcher` does all arithmetic in `Date.UTC`.
8. **Restore-then-persist** for `sessionStorage`/`localStorage` state, gated on a `hydrated` flag —
   StrictMode's double-invoked effects will otherwise overwrite saved values with defaults.
9. **Privacy masking must not resize anything**: transparent real text + absolutely positioned
   `::after` dots. A fixed 4-dot run also hides the *length* of the amount.
10. **`getSavingsBuckets` uses active categories only**, so an archived legacy bucket can't
    double-count against a module that tracks the same money.
11. **Stock P/L excludes unpriced tickers** from both value and cost, so the percentage is never
    computed against a partial denominator.
12. **Editing a paylater item does not rewrite already-booked months** — paid months keep their
    original expense as historical record.
13. Delete of an archived category is safe **by FK design** — verify `archived` first, then let
    `on delete set null` / `cascade` do the rest.
14. **A category name in application code is a bug.** Names live in exactly two places: the seed
    (proposing starting data) and `DETECT_HINTS` (an interactive one-time matcher). Anywhere else
    — an action, a page, a migration — it will one day create a duplicate category against a
    database that named things differently, silently splitting history in two.
15. **The opening month is data, not a constant.** Hardcoding it means an adopted database either
    double-counts its starting balances or ignores them entirely.

---

## 15. Build order

1. Scaffold: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`,
   `.example.env`, `.dockerignore`.
2. `supabase/migrations/0001_init.sql`, `supabase/seed.sql`, `scripts/migrate.mjs`. Verify
   `npm run migrate` twice in a row is clean.
3. `lib/format.ts`, `lib/types.ts`, `lib/txnForm.ts` (pure, no deps).
4. `lib/auth.ts`, `lib/supabaseServer.ts`, `proxy.ts`, `/login`.
5. `app/globals.css`, `app/layout.tsx`, `(app)/layout.tsx`, `components/BottomNav.tsx`.
6. `lib/data.ts` → `/add` (with `TxnFields`) → `/history` → `/history/[id]`.
7. `/balances`, `/savings`, `lib/settings.ts`, `/more` index, `/more/wallets`, `/more/categories`.
8. Budgets: `recurring_budgets` resolution → `/more/budgets` → `/more/cashflow`.
9. `/dashboard` with all three tabs.
10. Paylater (providers → items → payments), Loans.
11. `lib/stocks.ts` → `/stocks` → `/stocks/targets`; `lib/bonds.ts` → `/bonds`;
    `lib/forex.ts` → `/more/forex`.
12. `lib/data.ts#getChartData` → `/charts`.
13. `lib/snapshot.ts` → `/snapshot` → `/backup`.
14. PWA (manifest, `sw.js`, `offline.html`, icons), then Dockerfile + compose, then README.

---

## 16. Acceptance checklist

- [ ] `npm run migrate` is idempotent — running it 3× leaves data untouched.
- [ ] Wrong password → error; correct password → `/add`; visiting `/login` while authed → `/add`;
      any protected route while anonymous → `/login`.
- [ ] All six transaction types save with correct wallet/category nulling, and appear in History.
- [ ] Editing a transaction's **date across a month boundary** keeps every wallet balance correct
      (the delta trigger reverses OLD and applies NEW).
- [ ] Deleting a transaction restores the previous net worth exactly.
- [ ] Set opening balances → dashboard net worth = opening + all subsequent moves.
- [ ] `saving` reduces net worth and increases the Savings bucket; `withdrawal` reverses both.
- [ ] A budget saved with scope `forward` applies to that month and every later month; a `month`
      override wins for exactly one month; `all` wipes both and applies everywhere.
- [ ] Daily/weekly/yearly budgets show correct monthly-equivalent totals on the dashboard.
- [ ] Paying an installment books an expense under the provider's category and marks the month;
      un-paying deletes exactly that expense.
- [ ] Collecting a loan (full and partial) books `Loan Repayment` income; un-collecting removes it.
- [ ] Buying a stock creates one `investment`; selling at a gain creates a `withdrawal` (cost basis)
      **plus** a `Trading Profit` income row; selling at a loss creates a `Realized Loss` expense
      row instead.
- [ ] Deleting a stock trade removes both linked ledger rows.
- [ ] Forex is visibly excluded from IDR net worth and shown on its own line.
- [ ] A forex sell books cost basis back plus a realized Forex Profit/Loss row; editing one via
      History fully reverts and re-books.
- [ ] Charts render with a single month of data, with 12+ months, and in 1M daily-zoom mode.
- [ ] `/snapshot?year=` downloads a 9-sheet workbook whose Summary totals reconcile with the app.
- [ ] Privacy toggle masks amounts with **zero layout shift** and no flash on reload.
- [ ] Installs as a PWA; the app shell loads offline; the sticky header sticks on a long page.
- [ ] `npm run build` succeeds with no TypeScript errors.
- [ ] No secret ever reaches the client bundle (no `NEXT_PUBLIC_*` exists at all).
- [ ] **Every user-visible string is English.** Grep the finished tree for the Appendix A terms
      and for `id-ID` — the only permitted hits are inside Appendix A itself and the `LOCALE`
      constant. Compact amounts read `K`/`M`/`B`, never `rb`/`jt`.
- [ ] **No hardcoded category names.** Grep `app/` and `lib/` for every seeded category name; the
      only hits allowed are `supabase/seed.sql` and `DETECT_HINTS`. Zero hits in any action, page,
      or migration.
- [ ] With `app_settings` emptied, every automated feature (stock trade, dividend, bond coupon,
      loan collection, forex convert) **fails with a readable message and writes nothing** — no
      partial ledger rows, no new categories. The dashboard shows the setup banner.
- [ ] Auto-detect against a database whose categories use different names maps them correctly and
      creates **no** new categories.
- [ ] The opening month is read from `app_settings`, never a literal; `/balances` writes to the
      same month `deriveWalletBalances` reads from.
- [ ] **Adoption test (§18):** run the migration against a *copy* of the existing production
      database, then confirm net worth matches the old instance exactly for both today and a
      month three months back, and that the duplicate-category query returns nothing.

---

## 17. Deliverables

Working code for every route above, plus a `README.md` covering: what it is, the feature list,
one-time Supabase setup, env vars, `npm run migrate` / `npm run seed` (and what each does and when
to run it), local dev, Vercel deploy, Docker self-hosting, the data model summary, and the project
layout tree.

Write real, complete implementations — no `TODO`s, no placeholder components, no mock data.

---

## 18. Adopting an existing database (plug-and-play)

A working instance of this app already exists with live data. The rebuild must be able to point
at that same Supabase project and keep working — **no export, no import, no data migration**.
This is a hard requirement, not a nice-to-have, and it is why §8 forbids hardcoded names.

### 18.1 What makes it safe

| Risk | Mitigation |
|---|---|
| Schema drift | The migration is `if not exists` throughout — running it on a populated DB adds only what's missing and alters no data. |
| Duplicate categories | Nothing is auto-created. Unmapped keys refuse loudly instead of inventing a category. |
| Existing names in another language | `DETECT_HINTS` includes legacy names, so Auto-detect maps `Hutang` → `cat_loan` and the user keeps their history intact. |
| Wrong opening month | `opening_month` is backfilled from `min(wallet_balances.month)`. |
| Stale balances | The migration truncates and rebuilds `monthly_wallet_delta` from the real transaction table at the end. |
| Seed clobbering live data | The seed is never run on an adopted DB; every statement in it is `on conflict do nothing` regardless. |

### 18.2 Procedure

```bash
cp .example.env .env.local     # point SUPABASE_* + DATABASE_URL at the EXISTING project
npm run migrate                # idempotent — adds missing tables/columns/trigger, rebuilds deltas
#  DO NOT run `npm run seed`   — it is for empty databases only
npm run dev
```

Then, once, in the app: **More → Settings → Auto-detect → review → Save**. Confirm the dashboard
banner disappears. That is the entire adoption process.

### 18.3 Verify before trusting it

Run these against the adopted database and compare with the old instance:

1. **Net worth matches**, to the rupiah, on the dashboard for today.
2. **A past month matches** — step back three months and compare net worth and per-wallet rows.
3. `select count(*) from monthly_wallet_delta` is non-zero, and
   `select sum(delta) from monthly_wallet_delta` plus opening balances equals current net worth.
4. **No duplicate categories**: `select kind, name, count(*) from categories group by 1,2 having count(*) > 1`
   returns nothing.
5. **Every mapping resolves**: each `cat_*` row in `app_settings` points at a category that
   exists and has the right `kind`.
6. **Exercise one auto-transaction of each family** (a stock buy, a bond coupon, a loan
   collection), confirm it books under the *existing* category, then delete it and confirm the
   ledger row disappears.

### 18.4 Optional one-time cleanups

Not part of the schema migration — offer them as a separate script the user may choose to run,
because they touch data:

- Archive an obsolete income category that a `withdrawal` transaction type replaced, so it stops
  appearing in pickers while history still resolves its name.
- Retire duplicate categories created by an older build: repoint
  `transactions.category_id` to the survivor, then delete the empty one.

---

## Appendix A — Bahasa Indonesia variant (opt-in only)

**Do not apply any of this unless the user explicitly asks for Bahasa Indonesia.** English is the
default and the appendix exists so the option is a lookup rather than a rewrite.

To switch: set `LOCALE = "id-ID"` in `lib/format.ts`, then substitute the terms below in
`supabase/seed.sql` (§4.2), the auto-transaction description templates (§3.5), and the UI copy.

`CATEGORY_SETTINGS` needs no change — it carries no names. `DETECT_HINTS` already lists the
Indonesian variants, so it works in both directions and should be left alone.

**Category names**

| English default | Bahasa Indonesia |
|---|---|
| Loan Repayment | Hutang |
| Trading Profit | Trading |
| Realized Loss | Cut Loss |
| Dividend | Dividen |
| Bond Coupon | Kupon |
| Forex Profit / Forex Loss | *unchanged* |
| Stock / Bonds / Forex (buckets) | *unchanged* |
| Emergency Fund | Dana Darurat |
| Salary / Freelance | Gaji / Freelance |
| Food / Entertainment / Other | Makan / Hiburan / Lainnya |

**Transaction descriptions**

| English default | Bahasa Indonesia |
|---|---|
| `Buy {TICKER} {n} lot` | `Beli {TICKER} {n} lot` |
| `Sell {TICKER} {n} lot` | `Jual {TICKER} {n} lot` |
| `Loss {TICKER} {n} lot` | `Cut loss {TICKER} {n} lot` |
| `Dividend {TICKER}` | `Dividen {TICKER}` |
| `Buy {NAME}` / `Sell {NAME}` (bonds) | `Beli {NAME}` / `Jual {NAME}` |
| `Coupon {NAME}` | `Kupon {NAME}` |
| `Profit …` | *unchanged* |

**UI labels**

| English default | Bahasa Indonesia |
|---|---|
| Withdraw | Ambil Tabungan |
| My Installment | Cicilan Paylater |
| Installment providers | Penyedia Cicilan |

**Number formatting** — with `LOCALE = "id-ID"`, `Intl` handles grouping automatically
(`Rp 7.761.691`, comma as the decimal separator). The compact suffixes are the one thing `Intl`
will not do for you: swap `K` → `rb` (*ribu*), `M` → `jt` (*juta*), `B` → `M` (*miliar*). Note
the collision — `M` means *million* in English and *miliar* (billion) in Indonesian — so the
suffix table must be swapped as a unit, never term by term.

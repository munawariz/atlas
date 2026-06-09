# Atlas

A fast, mobile-first **personal finance** PWA. Next.js 16 (App Router) + Supabase
(Postgres) + Tailwind v4, deployable on Vercel and installable to your home screen.
Single shared-password gate — your data, your instance.

All money is stored as **integer rupiah**. Self-hostable: clone, point it at your own
Supabase, and customize categories/wallets in-app.

## Features
- **Add** — one-tap entry for Expense / Income / Saving / Investment / Transfer /
  **Withdraw** (move money back from a saving/investment bucket), with category & wallet
  chips and remembered defaults.
- **Dashboard** — month income / expense / net, budget vs actual, spending by category,
  net worth + per-wallet balances, saved & invested, paylater due, loans to collect.
- **Charts** — net-worth trend, income vs expense, and category drilldown.
- **History** — filter by month/type; edit & delete any transaction.
- **Savings** — cumulative balance per saving/investment bucket.
- **Stocks** — per-ticker portfolio with live prices (Yahoo Finance), average cost, and
  realized P/L booked to your profit/loss categories.
- **Bonds** — buys/sells in units + coupon income.
- **Forex** — multi-currency holdings with live reference rates.
- **More** — budgets (recurring + per-month), categories, wallets, paylater, loans,
  **Settings** (map auto-transaction categories & default wallets), and a **Backup**
  page that downloads a year's full status as a multi-tab `.xlsx`.
- Installable PWA with an offline app shell.

## One-time setup

### 1. Create a Supabase project
At [supabase.com](https://supabase.com), create a project, then collect (Project
Settings):
- **API → Project URL** → `SUPABASE_URL`
- **API → service_role key** (secret) → `SUPABASE_SERVICE_ROLE_KEY`
- **Database → Connection string → URI** → `DATABASE_URL` (only used by the migrate/seed scripts)

### 2. Environment variables
```bash
cp .example.env .env.local
# generate a cookie secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSWORD` (your login
password), `COOKIE_SECRET` (the value above), and `DATABASE_URL`.

### 3. Create the schema + starter data
```bash
npm install
npm run migrate   # create all tables (idempotent — safe to re-run any time)
npm run seed      # add boilerplate wallets + categories (run ONCE, fresh DB only)
```
- `npm run migrate` applies `supabase/migrations/0001_init.sql` (schema only). It never
  touches your data — re-run it whenever you pull schema changes.
- `npm run seed` applies `supabase/seed.sql` — a small starter set of wallets/categories.
  The **Stock** & **Bonds** categories are required by the Stocks/Bonds modules; everything
  else is just an example you can rename, add to, or remove under **More → Categories /
  Wallets / Settings**. Skip this if you'd rather start empty.

> Both scripts just run the `.sql` files via Node (`scripts/migrate.mjs`, using
> `DATABASE_URL`). You can equally paste those two files into the Supabase SQL editor.

### 4. Run it
```bash
npm run dev      # http://localhost:3000 — log in with APP_PASSWORD
```

## Settings (auto-transaction mappings)
Some features create transactions automatically (paying an installment, collecting a
loan, buying/selling stocks & bonds, booking a coupon or realized P/L). **More →
Settings** lets you map each of these to your own categories and pick default wallets,
so nothing is hardcoded to specific category names. Unmapped ones fall back to sensible
defaults (created on first use).

## Deploy to Vercel
1. Push to GitHub.
2. Import at [vercel.com/new](https://vercel.com/new).
3. Add env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSWORD`,
   `COOKIE_SECRET` (`DATABASE_URL` is only needed locally for migrate/seed).
4. Deploy, open the URL on your phone, **Add to Home Screen**.

## Self-host with Docker
Run Atlas anywhere that has Docker — no Vercel needed. It still talks to a Supabase
project (hosted or your own self-hosted Supabase); only the app is containerized.

```bash
cp .example.env .env.local          # fill in SUPABASE_*, APP_PASSWORD, COOKIE_SECRET, DATABASE_URL

docker compose --profile setup run --rm migrate   # create the schema (idempotent, safe to re-run)
docker compose --profile setup run --rm seed       # optional starter data (fresh DB only)

docker compose up -d --build        # app on http://localhost:3000
```

- The image is a multi-stage build of Next.js's **standalone** output (`output: "standalone"`,
  enabled only inside the Docker build), so it's small and runs as a non-root user.
- `migrate` / `seed` run in a separate `tools` image (kept out of the runtime image) and
  read `DATABASE_URL` from `.env.local`.
- **Serve it over HTTPS.** Atlas sets a `Secure` session cookie in production, so put a
  reverse proxy with TLS in front (Caddy / nginx / Traefik). Over plain HTTP the login
  cookie won't be stored.

## Data model
A single type-discriminated `transactions` table, plus `wallets`, `categories`,
`budgets` / `recurring_budgets`, `wallet_balances` (opening balances → derived net
worth), `paylater_items` / `paylater_payments`, `loans` / `loan_payments`,
`forex_accounts` / `forex_transactions`, `stock_trades`, `bond_trades`,
`monthly_wallet_delta` (trigger-maintained snapshot for fast balances), and
`app_settings`. See `supabase/migrations/0001_init.sql`.

## Project layout
```
app/(app)/      add, dashboard, charts, history, savings, stocks, bonds, backup, more/*
app/login/      password gate
app/snapshot/   year-scoped .xlsx export (route handler)
lib/            auth, supabaseServer, data, stocks, bonds, forex, settings, snapshot, format, types
components/     TxnFields, BottomNav, MonthSwitcher, SubmitButton, icons, ...
proxy.ts        route protection (Next 16 "proxy" = middleware)
supabase/       schema migration + boilerplate seed
scripts/        migrate.mjs  (runs the .sql files via DATABASE_URL)
```

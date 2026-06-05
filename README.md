# Finance Tracker 2026

A mobile-first PWA for fast expense entry, built from `Financial Tracker 2026.xlsx`.
Next.js 16 + Supabase (Postgres) + Tailwind, deployed on Vercel. Protected by a
single shared password. The original spreadsheet lives in `source-data/` as a snapshot.

## Features
- **Add** — one-tap entry for Expense / Income / Saving / Investment / Transfer, with
  category & wallet chips and remembered defaults for rapid logging.
- **Dashboard** — month income/expense/net, budget vs actual, spending by category,
  networth + per-wallet balances, paylater due, loan outstanding.
- **History** — filter by month/type, edit & delete any transaction.
- **More** — wallet balances entry, budgets, categories, wallets, paylater & loans.
- Installable PWA with offline app shell.

## One-time setup

### 1. Create a Supabase project
At [supabase.com](https://supabase.com), create a project. Then collect (Project
Settings):
- **API → Project URL** → `SUPABASE_URL`
- **API → service_role key** (secret) → `SUPABASE_SERVICE_ROLE_KEY`
- **Database → Connection string → URI** → `DATABASE_URL` (used only by the importer)

### 2. Environment variables
```bash
cp .env.local.example .env.local
# generate a cookie secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSWORD` (your login
password), `COOKIE_SECRET` (the value above), and `DATABASE_URL`.

### 3. Create the schema + import your 2026 history
```bash
python -m pip install "psycopg[binary]" openpyxl
npm run import        # creates tables, seeds wallets/categories, loads the xlsx
```
The importer is idempotent — it ensures the schema/seed, then truncates and reloads
the historical tables. Use `npm run import:dry` to preview parsed counts first.

> Prefer doing schema by hand? Run `supabase/migrations/0001_init.sql` then
> `supabase/seed.sql` in the Supabase SQL editor; the importer will still load data.

### 4. Run it
```bash
npm run dev      # http://localhost:3000 — log in with APP_PASSWORD
```

## Deploy to Vercel
1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add env vars in Vercel → Settings → Environment Variables:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSWORD`, `COOKIE_SECRET`
   (`DATABASE_URL` is **not** needed in Vercel — only for the local importer).
4. Deploy, open the URL on your phone, and **Add to Home Screen** to install the app.

## Data model
Single `transactions` table (type-discriminated), plus `wallets`, `categories`,
`budgets`, `wallet_balances` (manual monthly snapshots → networth), `paylater_items`,
and `loans` / `loan_payments`. All money is stored as **integer rupiah**. See
`supabase/migrations/0001_init.sql`.

## Project layout
```
app/(app)/      add, dashboard, history, balances, more  (auth-gated screens)
app/login/      password gate
lib/            auth, supabaseServer, data access, formatting, types
components/      TxnFields, BottomNav, MonthSwitcher, RegisterSW
proxy.ts        route protection (Next 16 "proxy" = middleware)
supabase/       schema migration + seed
scripts/        import_xlsx.py  (one-time history importer)
source-data/    the original .xlsx snapshot
```

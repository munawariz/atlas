# Atlas

A mobile-first personal finance tracker, installable as a PWA. You log every movement of money
into one ledger; Atlas derives net worth, budgets, savings buckets, installment schedules, loans
receivable, and a stock / bond / forex portfolio from it.

Single-user, shared-password, self-hostable. You bring your own Supabase project, set a
password, and customise the categories and wallets in-app — nothing is hardcoded to one
person's setup.

Money is **Indonesian Rupiah**, stored as **integer rupiah** — never floats, never cents.

---

## Features

- **One ledger, six transaction types** — expense, income, saving, investment, transfer, and
  withdraw. Direction is implied by the type; every amount is non-negative.
- **Wallets vs buckets.** Wallets hold real cash and their sum is your net worth. Saving and
  investment categories are buckets: money moved into one *leaves* net worth.
- **Dashboard** — day-scoped net worth with per-wallet breakdown, daily budget rings, monthly
  income/expense, budget vs actual with monthly-equivalent cadences, and a tappable spend donut.
  Separate tabs for installments and for saving & investment.
- **Budgets** with a recurring rule plus per-month overrides, at daily / weekly / monthly /
  yearly cadence, and three save scopes (this month, this month onward, all months).
- **Expected cashflow** — a forward-looking plan for any month, drawn from budgets, loan
  schedules, active installments, and stock buy targets.
- **Installments** grouped by provider, with per-month paid tracking and a per-group "pay all".
- **Loans receivable** — money other people owe you, collected month by month, partials included.
- **Investments** — stocks (lots, average cost, live IDX prices, dividends, realized P/L),
  bonds (principal and coupons), and forex (tracked in its own currency, never counted in IDR
  net worth).
- **Charts** — net worth, multi-series cash flow with a daily zoom, category breakdown with
  drilldown, and category-over-time. Hand-rolled SVG, no chart library.
- **Excel backup** — any year as a nine-sheet `.xlsx` whose Summary reconciles with the app.
- **Privacy mode** — masks every amount with zero layout shift and no flash on reload.
- **PWA** — installs to the home screen, with an offline shell.

---

## One-time Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. From **Project Settings → API**, copy the project URL and the **service-role** key.
3. From **Project Settings → Database**, copy the connection string (for the migration script).

There is **no Supabase RLS and no per-user auth**. The password gate is the entire security
boundary, and the service-role key never leaves the server — there are no `NEXT_PUBLIC_*`
variables in this project at all.

---

## Environment variables

Copy the committed example and fill it in:

```bash
cp .example.env .env.local
```

| Variable | What it is |
|---|---|
| `SUPABASE_URL` | Your project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key. **Server-only.** |
| `APP_PASSWORD` | The shared password that unlocks the app. Make it long. |
| `COOKIE_SECRET` | 32+ random bytes of hex. Signs the session JWT; the app refuses to start below 16 characters. |
| `DATABASE_URL` | Postgres connection string. Used **only** by the migrate/seed scripts and the Docker `setup` profile. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database

```bash
npm run migrate   # create/alter tables, functions, trigger; rebuild the delta table
npm run seed      # starting categories, wallets and settings — EMPTY DATABASES ONLY
```

**`migrate` is idempotent.** Every statement is `create ... if not exists` /
`alter ... add column if not exists` / `on conflict do nothing`, and it never touches your data.
Run it as often as you like — including against a database that already has years of history.

**`seed` is for fresh installs.** It proposes starting data: four wallets, a set of English
categories, three installment providers, and the `app_settings` category mappings so a new
install works immediately rather than starting fully unmapped. Every statement is
`on conflict do nothing`, so it can never overwrite an existing mapping — but there is no
reason to run it against a populated database.

### Adopting an existing Atlas database

Point `SUPABASE_*` and `DATABASE_URL` at the existing project, then:

```bash
npm run migrate     # adds what is missing, rebuilds monthly_wallet_delta from the real ledger
#  DO NOT run npm run seed
npm run dev
```

Then once, in the app: **More → Settings → Auto-detect → review → Save**. Auto-detect matches
your existing category names (including legacy Indonesian ones like `Hutang` and `Cut Loss`)
and fills the form without saving — you confirm, then press Save. Nothing is ever created for
you, so there are no duplicate categories.

Confirm the dashboard setup banner disappears. That is the entire adoption process.

Before trusting it, check that net worth matches your old instance for today *and* for a month
three months back, and that this returns nothing:

```sql
select kind, name, count(*) from categories group by 1,2 having count(*) > 1;
```

---

## Local development

```bash
npm install
npm run migrate
npm run seed      # fresh databases only
npm run dev
```

Open <http://localhost:3000>. You will be redirected to `/login`.

```bash
npm run icons     # regenerate the PWA icon set from public/brand-icon.png
```

---

## Deploying to Vercel

1. Push the repo and import it.
2. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSWORD`, `COOKIE_SECRET` as
   environment variables. `DATABASE_URL` is not needed — run migrations from your machine.
3. Deploy. Standalone output is off outside Docker, so nothing needs changing.

---

## Self-hosting with Docker

```bash
cp .example.env .env.local           # fill in, including DATABASE_URL
docker compose --profile setup run --rm migrate
docker compose --profile setup run --rm seed    # fresh databases only
docker compose up -d
```

The `migrate` and `seed` services build the `tools` stage, which contains only
`node_modules`, `scripts/` and `supabase/` — `pg` and the SQL never enter the runtime image.

> **HTTPS is required in production.** The session cookie is `Secure` when `NODE_ENV=production`,
> so a browser will refuse to store it over plain HTTP and you will be bounced back to the login
> page forever. Put a TLS reverse proxy (Caddy, nginx, Traefik) in front.

---

## The data model, briefly

**One `transactions` table**, discriminated by `type`. `amount` is always ≥ 0.

| type | source_wallet | dest_wallet | category |
|---|---|---|---|
| `expense` | paid from | — | expense |
| `income` | — | received into | income |
| `saving` | funded from | — | saving bucket |
| `investment` | funded from | — | investment bucket |
| `transfer` | from | to | none |
| `withdrawal` | — | received into | the bucket it came out of |

A **withdrawal is the inverse of a saving or investment** — it is not income.

**The wallet balance rule**, which is implemented three times and must agree exactly (a Postgres
trigger maintaining `monthly_wallet_delta`, `deriveWalletBalances()` in `lib/data.ts`, and the
dashboard's per-day walk):

```
balance = opening_balance
        + Σ amount where type IN (income, withdrawal) AND dest_wallet   = wallet
        − Σ amount where type IN (expense, saving, investment) AND source_wallet = wallet
        − Σ amount where type = transfer AND source_wallet = wallet
        + Σ amount where type = transfer AND dest_wallet   = wallet
```

Opening balances live in `wallet_balances` at a single opening month, held in
`app_settings.opening_month` — it is **data, not a constant**, so a database that started at a
different point still reconciles.

**No category name appears in application code.** Automated transactions (stock trades,
dividends, bond coupons, loan collections, forex conversions) resolve their category through
`app_settings` by id, via `lib/settings.ts`. If a key is unmapped the action **refuses with a
readable message and writes nothing** — it never invents a category. Names live in exactly two
places: `supabase/seed.sql` (proposing starting data) and `DETECT_HINTS` (the interactive
one-time matcher).

---

## Project layout

```
app/
  layout.tsx              fonts, metadata, viewport, no-flash privacy script
  page.tsx                → /add
  login/                  password gate
  snapshot/route.ts       GET ?year= → .xlsx
  (app)/
    layout.tsx            max-w-md column, sticky header, BottomNav
    add/                  data entry
    dashboard/            the stats home — three tabs
    history/              month list, client-side filters, bulk edit, [id] editor
    charts/               hand-rolled SVG charts
    savings/              buckets, read-only
    balances/             opening balances
    stocks/  bonds/       portfolios and trade forms
    backup/               year list → snapshot download
    more/                 the hub: budgets, cashflow, categories, wallets,
                          providers, paylater, loans, forex, settings
components/               TxnFields, BottomNav, MonthSwitcher, DaySwitcher,
                          PrivacyToggle, MoneyInput, SubmitButton, icons
lib/
  data.ts                 central read layer + the balance rule
  settings.ts             the ONLY place a category is chosen for automation
  format.ts               LOCALE / CURRENCY and every formatter
  txnForm.ts              shared form validation and normalization
  stocks.ts  bonds.ts  forex.ts  snapshot.ts  autoBudget.ts
  auth.ts  supabaseServer.ts  types.ts
proxy.ts                  Next 16's middleware — route protection
supabase/
  migrations/0001_init.sql   idempotent schema
  seed.sql                   starting data, fresh databases only
scripts/
  migrate.mjs             plain Node SQL runner
  gen-icons.mjs           PWA icon set
```

---

## Notes on the design

Atlas uses the Atlas design system: forest `#003511` and lime `#d3fa53` on cream and white,
flat grounds, no gradients, no backdrop blur, one motion curve. The tokens live at the top of
`app/globals.css` and are copied verbatim from `atlas-design-system/project/tokens/`.

Two rules that are load-bearing rather than cosmetic:

- **Never put `backdrop-filter` on a sticky element** — it silently stops sticking in Chromium.
- **`body { min-height: 100% }`, never `height`** — a fixed-height flex body caps its children
  and kills sticky positioning past one screen.

---

## Language

Every user-visible string is English. `Rp` and `IDR` are a *currency*, not a language choice.
Everything localizable funnels through two constants:

```ts
// lib/format.ts
export const LOCALE = "en-US";
export const CURRENCY = "IDR";
```

A Bahasa Indonesia variant is a documented lookup rather than a rewrite — see Appendix A of
`ATLAS.md`.

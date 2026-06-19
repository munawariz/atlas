import "server-only";
import { supabaseServer } from "./supabaseServer";
import { todayISO } from "./format";
import type {
  BudgetPeriod,
  EffectiveBudget,
  Category,
  CategoryKind,
  Loan,
  LoanPayment,
  PaylaterItem,
  PaylaterPayment,
  Transaction,
  TxnType,
  Wallet,
  WalletBalance,
} from "./types";

/** First day of the month after the given YYYY-MM-01 key. */
export function nextMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

/** First day of the month before the given YYYY-MM-01 key. */
export function prevMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, "0")}-01`;
}

// Wallet starting balances are stored as the snapshot at this "opening" month.
export const OPENING_MONTH = "2025-12-01";

/** Per-wallet starting balance (the opening snapshot). */
export async function getOpeningBalances(): Promise<Map<number, number>> {
  const { data, error } = await supabaseServer()
    .from("wallet_balances")
    .select("wallet_id, balance")
    .eq("month", OPENING_MONTH);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [(r as WalletBalance).wallet_id, (r as WalletBalance).balance]));
}

/**
 * Derived per-wallet balance at the END of `monthKey`, replicating the spreadsheet's
 * Dashboard formula: opening balance, minus expenses, plus income, minus
 * savings/investments funded from the wallet, minus transfers out, plus transfers in.
 * (Saving/investment move cash OUT of the source wallet into a non-wallet bucket.)
 */
export async function deriveWalletBalances(monthKey: string): Promise<Map<number, number>> {
  const opening = await getOpeningBalances();
  const bal = new Map<number, number>(opening);

  // Read the precomputed monthly deltas (kept in sync by a DB trigger) instead of
  // summing the whole transaction history. This table is tiny (months × wallets),
  // so a single query is plenty — no pagination needed.
  const { data, error } = await supabaseServer()
    .from("monthly_wallet_delta")
    .select("wallet_id, delta")
    .lte("month", monthKey);
  if (error) throw error;
  for (const r of (data ?? []) as { wallet_id: number; delta: number }[]) {
    bal.set(r.wallet_id, (bal.get(r.wallet_id) ?? 0) + r.delta);
  }
  return bal;
}

export async function getWallets(includeArchived = false): Promise<Wallet[]> {
  let q = supabaseServer().from("wallets").select("*");
  if (!includeArchived) q = q.eq("archived", false);
  const { data, error } = await q.order("sort_order").order("id");
  if (error) throw error;
  return (data ?? []) as Wallet[];
}

export async function getCategories(includeArchived = false): Promise<Category[]> {
  let q = supabaseServer().from("categories").select("*");
  if (!includeArchived) q = q.eq("archived", false);
  const { data, error } = await q.order("kind").order("sort_order").order("id");
  if (error) throw error;
  // Default `period` so the app works before the column is migrated (everything monthly).
  return (data ?? []).map((c) => ({ ...c, period: (c as { period?: string }).period ?? "monthly" })) as Category[];
}

export async function getCategoriesByKind(kind: CategoryKind): Promise<Category[]> {
  const { data, error } = await supabaseServer()
    .from("categories")
    .select("*")
    .eq("kind", kind)
    .eq("archived", false)
    .order("sort_order")
    .order("id");
  if (error) throw error;
  return (data ?? []).map((c) => ({ ...c, period: (c as { period?: string }).period ?? "monthly" })) as Category[];
}

export async function walletMap(): Promise<Map<number, string>> {
  const ws = await getWallets(true);
  return new Map(ws.map((w) => [w.id, w.name]));
}

export async function categoryMap(): Promise<Map<number, Category>> {
  const cs = await getCategories(true);
  return new Map(cs.map((c) => [c.id, c]));
}

/** Distinct recent descriptions for a transaction type (for autocomplete chips). */
export async function recentDescriptions(type: TxnType, limit = 8): Promise<string[]> {
  const { data, error } = await supabaseServer()
    .from("transactions")
    .select("description")
    .eq("type", type)
    .not("description", "is", null)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of data ?? []) {
    const d = (r as { description: string | null }).description?.trim();
    if (d && !seen.has(d.toLowerCase())) {
      seen.add(d.toLowerCase());
      out.push(d);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export async function getMonthTransactions(monthKey: string): Promise<Transaction[]> {
  const { data, error } = await supabaseServer()
    .from("transactions")
    .select("*")
    .gte("occurred_on", monthKey)
    .lt("occurred_on", nextMonthKey(monthKey))
    .order("occurred_on", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export interface TxnFilter {
  monthKey?: string;
  type?: TxnType;
  categoryId?: number;
  limit?: number;
}

export async function listTransactions(filter: TxnFilter = {}): Promise<Transaction[]> {
  let q = supabaseServer().from("transactions").select("*");
  if (filter.monthKey) {
    q = q.gte("occurred_on", filter.monthKey).lt("occurred_on", nextMonthKey(filter.monthKey));
  }
  if (filter.type) q = q.eq("type", filter.type);
  if (filter.categoryId) q = q.eq("category_id", filter.categoryId);
  const { data, error } = await q
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 200);
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function getTransaction(id: number): Promise<Transaction | null> {
  const { data, error } = await supabaseServer().from("transactions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Transaction) ?? null;
}

// Resolve each category's budget amount for the month: a per-month override (in `budgets`)
// wins; otherwise the recurring rule with the greatest effective_from <= the month. The
// cadence is a property of the category (Category.period) — non-monthly categories never
// have per-month overrides (those are cleared when the period changes), so a single
// recurring rule resolves cleanly here. For the dashboard panel, pass the current month.
export async function getBudgetsForMonth(monthKey: string): Promise<EffectiveBudget[]> {
  const sb = supabaseServer();
  const [ov, rec] = await Promise.all([
    sb.from("budgets").select("category_id, amount").eq("month", monthKey),
    sb
      .from("recurring_budgets")
      .select("category_id, amount, effective_from")
      .lte("effective_from", monthKey)
      .order("effective_from", { ascending: true }),
  ]);
  if (ov.error) throw ov.error;
  if (rec.error && rec.error.code !== "42P01") throw rec.error; // tolerate table not migrated yet

  const recByCat = new Map<number, number>();
  for (const r of rec.data ?? []) recByCat.set(r.category_id, r.amount); // ascending => greatest effective_from wins
  const ovByCat = new Map<number, number>();
  for (const o of ov.data ?? []) ovByCat.set(o.category_id, o.amount);

  const ids = new Set<number>([...recByCat.keys(), ...ovByCat.keys()]);
  return [...ids].map((category_id) => ({
    category_id,
    amount: ovByCat.has(category_id) ? ovByCat.get(category_id)! : recByCat.get(category_id)!,
    recurring: !ovByCat.has(category_id),
  }));
}

// One transaction backing a budget's actual, for the expandable detail on the dashboard.
export interface BudgetActualItem {
  desc: string;
  amt: number;
  walletId: number | null;
  date: string; // YYYY-MM-DD
}

export interface PeriodActuals {
  daily: Map<number, number>;
  weekly: Map<number, number>;
  monthly: Map<number, number>;
  yearly: Map<number, number>;
  // The individual transactions behind each (period, category) total, so a budget row can
  // expand into its entries. Same windows as the totals above; a single txn can appear in
  // several periods (e.g. today is in daily/weekly/monthly/yearly).
  items: Record<BudgetPeriod, Map<number, BudgetActualItem[]>>;
}

// Boundaries of the period windows that contain `todayIso`. Week runs Monday→Sunday.
function periodBounds(todayIso: string) {
  const [y, m, d] = todayIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const mondayOffset = (dt.getUTCDay() + 6) % 7; // 0 = Monday
  const ws = new Date(dt);
  ws.setUTCDate(dt.getUTCDate() - mondayOffset);
  const we = new Date(ws);
  we.setUTCDate(ws.getUTCDate() + 6);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return {
    today: todayIso,
    weekStart: iso(ws),
    weekEnd: iso(we),
    monthStart: `${todayIso.slice(0, 7)}-01`,
    yearStart: `${todayIso.slice(0, 4)}-01-01`,
  };
}

// Per-category actual in each current period window (anchored to today), plus the
// individual transactions behind each total. Transfers and withdrawals are excluded so
// each sum matches the budgeted category's own kind.
export async function getPeriodActuals(todayIso: string): Promise<PeriodActuals> {
  const b = periodBounds(todayIso);
  const windowStart = b.weekStart < b.yearStart ? b.weekStart : b.yearStart;
  const sb = supabaseServer();
  type Row = {
    occurred_on: string;
    type: TxnType;
    amount: number;
    category_id: number | null;
    description: string | null;
    source_wallet_id: number | null;
    dest_wallet_id: number | null;
  };
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("transactions")
      .select("occurred_on, type, amount, category_id, description, source_wallet_id, dest_wallet_id")
      .gte("occurred_on", windowStart)
      .lte("occurred_on", b.today)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  const daily = new Map<number, number>();
  const weekly = new Map<number, number>();
  const monthly = new Map<number, number>();
  const yearly = new Map<number, number>();
  const items: Record<BudgetPeriod, Map<number, BudgetActualItem[]>> = {
    daily: new Map(),
    weekly: new Map(),
    monthly: new Map(),
    yearly: new Map(),
  };
  const add = (mp: Map<number, number>, id: number, amt: number) => mp.set(id, (mp.get(id) ?? 0) + amt);
  const addItem = (period: BudgetPeriod, id: number, it: BudgetActualItem) => {
    const arr = items[period].get(id) ?? [];
    arr.push(it);
    items[period].set(id, arr);
  };
  for (const r of rows) {
    if (!r.category_id || r.type === "transfer" || r.type === "withdrawal") continue;
    const d = r.occurred_on.slice(0, 10);
    const it: BudgetActualItem = {
      desc: r.description?.trim() || "—",
      amt: r.amount,
      walletId: r.source_wallet_id ?? r.dest_wallet_id ?? null,
      date: d,
    };
    if (d >= b.yearStart) { add(yearly, r.category_id, r.amount); addItem("yearly", r.category_id, it); }
    if (d >= b.monthStart) { add(monthly, r.category_id, r.amount); addItem("monthly", r.category_id, it); }
    if (d >= b.weekStart && d <= b.weekEnd) { add(weekly, r.category_id, r.amount); addItem("weekly", r.category_id, it); }
    if (d === b.today) { add(daily, r.category_id, r.amount); addItem("daily", r.category_id, it); }
  }
  // Biggest entries first within each list (matches the rest of the dashboard).
  for (const period of ["daily", "weekly", "monthly", "yearly"] as BudgetPeriod[]) {
    for (const arr of items[period].values()) arr.sort((x, y) => y.amt - x.amt);
  }
  return { daily, weekly, monthly, yearly, items };
}

export async function getWalletBalances(monthKey: string): Promise<WalletBalance[]> {
  const { data, error } = await supabaseServer().from("wallet_balances").select("*").eq("month", monthKey);
  if (error) throw error;
  return (data ?? []) as WalletBalance[];
}

/** All monthly networth points: month -> total balance, ascending by month. */
export async function getNetworthSeries(): Promise<{ month: string; total: number }[]> {
  const { data, error } = await supabaseServer()
    .from("wallet_balances")
    .select("month, balance")
    .order("month", { ascending: true });
  if (error) throw error;
  const totals = new Map<string, number>();
  for (const r of (data ?? []) as { month: string; balance: number }[]) {
    totals.set(r.month, (totals.get(r.month) ?? 0) + r.balance);
  }
  return [...totals.entries()].map(([month, total]) => ({ month, total }));
}

export async function getPaylaterItems(): Promise<PaylaterItem[]> {
  const { data, error } = await supabaseServer().from("paylater_items").select("*").order("item");
  if (error) throw error;
  return (data ?? []) as PaylaterItem[];
}

export async function getPaylaterPayments(): Promise<PaylaterPayment[]> {
  const { data, error } = await supabaseServer().from("paylater_payments").select("*");
  if (error) throw error;
  return (data ?? []) as PaylaterPayment[];
}

export async function getLoans(): Promise<Loan[]> {
  const { data, error } = await supabaseServer().from("loans").select("*").order("person");
  if (error) throw error;
  return (data ?? []) as Loan[];
}

export async function getLoanPayments(): Promise<LoanPayment[]> {
  const { data, error } = await supabaseServer().from("loan_payments").select("*");
  if (error) throw error;
  return (data ?? []) as LoanPayment[];
}

// ---- Charts ----
export interface ChartData {
  months: string[]; // months with flows, ascending "YYYY-MM-01"
  flows: { month: string; income: number; expense: number; saving: number; investment: number }[];
  catTotals: { month: string; categoryId: number; kind: TxnType; total: number }[]; // categoryId 0 = uncategorized
  // Per-(month, category, description) rollup for drilldown insights — identical
  // descriptions collapse to one row so the payload stays small. max = biggest single txn.
  catEntries: { month: string; categoryId: number; kind: TxnType; description: string; count: number; total: number; max: number }[];
  networth: { month: string; total: number }[]; // opening baseline + each subsequent month-end
}

/**
 * One pass over the whole ledger for the Charts page: per-month income/expense/
 * saving/investment, per-(month, category) totals for drilldown, and the month-end
 * net-worth series (opening balance + cumulative monthly deltas). Transfers are excluded.
 */
export async function getChartData(): Promise<ChartData> {
  const sb = supabaseServer();

  // Paginate — PostgREST caps each response at 1000 rows.
  type Row = { occurred_on: string; type: TxnType; amount: number; category_id: number | null; description: string | null };
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("transactions")
      .select("occurred_on, type, amount, category_id, description")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }

  // Map each category to its kind so "withdrawal" rows can net against the bucket's
  // saving/investment flow rather than being counted on their own.
  const { data: catRows } = await sb.from("categories").select("id, kind");
  const catKind = new Map<number, CategoryKind>();
  for (const c of (catRows ?? []) as { id: number; kind: CategoryKind }[]) catKind.set(c.id, c.kind);

  const monthOf = (d: string) => `${d.slice(0, 7)}-01`;
  const flowMap = new Map<string, ChartData["flows"][number]>();
  const catMap = new Map<string, ChartData["catTotals"][number]>();
  const addCat = (m: string, cid: number, kind: TxnType, delta: number) => {
    const key = `${m}|${cid}|${kind}`;
    const c = catMap.get(key) ?? { month: m, categoryId: cid, kind, total: 0 };
    c.total += delta;
    catMap.set(key, c);
  };
  const entryMap = new Map<string, ChartData["catEntries"][number]>();
  const addEntry = (m: string, cid: number, kind: TxnType, desc: string | null, amount: number) => {
    const d = (desc ?? "").trim().slice(0, 48);
    const key = `${m}|${cid}|${kind}|${d.toLowerCase()}`;
    const e = entryMap.get(key) ?? { month: m, categoryId: cid, kind, description: d, count: 0, total: 0, max: 0 };
    e.count += 1;
    e.total += amount;
    e.max = Math.max(e.max, amount);
    entryMap.set(key, e);
  };
  for (const r of rows) {
    if (r.type === "transfer") continue;
    const m = monthOf(r.occurred_on);
    const f = flowMap.get(m) ?? { month: m, income: 0, expense: 0, saving: 0, investment: 0 };

    if (r.type === "withdrawal") {
      const k = r.category_id ? catKind.get(r.category_id) : null;
      if ((k === "saving" || k === "investment") && r.category_id) {
        f[k] -= r.amount; // money left the bucket
        flowMap.set(m, f);
        addCat(m, r.category_id, k, -r.amount);
      }
      continue;
    }

    f[r.type as "income" | "expense" | "saving" | "investment"] += r.amount;
    flowMap.set(m, f);
    addCat(m, r.category_id ?? 0, r.type, r.amount);
    addEntry(m, r.category_id ?? 0, r.type, r.description, r.amount);
  }
  const months = [...flowMap.keys()].sort();
  const flows = months.map((m) => flowMap.get(m)!);
  const catTotals = [...catMap.values()];
  const catEntries = [...entryMap.values()];

  // Net-worth series from opening + cumulative monthly_wallet_delta (drift-proof).
  const opening = await getOpeningBalances();
  const openingTotal = [...opening.values()].reduce((a, b) => a + b, 0);
  const { data: deltas, error: dErr } = await sb.from("monthly_wallet_delta").select("month, delta");
  if (dErr) throw dErr;
  const deltaByMonth = new Map<string, number>();
  for (const d of (deltas ?? []) as { month: string; delta: number }[]) {
    deltaByMonth.set(d.month, (deltaByMonth.get(d.month) ?? 0) + d.delta);
  }
  const deltaMonths = [...deltaByMonth.keys()].filter((m) => m !== OPENING_MONTH).sort();
  let running = openingTotal;
  const networth = [{ month: OPENING_MONTH, total: openingTotal }];
  for (const m of deltaMonths) {
    running += deltaByMonth.get(m)!;
    networth.push({ month: m, total: running });
  }

  return { months, flows, catTotals, catEntries, networth };
}

// ---- Savings & investment balances ----
export interface SavingsBucket {
  categoryId: number;
  name: string;
  kind: "saving" | "investment";
  contributed: number; // total moved in (saving / investment)
  withdrawn: number; // total moved out (withdrawals)
  balance: number; // contributed − withdrawn
}

/** Cumulative balance held in each saving/investment bucket (optionally as of a cutoff date). */
export async function getSavingsBuckets(asOf?: string): Promise<SavingsBucket[]> {
  const sb = supabaseServer();
  // Active buckets only — this excludes the archived "Forex Yen" category, whose holding
  // is tracked separately in the Forex module (counting it here would double it).
  const cats = await getCategories(false);
  const buckets = new Map<number, SavingsBucket>();
  for (const c of cats) {
    if (c.kind === "saving" || c.kind === "investment") {
      buckets.set(c.id, { categoryId: c.id, name: c.name, kind: c.kind, contributed: 0, withdrawn: 0, balance: 0 });
    }
  }

  // Paginate the relevant transactions (PostgREST caps each response at 1000 rows).
  for (let from = 0; ; from += 1000) {
    let q = sb.from("transactions").select("type, amount, category_id").in("type", ["saving", "investment", "withdrawal"]);
    if (asOf) q = q.lte("occurred_on", asOf);
    const { data, error } = await q.order("id").range(from, from + 999);
    if (error) throw error;
    const batch = (data ?? []) as { type: string; amount: number; category_id: number | null }[];
    for (const r of batch) {
      if (!r.category_id) continue; // null-category (e.g. legacy forex) is not a bucket
      const b = buckets.get(r.category_id);
      if (!b) continue;
      if (r.type === "withdrawal") b.withdrawn += r.amount;
      else b.contributed += r.amount;
    }
    if (batch.length < 1000) break;
  }

  for (const b of buckets.values()) b.balance = b.contributed - b.withdrawn;
  return [...buckets.values()];
}

/** All transactions in a calendar year, ascending. Paginated (PostgREST caps at 1000). */
export async function getYearTransactions(year: number): Promise<Transaction[]> {
  const sb = supabaseServer();
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  const out: Transaction[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("transactions")
      .select("*")
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .order("occurred_on")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data ?? []) as Transaction[];
    out.push(...batch);
    if (batch.length < 1000) break;
  }
  return out;
}

/** Years with transaction data (descending), always including the current year. */
export async function getDataYears(): Promise<number[]> {
  const sb = supabaseServer();
  const { data } = await sb
    .from("transactions")
    .select("occurred_on")
    .order("occurred_on", { ascending: true })
    .limit(1)
    .maybeSingle();
  const currentYear = Number(todayISO().slice(0, 4));
  const minYear = data ? Number((data as { occurred_on: string }).occurred_on.slice(0, 4)) : currentYear;
  const years: number[] = [];
  for (let y = currentYear; y >= Math.min(minYear, currentYear); y--) years.push(y);
  return years;
}

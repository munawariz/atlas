import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabaseServer, isMissingTable, isMissingFunction } from "./supabaseServer";
import { TAGS } from "./cacheTags";
import { getSettings } from "./settings";
import { todayISO } from "./format";
import type {
  Budget,
  Category,
  CategoryGroup,
  CategoryGroupMember,
  CategoryKind,
  EffectiveBudget,
  Loan,
  LoanPayment,
  PaylaterItem,
  PaylaterPayment,
  PaylaterProvider,
  Transaction,
  TxnType,
  Wallet,
  WalletBalance,
} from "./types";

// =============================================================================
// Month key arithmetic — pure, no Date objects, so nothing can drift by a timezone.
// A "month key" is always YYYY-MM-01.
// =============================================================================

export function monthKeyOf(iso: string): string {
  return `${String(iso ?? "").slice(0, 7)}-01`;
}

export function nextMonthKey(monthKey: string): string {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  return m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

export function prevMonthKey(monthKey: string): string {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  return m === 1
    ? `${y - 1}-12-01`
    : `${y}-${String(m - 1).padStart(2, "0")}-01`;
}

/** Last calendar day of a month key, as YYYY-MM-DD. */
export function endOfMonth(monthKey: string): string {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  const day = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${monthKey.slice(0, 7)}-${String(day).padStart(2, "0")}`;
}

/** The current month as a month key. */
export function currentMonthKey(): string {
  return monthKeyOf(todayISO());
}

// =============================================================================
// Pagination
//
// PostgREST caps every response at 1000 rows (ATLAS.md §14.3). Any read that can span the
// whole ledger MUST go through this. `deriveWalletBalances` is the one exception — the delta
// table has at most (months x wallets) rows.
// =============================================================================

const PAGE = 1000;

type QueryBuilder<T> = {
  order(column: string, opts?: { ascending?: boolean }): QueryBuilder<T>;
  range(from: number, to: number): PromiseLike<{ data: T[] | null; error: unknown }>;
};

/**
 * Read every row a query matches, 1000 at a time.
 *
 * `build()` is called once per page so each page gets a fresh builder — Supabase builders are
 * single-use, and reusing one silently returns the first page forever.
 */
async function paginate<T>(
  build: () => QueryBuilder<T>,
  { tolerateMissing = false }: { tolerateMissing?: boolean } = {}
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build()
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      if (tolerateMissing && isMissingTable(error as { code?: string })) return [];
      throw error;
    }
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
}

// =============================================================================
// Opening month
//
// The opening month is DATA, not a constant (ATLAS.md §14.15). It is both a read key
// (deriveWalletBalances) and a write key (/balances upserts at it) — two call sites
// disagreeing about which month is "opening" silently corrupts net worth, so it is resolved
// in exactly one place.
// =============================================================================

/**
 * Resolve the month `wallet_balances` stores opening balances at.
 *
 * 1. `app_settings.opening_month` if set;
 * 2. else the earliest month present in `wallet_balances`;
 * 3. else the month BEFORE the earliest transaction, so opening balances precede all activity;
 * 4. else the current month.
 *
 * Cases 2-4 persist the result, so the value is decided exactly once and never drifts.
 * `cache()` dedupes it across a single request.
 */
export const getOpeningMonth = cache(async (): Promise<string> => {
  const sb = supabaseServer();

  // Read through getSettings() — it already fetches every app_settings row and is deduped
  // per request, so this costs nothing on pages that read any other setting.
  const settings = await getSettings();
  const raw = settings["opening_month"];

  const stored = raw ? monthKeyOf(String(raw)) : null;
  if (stored && /^\d{4}-\d{2}-01$/.test(stored)) return stored;

  let resolved: string | null = null;

  const { data: earliestBalance } = await sb
    .from("wallet_balances")
    .select("month")
    .order("month", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (earliestBalance?.month) resolved = monthKeyOf(String(earliestBalance.month));

  if (!resolved) {
    const { data: earliestTxn } = await sb
      .from("transactions")
      .select("occurred_on")
      .order("occurred_on", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (earliestTxn?.occurred_on) {
      resolved = prevMonthKey(monthKeyOf(String(earliestTxn.occurred_on)));
    }
  }

  if (!resolved) resolved = currentMonthKey();

  // Persist so the answer never changes again. Best-effort: a failure here (missing table on a
  // half-migrated DB) must not take the page down.
  await sb
    .from("app_settings")
    .upsert({ key: "opening_month", value: resolved }, { onConflict: "key" });

  return resolved;
});

// =============================================================================
// Wallets, balances, categories
// =============================================================================

// The list readers below fetch ALL rows and apply the `includeArchived` filter in JS.
// React cache() keys on arguments, so a cached `fn(includeArchived)` fetched the same table
// twice whenever the layout (no arg) and a page (`true`) rendered together — the arg-less
// inner function is what makes them share.
//
// Two cache layers on the arg-less fetcher:
//  - unstable_cache: cross-REQUEST. These tables change only through the manage actions,
//    which flush the matching tag (revalidateManage in more/actions.ts) — so a warm
//    navigation reads them without touching Postgres at all.
//  - React cache(): per-request dedup on top, and the place where missing-table tolerance
//    lives. The inner fetcher THROWS on a missing table instead of returning [] — thrown
//    results are never cached, so a freshly-migrated table is picked up on the next request
//    rather than serving a stale empty list until some action fires.

const fetchAllWallets = unstable_cache(
  async (): Promise<Wallet[]> => {
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("wallets")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Wallet[];
  },
  ["all-wallets"],
  { tags: [TAGS.wallets] }
);
const getAllWallets = cache(fetchAllWallets);

export async function getWallets(includeArchived = false): Promise<Wallet[]> {
  const all = await getAllWallets();
  return includeArchived ? all : all.filter((w) => !w.archived);
}

const fetchAllCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;

    // Default `period` / `is_installment` so the app works against a database that has not
    // had the newer columns migrated in yet.
    return (data ?? []).map(
      (row: Record<string, unknown>): Category => ({
        id: Number(row.id),
        kind: row.kind as CategoryKind,
        name: String(row.name),
        sort_order: Number(row.sort_order ?? 0),
        archived: Boolean(row.archived),
        is_favorite: Boolean(row.is_favorite ?? false),
        period: (row.period as Category["period"]) ?? "monthly",
        is_installment: Boolean(row.is_installment ?? false),
      })
    );
  },
  ["all-categories"],
  { tags: [TAGS.categories] }
);
const getAllCategories = cache(fetchAllCategories);

export async function getCategories(includeArchived = false): Promise<Category[]> {
  const all = await getAllCategories();
  return includeArchived ? all : all.filter((c) => !c.archived);
}

/**
 * The distinct categories of the latest ledger entries, newest first — the Add sheet's
 * "Recent" tab. "Latest" means latest ENTERED (id order), not latest dated, so what you
 * just added is always at the front.
 */
export const getRecentCategoryIds = cache(async (limit = 5): Promise<number[]> => {
  const sb = supabaseServer();

  // Exact latest-entered-wins aggregate via the fn_recent_category_ids RPC; the legacy
  // fallback approximates it from the newest 60 rows.
  const { data: recent, error: rpcError } = await sb.rpc("fn_recent_category_ids", {
    p_limit: limit,
  });
  if (!rpcError) {
    return ((recent ?? []) as { category_id: number }[]).map((r) =>
      Number(r.category_id)
    );
  }
  if (!isMissingFunction(rpcError)) throw rpcError;

  const { data, error } = await sb
    .from("transactions")
    .select("category_id")
    .not("category_id", "is", null)
    .order("id", { ascending: false })
    .limit(60);
  if (error) throw error;

  const ids: number[] = [];
  for (const row of (data ?? []) as { category_id: number }[]) {
    if (ids.includes(row.category_id)) continue;
    ids.push(row.category_id);
    if (ids.length >= limit) break;
  }
  return ids;
});

// Both group readers tolerate a missing table so the app keeps working against a database
// that has not had the groups migration run yet — the Add sheet just shows no groups.
const fetchAllCategoryGroups = unstable_cache(
  async (): Promise<CategoryGroup[]> => {
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("category_groups")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CategoryGroup[];
  },
  ["all-category-groups"],
  { tags: [TAGS.categoryGroups] }
);
const getAllCategoryGroups = cache(async (): Promise<CategoryGroup[]> => {
  try {
    return await fetchAllCategoryGroups();
  } catch (error) {
    if (isMissingTable(error as { code?: string })) return [];
    throw error;
  }
});

export async function getCategoryGroups(
  includeArchived = false
): Promise<CategoryGroup[]> {
  const all = await getAllCategoryGroups();
  return includeArchived ? all : all.filter((g) => !g.archived);
}

const fetchGroupMembers = unstable_cache(
  async (): Promise<CategoryGroupMember[]> => {
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("category_group_members")
      .select("group_id, category_id");
    if (error) throw error;
    return (data ?? []) as CategoryGroupMember[];
  },
  ["all-group-members"],
  { tags: [TAGS.groupMembers] }
);
export const getGroupMembers = cache(async (): Promise<CategoryGroupMember[]> => {
  try {
    return await fetchGroupMembers();
  } catch (error) {
    if (isMissingTable(error as { code?: string })) return [];
    throw error;
  }
});

export function walletMap(wallets: Wallet[]): Map<number, Wallet> {
  return new Map(wallets.map((w) => [w.id, w]));
}

export function categoryMap(categories: Category[]): Map<number, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

/** Opening balances, read at the resolved opening month. */
export const getOpeningBalances = cache(async (): Promise<WalletBalance[]> => {
  const sb = supabaseServer();
  const month = await getOpeningMonth();
  const { data, error } = await sb
    .from("wallet_balances")
    .select("*")
    .eq("month", month);
  if (error) throw error;
  return (data ?? []) as WalletBalance[];
});

/**
 * Balance per wallet at the END of `monthKey`.
 *
 * opening + SUM(monthly_wallet_delta) for every month <= monthKey. This is implementation #2
 * of the balance rule in ATLAS.md §3.3 — it must agree exactly with the Postgres trigger and
 * with the dashboard's per-day recomputation.
 *
 * No pagination: the delta table is (months x wallets) rows, which stays tiny.
 */
export async function deriveWalletBalances(
  monthKey: string
): Promise<Map<number, number>> {
  const sb = supabaseServer();
  const openingMonth = await getOpeningMonth();
  const opening = await getOpeningBalances();

  const balances = new Map<number, number>();
  for (const row of opening) balances.set(row.wallet_id, row.balance);

  // Deltas at or before the opening month are already baked into the opening figures.
  const { data, error } = await sb
    .from("monthly_wallet_delta")
    .select("wallet_id, delta")
    .gt("month", openingMonth)
    .lte("month", monthKey);
  if (error && !isMissingTable(error)) throw error;

  for (const row of (data ?? []) as { wallet_id: number; delta: number }[]) {
    balances.set(row.wallet_id, (balances.get(row.wallet_id) ?? 0) + Number(row.delta));
  }

  return balances;
}

/** Net worth = the sum of every wallet balance. Buckets and forex are deliberately excluded. */
export function sumBalances(balances: Map<number, number>): number {
  let total = 0;
  for (const value of balances.values()) total += value;
  return total;
}

/**
 * Apply one transaction to a running per-wallet balance map.
 *
 * Implementation #3 of the balance rule (ATLAS.md §3.3) — the dashboard walks the current
 * month day by day with this. Kept in `lib/data.ts` beside `deriveWalletBalances` so the two
 * are read together and cannot drift apart.
 */
export function bumpWallet(
  balances: Map<number, number>,
  txn: Pick<Transaction, "type" | "amount" | "source_wallet_id" | "dest_wallet_id">,
  sign: 1 | -1 = 1
): void {
  const add = (id: number | null, delta: number) => {
    if (id == null) return;
    balances.set(id, (balances.get(id) ?? 0) + delta);
  };
  const amount = sign * txn.amount;

  if (txn.type === "income" || txn.type === "withdrawal") {
    add(txn.dest_wallet_id, amount);
  } else if (txn.type === "transfer") {
    add(txn.source_wallet_id, -amount);
    add(txn.dest_wallet_id, amount);
  } else {
    // expense, saving, investment
    add(txn.source_wallet_id, -amount);
  }
}

// =============================================================================
// Transactions
// =============================================================================

export async function getMonthTransactions(
  monthKey: string
): Promise<Transaction[]> {
  const sb = supabaseServer();
  const end = endOfMonth(monthKey);
  return paginate<Transaction>(() =>
    sb
      .from("transactions")
      .select("*")
      .gte("occurred_on", monthKey)
      .lte("occurred_on", end) as unknown as QueryBuilder<Transaction>
  );
}

export interface TransactionFilter {
  from?: string;
  to?: string;
  type?: TxnType;
  categoryId?: number;
  walletId?: number;
  limit?: number;
}

export async function listTransactions(
  filter: TransactionFilter = {}
): Promise<Transaction[]> {
  const sb = supabaseServer();
  const limit = filter.limit ?? 200;

  let query = sb.from("transactions").select("*");
  if (filter.from) query = query.gte("occurred_on", filter.from);
  if (filter.to) query = query.lte("occurred_on", filter.to);
  if (filter.type) query = query.eq("type", filter.type);
  if (filter.categoryId) query = query.eq("category_id", filter.categoryId);
  if (filter.walletId) {
    query = query.or(
      `source_wallet_id.eq.${filter.walletId},dest_wallet_id.eq.${filter.walletId}`
    );
  }

  const { data, error } = await query
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function getTransaction(id: number): Promise<Transaction | null> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Transaction | null) ?? null;
}

/** Every transaction in a calendar year, oldest first. */
export async function getYearTransactions(year: number): Promise<Transaction[]> {
  const sb = supabaseServer();
  return paginate<Transaction>(() =>
    sb
      .from("transactions")
      .select("*")
      .gte("occurred_on", `${year}-01-01`)
      .lte("occurred_on", `${year}-12-31`) as unknown as QueryBuilder<Transaction>
  );
}

/** Years that have any ledger activity, newest first, always including the current year. */
export async function getDataYears(): Promise<number[]> {
  const sb = supabaseServer();
  const years = new Set<number>([new Date().getFullYear()]);

  // One min/max round trip via the fn_txn_date_range RPC; two sequential single-row
  // queries as the legacy fallback.
  let minDay: string | null = null;
  let maxDay: string | null = null;

  const { data: range, error } = await sb.rpc("fn_txn_date_range");
  if (!error) {
    const row = ((range ?? []) as { min_day: string | null; max_day: string | null }[])[0];
    minDay = row?.min_day ?? null;
    maxDay = row?.max_day ?? null;
  } else {
    if (!isMissingFunction(error)) throw error;

    const { data: first } = await sb
      .from("transactions")
      .select("occurred_on")
      .order("occurred_on", { ascending: true })
      .limit(1)
      .maybeSingle();
    const { data: last } = await sb
      .from("transactions")
      .select("occurred_on")
      .order("occurred_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    minDay = first?.occurred_on ? String(first.occurred_on) : null;
    maxDay = last?.occurred_on ? String(last.occurred_on) : null;
  }

  if (minDay && maxDay) {
    const lo = parseInt(minDay.slice(0, 4), 10);
    const hi = parseInt(maxDay.slice(0, 4), 10);
    for (let y = lo; y <= hi; y += 1) years.add(y);
  }

  return [...years].sort((a, b) => b - a);
}

// =============================================================================
// Budgets — "override beats recurring rule" (ATLAS.md §3.4)
// =============================================================================

/**
 * The winning budget per category for `monthKey`.
 *
 * A per-month override in `budgets` wins outright. Otherwise the recurring rule with the
 * greatest `effective_from <= monthKey` applies — which is why the rules are ordered ASCENDING:
 * the last write into the Map is the latest applicable rule (ATLAS.md §14.6).
 */
export async function getBudgetsForMonth(
  monthKey: string
): Promise<Map<number, EffectiveBudget>> {
  const sb = supabaseServer();
  const effective = new Map<number, EffectiveBudget>();

  const { data: rules, error: rulesError } = await sb
    .from("recurring_budgets")
    .select("category_id, amount, effective_from")
    .lte("effective_from", monthKey)
    .order("effective_from", { ascending: true });
  if (rulesError && !isMissingTable(rulesError)) throw rulesError;

  for (const rule of (rules ?? []) as {
    category_id: number;
    amount: number;
  }[]) {
    effective.set(rule.category_id, {
      category_id: rule.category_id,
      amount: Number(rule.amount),
      source: "rule",
    });
  }

  const { data: overrides, error: overridesError } = await sb
    .from("budgets")
    .select("category_id, amount")
    .eq("month", monthKey);
  if (overridesError && !isMissingTable(overridesError)) throw overridesError;

  for (const row of (overrides ?? []) as {
    category_id: number;
    amount: number;
  }[]) {
    effective.set(row.category_id, {
      category_id: row.category_id,
      amount: Number(row.amount),
      source: "month",
    });
  }

  return effective;
}

/** Every recurring rule for one category, oldest first — drives the budget scope controls. */
export async function getRecurringBudgets(
  categoryId: number
): Promise<{ id: number; amount: number; effective_from: string }[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("recurring_budgets")
    .select("id, amount, effective_from")
    .eq("category_id", categoryId)
    .order("effective_from", { ascending: true });
  if (error && !isMissingTable(error)) throw error;
  return (data ?? []) as { id: number; amount: number; effective_from: string }[];
}

export async function getMonthBudgetOverrides(
  monthKey: string
): Promise<Budget[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("budgets").select("*").eq("month", monthKey);
  if (error && !isMissingTable(error)) throw error;
  return (data ?? []) as Budget[];
}

/**
 * A budget expressed per month, whatever cadence it was entered at.
 *
 * 30.4 days and 4.345 weeks are the average month — using 30/4 would make a daily budget read
 * ~1.3% low and a weekly one ~8% low against actuals.
 */
export function monthlyEquivalent(
  amount: number,
  period: Category["period"]
): number {
  switch (period) {
    case "daily":
      return Math.round(amount * 30.4);
    case "weekly":
      return Math.round(amount * 4.345);
    case "yearly":
      return Math.round(amount / 12);
    default:
      return amount;
  }
}

// =============================================================================
// Installments and loans
// =============================================================================

const fetchAllPaylaterProviders = unstable_cache(
  async (): Promise<PaylaterProvider[]> => {
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("paylater_providers")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PaylaterProvider[];
  },
  ["all-paylater-providers"],
  { tags: [TAGS.paylaterProviders] }
);
const getAllPaylaterProviders = cache(async (): Promise<PaylaterProvider[]> => {
  try {
    return await fetchAllPaylaterProviders();
  } catch (error) {
    if (isMissingTable(error as { code?: string })) return [];
    throw error;
  }
});

export async function getPaylaterProviders(
  includeArchived = false
): Promise<PaylaterProvider[]> {
  const all = await getAllPaylaterProviders();
  return includeArchived ? all : all.filter((p) => !p.archived);
}

export const getPaylaterItems = cache(async (): Promise<PaylaterItem[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("paylater_items")
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []) as PaylaterItem[];
});

export const getPaylaterPayments = cache(async (): Promise<PaylaterPayment[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("paylater_payments")
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []) as PaylaterPayment[];
});

export const getLoans = cache(async (): Promise<Loan[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("loans")
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }

  // `deadline` is defaulted the same way the category columns are: select("*") on a database
  // that has not had it migrated in yet simply omits the key, and undefined is not null.
  return (data ?? []).map(
    (row: Record<string, unknown>): Loan => ({
      id: Number(row.id),
      person: String(row.person),
      note: (row.note as string | null) ?? null,
      installment: Number(row.installment ?? 0),
      lender: (row.lender as string | null) ?? null,
      deadline: (row.deadline as string | null) ?? null,
    })
  );
});

export const getLoanPayments = cache(async (): Promise<LoanPayment[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("loan_payments")
    .select("*")
    .order("period_month", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []) as LoanPayment[];
});

// =============================================================================
// Savings buckets
// =============================================================================

export interface SavingsBucket {
  category_id: number;
  name: string;
  kind: "saving" | "investment";
  contributed: number;
  withdrawn: number;
  balance: number;
}

/**
 * Cumulative per-bucket contributed / withdrawn / balance.
 *
 * ACTIVE categories only (ATLAS.md §14.10): an archived legacy bucket must not double-count
 * against a module that tracks the same money — e.g. an old "Forex Yen" saving category
 * alongside the Forex module.
 */
export async function getSavingsBuckets(asOf?: string): Promise<SavingsBucket[]> {
  const sb = supabaseServer();
  const categories = await getCategories();

  const buckets = new Map<number, SavingsBucket>();
  for (const cat of categories) {
    if (cat.kind !== "saving" && cat.kind !== "investment") continue;
    buckets.set(cat.id, {
      category_id: cat.id,
      name: cat.name,
      kind: cat.kind,
      contributed: 0,
      withdrawn: 0,
      balance: 0,
    });
  }
  if (buckets.size === 0) return [];

  // Per-category SUMs from the fn_savings_buckets RPC (0002_perf_rpc.sql); fall back to the
  // legacy scan of every saving/investment/withdrawal row on an un-migrated database.
  const { data: totals, error } = await sb.rpc("fn_savings_buckets", {
    p_as_of: asOf ?? null,
  });

  if (!error) {
    for (const row of (totals ?? []) as {
      category_id: number;
      contributed: number;
      withdrawn: number;
    }[]) {
      const bucket = buckets.get(Number(row.category_id));
      if (!bucket) continue;
      bucket.contributed = Number(row.contributed);
      bucket.withdrawn = Number(row.withdrawn);
    }
  } else {
    if (!isMissingFunction(error)) throw error;

    const rows = await paginate<
      Pick<Transaction, "type" | "amount" | "category_id">
    >(() => {
      let query = sb
        .from("transactions")
        .select("id, type, amount, category_id")
        .in("type", ["saving", "investment", "withdrawal"]);
      if (asOf) query = query.lte("occurred_on", asOf);
      return query as unknown as QueryBuilder<
        Pick<Transaction, "type" | "amount" | "category_id">
      >;
    });

    for (const row of rows) {
      if (row.category_id == null) continue;
      const bucket = buckets.get(row.category_id);
      if (!bucket) continue;
      if (row.type === "withdrawal") bucket.withdrawn += row.amount;
      else bucket.contributed += row.amount;
    }
  }

  for (const bucket of buckets.values()) {
    bucket.balance = bucket.contributed - bucket.withdrawn;
  }

  return [...buckets.values()];
}

// =============================================================================
// Chart data — ONE pass over the whole ledger
// =============================================================================

export interface MonthFlow {
  income: number;
  expense: number;
  saving: number;
  investment: number;
}

export interface CatEntry {
  description: string;
  count: number;
  total: number;
  max: number;
}

export interface ChartData {
  /** Every month with activity, ascending. */
  months: string[];
  /** month -> flows. Transfers excluded throughout. */
  flows: Record<string, MonthFlow>;
  /** YYYY-MM-DD -> flows, for the 1-month daily zoom. Active days only. */
  dailyFlows: Record<string, MonthFlow>;
  /** month -> categoryId -> { kind, total } */
  catTotals: Record<string, Record<number, { kind: CategoryKind; total: number }>>;
  /** month -> categoryId -> normalized description -> aggregate */
  catEntries: Record<string, Record<number, Record<string, CatEntry>>>;
  /** month -> net worth at the end of that month. */
  networth: Record<string, number>;
}

const EMPTY_FLOW = (): MonthFlow => ({
  income: 0,
  expense: 0,
  saving: 0,
  investment: 0,
});

/** Collapse whitespace so "Coffee  run" and "Coffee run" aggregate as one entry. */
function normalizeDescription(value: string | null): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

/** The aggregate halves of ChartData, before net worth is composed on top. */
interface ChartAggregates {
  flows: ChartData["flows"];
  dailyFlows: ChartData["dailyFlows"];
  catTotals: ChartData["catTotals"];
  catEntries: ChartData["catEntries"];
  /** month -> net-worth delta for that month (balance rule summed across wallets). */
  monthDelta: Record<string, number>;
}

/**
 * Everything /charts needs.
 *
 * A `withdrawal` NETS AGAINST ITS BUCKET'S KIND (`flow[kind] -= amount`) rather than counting
 * as its own flow — taking money back out of a savings bucket reduces that month's saving, it
 * is not income.
 *
 * The aggregates come from the `fn_chart_data` RPC (one round trip, 0002_perf_rpc.sql) when
 * it exists, else from the legacy paginated scan of the whole ledger. Net worth is composed
 * in JS either way, so the opening-balance rule lives in exactly one place.
 */
export async function getChartData(): Promise<ChartData> {
  const sb = supabaseServer();

  const { data, error } = await sb.rpc("fn_chart_data");
  if (error && !isMissingFunction(error)) throw error;

  const agg = !error && data ? (data as unknown as ChartAggregates) : await chartAggregatesLegacy();
  return composeChartData(agg);
}

/** Legacy single-pass JS scan — the fallback for an un-migrated database. */
async function chartAggregatesLegacy(): Promise<ChartAggregates> {
  const sb = supabaseServer();
  const categories = await getCategories(true);
  const kindOf = new Map(categories.map((c) => [c.id, c.kind]));

  const rows = await paginate<Transaction>(
    () => sb.from("transactions").select("*") as unknown as QueryBuilder<Transaction>
  );

  const flows: Record<string, MonthFlow> = {};
  const dailyFlows: Record<string, MonthFlow> = {};
  const catTotals: ChartData["catTotals"] = {};
  const catEntries: ChartData["catEntries"] = {};
  const monthDelta: Record<string, number> = {};

  for (const row of rows) {
    const month = monthKeyOf(row.occurred_on);
    const day = row.occurred_on;

    // --- Net worth delta: the balance rule again, summed across all wallets. Transfers are
    //     wallet-to-wallet so they net to zero and are skipped entirely.
    if (row.type === "income" || row.type === "withdrawal") {
      if (row.dest_wallet_id != null) {
        monthDelta[month] = (monthDelta[month] ?? 0) + row.amount;
      }
    } else if (row.type !== "transfer") {
      if (row.source_wallet_id != null) {
        monthDelta[month] = (monthDelta[month] ?? 0) - row.amount;
      }
    }

    if (row.type === "transfer") continue;

    flows[month] ??= EMPTY_FLOW();
    dailyFlows[day] ??= EMPTY_FLOW();

    if (row.type === "withdrawal") {
      // Net against whichever bucket kind it came out of.
      const kind = row.category_id != null ? kindOf.get(row.category_id) : undefined;
      if (kind === "saving" || kind === "investment") {
        flows[month][kind] -= row.amount;
        dailyFlows[day][kind] -= row.amount;
      }
    } else {
      flows[month][row.type] += row.amount;
      dailyFlows[day][row.type] += row.amount;
    }

    // --- Per-category aggregates ------------------------------------------
    if (row.category_id == null) continue;
    const kind = kindOf.get(row.category_id);
    if (!kind) continue;

    const signed = row.type === "withdrawal" ? -row.amount : row.amount;

    catTotals[month] ??= {};
    catTotals[month][row.category_id] ??= { kind, total: 0 };
    catTotals[month][row.category_id].total += signed;

    // Identical notes collapse into one entry, which is what keeps this payload small enough
    // to ship to the client.
    const note = normalizeDescription(row.description);
    catEntries[month] ??= {};
    catEntries[month][row.category_id] ??= {};
    const bucket = (catEntries[month][row.category_id][note] ??= {
      description: note,
      count: 0,
      total: 0,
      max: 0,
    });
    bucket.count += 1;
    bucket.total += signed;
    bucket.max = Math.max(bucket.max, row.amount);
  }

  return { flows, dailyFlows, catTotals, catEntries, monthDelta };
}

/** Net worth on top of the aggregates: opening baseline + cumulative monthly deltas. */
async function composeChartData(agg: ChartAggregates): Promise<ChartData> {
  const { flows, dailyFlows, catTotals, catEntries, monthDelta } = agg;

  const openingMonth = await getOpeningMonth();
  const opening = await getOpeningBalances();
  const baseline = opening.reduce((sum, row) => sum + row.balance, 0);

  const months = [
    ...new Set([...Object.keys(flows), ...Object.keys(monthDelta), openingMonth]),
  ].sort();

  const networth: Record<string, number> = {};
  let running = baseline;
  for (const month of months) {
    // Activity at or before the opening month is already inside the opening balances.
    if (month > openingMonth) running += monthDelta[month] ?? 0;
    networth[month] = running;
    flows[month] ??= EMPTY_FLOW();
  }

  return { months, flows, dailyFlows, catTotals, catEntries, networth };
}

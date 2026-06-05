import "server-only";
import { supabaseServer } from "./supabaseServer";
import type {
  Budget,
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
  const { data, error } = await q.order("sort_order");
  if (error) throw error;
  return (data ?? []) as Wallet[];
}

export async function getCategories(includeArchived = false): Promise<Category[]> {
  let q = supabaseServer().from("categories").select("*");
  if (!includeArchived) q = q.eq("archived", false);
  const { data, error } = await q.order("kind").order("sort_order");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function getCategoriesByKind(kind: CategoryKind): Promise<Category[]> {
  const { data, error } = await supabaseServer()
    .from("categories")
    .select("*")
    .eq("kind", kind)
    .eq("archived", false)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Category[];
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

export async function getBudgetsForMonth(monthKey: string): Promise<Budget[]> {
  const { data, error } = await supabaseServer().from("budgets").select("*").eq("month", monthKey);
  if (error) throw error;
  return (data ?? []) as Budget[];
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

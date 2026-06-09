import "server-only";
import { supabaseServer } from "./supabaseServer";
import type { ForexAccount, ForexTransaction } from "./types";

// Used only for the optional reference value on the Forex screen.
const FALLBACK_RATE: Record<string, number> = { JPY: 110 };

function nextMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

export async function getForexAccounts(): Promise<ForexAccount[]> {
  const { data, error } = await supabaseServer().from("forex_accounts").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...(r as ForexAccount), units: Number((r as ForexAccount).units) }));
}

export async function getForexTransactions(): Promise<ForexTransaction[]> {
  const { data, error } = await supabaseServer()
    .from("forex_transactions")
    .select("*")
    .order("occurred_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...(r as ForexTransaction), units: Number((r as ForexTransaction).units) }));
}

/** The forex log row linked to a ledger transaction, if any (so the editor can tell a
 *  forex buy/sell apart from an ordinary investment/income entry). */
export async function getForexTxnByTxnId(txnId: number): Promise<ForexTransaction | null> {
  const { data, error } = await supabaseServer()
    .from("forex_transactions")
    .select("*")
    .eq("txn_id", txnId)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...(data as ForexTransaction), units: Number((data as ForexTransaction).units) } : null;
}

/** Average IDR cost per 1 unit of a holding, from its buy/sell log (average-cost method):
 *  buys add cost + units, sells remove cost proportionally. 0 if there's no buy history. */
export function forexAvgCost(accountTxns: ForexTransaction[]): number {
  const chrono = [...accountTxns].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
  let units = 0;
  let cost = 0;
  for (const t of chrono) {
    if (t.direction === "buy") {
      units += t.units;
      cost += t.idr;
    } else if (units > 0) {
      const sold = Math.min(t.units, units);
      cost -= cost * (sold / units);
      units -= sold;
    }
  }
  return units > 0 ? cost / units : 0;
}

/** Per-account foreign-currency balance at the END of `monthKey` (current minus later moves). */
export async function forexUnitsAt(monthKey: string): Promise<Map<number, number>> {
  const [accounts, txns] = await Promise.all([getForexAccounts(), getForexTransactions()]);
  const end = nextMonth(monthKey);
  const out = new Map<number, number>();
  for (const a of accounts) {
    let units = a.units;
    for (const t of txns) {
      if (t.account_id === a.id && t.occurred_on >= end) {
        units -= t.direction === "buy" ? t.units : -t.units; // undo moves that happened after this month
      }
    }
    out.set(a.id, units);
  }
  return out;
}

/** IDR per 1 unit of `currency` (live, cached ~1h) — reference only, not used in networth. */
export async function getForexRate(currency: string): Promise<number> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const idr = data?.rates?.IDR;
      if (typeof idr === "number" && idr > 0) return idr;
    }
  } catch {
    // ignore — fall back below
  }
  return FALLBACK_RATE[currency] ?? 0;
}

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

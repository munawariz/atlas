import "server-only";

import { cache } from "react";
import { supabaseServer, isMissingTable } from "./supabaseServer";

/**
 * Bonds. Buying and selling moves principal in and out of the bond bucket; coupons are income
 * and carry no units.
 */

export interface BondTrade {
  id: number;
  name: string;
  side: "buy" | "sell" | "coupon";
  units: number;
  idr: number;
  occurred_on: string;
  wallet_id: number | null;
  txn_id: number | null;
}

export interface BondHolding {
  name: string;
  units: number;
  /**
   * Principal still in, at average cost — always exactly `avgPerUnit × units`.
   *
   * A sale takes principal out in proportion to the units it removes, NOT at whatever it
   * fetched: deducting the proceeds is what lets an off-par sale leave a stale remainder
   * behind (sold under cost) or drive the figure negative (sold over it). Same walk stocks,
   * crypto and forex use, so "invested" means the same thing on every investment page.
   */
  invested: number;
  coupons: number;
}

export interface BondPortfolio {
  holdings: BondHolding[];
  totalInvested: number;
  totalCoupons: number;
}

// Fetches the whole table once per request; `asOf` filters in JS (dates are YYYY-MM-DD, so
// string compare matches the `lte` PostgREST used to apply). Dedupes the page's
// getBondPortfolio() + getBondTrades() pair into one query.
const getAllBondTrades = cache(async (): Promise<BondTrade[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("bond_trades")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }

  // `units` is numeric, which the client returns as a string (ATLAS.md §14.5).
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    name: String(row.name),
    side: row.side as BondTrade["side"],
    units: Number(row.units ?? 0),
    idr: Number(row.idr ?? 0),
    occurred_on: String(row.occurred_on),
    wallet_id: row.wallet_id == null ? null : Number(row.wallet_id),
    txn_id: row.txn_id == null ? null : Number(row.txn_id),
  }));
});

export async function getBondTrades(asOf?: string): Promise<BondTrade[]> {
  const all = await getAllBondTrades();
  return asOf ? all.filter((t) => t.occurred_on <= asOf) : all;
}

export async function getBondPortfolio(asOf?: string): Promise<BondPortfolio> {
  const trades = await getBondTrades(asOf);

  // Oldest first. The reader hands these back newest-first, which was harmless while the
  // walk was a pure sum but is not once a sale prices itself off the principal in front of
  // it — a sell must never be seen before the buy that funded it.
  const ordered = [...trades].sort((a, b) =>
    a.occurred_on === b.occurred_on
      ? a.id - b.id
      : a.occurred_on < b.occurred_on
        ? -1
        : 1
  );

  const byName = new Map<string, BondHolding>();
  const of = (name: string): BondHolding => {
    let holding = byName.get(name);
    if (!holding) {
      holding = { name, units: 0, invested: 0, coupons: 0 };
      byName.set(name, holding);
    }
    return holding;
  };

  for (const trade of ordered) {
    const holding = of(trade.name);
    if (trade.side === "buy") {
      holding.units += trade.units;
      holding.invested += trade.idr;
    } else if (trade.side === "sell") {
      // Principal leaves in proportion to the units, not at the price it fetched — the same
      // average-cost disposal `stockPositions` does (ATLAS.md §3.5). A sale with nothing
      // behind it is skipped rather than driven negative.
      if (holding.units <= 0) continue;
      const sold = Math.min(trade.units, holding.units);
      holding.invested -= holding.invested * (sold / holding.units);
      holding.units -= sold;
    } else {
      holding.coupons += trade.idr;
    }
  }

  // A fully sold bond keeps its coupon history but stops being a holding — selling out now
  // empties the principal too, so `invested > 0` no longer keeps a closed one on the list.
  const holdings = [...byName.values()]
    .map((h) => ({ ...h, invested: h.units > 0 ? Math.round(h.invested) : 0 }))
    .filter((h) => h.units > 0 || h.coupons > 0)
    .sort((a, b) => b.invested - a.invested);

  return {
    holdings,
    totalInvested: holdings.reduce((sum, h) => sum + h.invested, 0),
    totalCoupons: holdings.reduce((sum, h) => sum + h.coupons, 0),
  };
}

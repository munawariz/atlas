import "server-only";

import { cache } from "react";
import { supabaseServer, isMissingTable } from "./supabaseServer";
import { getForexRate } from "./forex";

/**
 * Crypto. Quantity is in COINS and is fractional — that is the one thing separating this
 * module from `lib/stocks.ts`, where quantity is whole lots. Everything else is the same
 * shape: average cost per unit, realized P/L booked on a sell, live value on top.
 *
 * Cost basis is average cost, per coin: avgPerUnit = Σ buy_idr / Σ buy_units.
 */

/**
 * Fractional units never land exactly on zero after a round trip through numeric and float,
 * so "still held" is a tolerance rather than `> 0`. A hundred-millionth of a coin is dust.
 */
export const DUST = 1e-8;

/**
 * Yahoo quotes crypto against fiat as `SYMBOL-CURRENCY`, but only against a handful of
 * currencies — `BTC-IDR` 404s where `BTC-USD` does not. So every coin is quoted in USD and
 * converted with the rate source `lib/forex.ts` already uses. Both are exported as constants
 * rather than inlined so another quote currency is a one-line change.
 */
export const QUOTE_SUFFIX = "-USD";
export const QUOTE_CURRENCY = "USD";

export interface CryptoTrade {
  id: number;
  symbol: string;
  side: "buy" | "sell";
  units: number;
  idr: number;
  occurred_on: string;
  /** A pre-existing holding: it establishes cost basis but books no money movement. */
  opening: boolean;
  wallet_id: number | null;
  txn_id: number | null;
  pl_txn_id: number | null;
  realized_pl: number | null;
}

export interface CryptoHolding {
  symbol: string;
  units: number;
  /** Money still tied up in the units held now. */
  costBasis: number;
  avgPerUnit: number;
  /** Live price per coin, in IDR. */
  price: number | null;
  value: number | null;
  unrealizedPl: number | null;
  /** Every rupiah ever put in, including units since sold. */
  invested: number;
  proceeds: number;
  realizedPl: number;
}

export interface CryptoPortfolio {
  holdings: CryptoHolding[];
  /** Market value of the coins that HAVE a live price. */
  pricedValue: number;
  /** Cost basis of those same coins — the matching denominator. */
  pricedCost: number;
  unrealizedPl: number;
  totalCost: number;
  lifetimeRealizedPl: number;
  /** Coins with no live price. Excluded from pricedValue/pricedCost entirely. */
  missing: string[];
}

// =============================================================================
// Queries
// =============================================================================

// Fetches the whole table once per request; `asOf` filters in JS (dates are YYYY-MM-DD, so
// the string compare is the same `lte` PostgREST would apply). Dedupes the page's
// getCryptoPortfolio() + getCryptoTrades() pair into one query.
const getAllCryptoTrades = cache(async (): Promise<CryptoTrade[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("crypto_trades")
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
    symbol: String(row.symbol),
    side: row.side as CryptoTrade["side"],
    units: Number(row.units ?? 0),
    idr: Number(row.idr ?? 0),
    occurred_on: String(row.occurred_on),
    opening: Boolean(row.opening),
    wallet_id: row.wallet_id == null ? null : Number(row.wallet_id),
    txn_id: row.txn_id == null ? null : Number(row.txn_id),
    pl_txn_id: row.pl_txn_id == null ? null : Number(row.pl_txn_id),
    realized_pl: row.realized_pl == null ? null : Number(row.realized_pl),
  }));
});

export async function getCryptoTrades(asOf?: string): Promise<CryptoTrade[]> {
  const all = await getAllCryptoTrades();
  return asOf ? all.filter((t) => t.occurred_on <= asOf) : all;
}

/**
 * Units of a coin held and the average cost of each, from a set of trades.
 *
 * Pure, so the sell path in the trade action can price a disposal off the same numbers the
 * portfolio shows without a second query.
 */
export function cryptoPosition(
  trades: CryptoTrade[],
  symbol: string
): { units: number; avgPerUnit: number } {
  const mine = trades.filter((t) => t.symbol === symbol);
  const buys = mine.filter((t) => t.side === "buy");

  const buyUnits = buys.reduce((sum, t) => sum + t.units, 0);
  const buyIdr = buys.reduce((sum, t) => sum + t.idr, 0);
  const sellUnits = mine
    .filter((t) => t.side === "sell")
    .reduce((sum, t) => sum + t.units, 0);

  return {
    units: buyUnits - sellUnits,
    avgPerUnit: buyUnits > 0 ? buyIdr / buyUnits : 0,
  };
}

// =============================================================================
// Live prices
// =============================================================================

/**
 * Last traded price for a coin in USD, or null.
 *
 * NEVER throws, for the reason `getLiveStockPrice` doesn't: a price is a nicety, and a dead
 * network or an unlisted symbol must not take the portfolio page down.
 */
export async function getLiveCryptoPriceUsd(
  symbol: string
): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol + QUOTE_SUFFIX
    )}?interval=1d&range=1d`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      chart?: { result?: { meta?: { regularMarketPrice?: number } }[] };
    };
    const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" && Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}

/**
 * Live price per coin in IDR, or null.
 *
 * A missing exchange rate yields null, never zero — a coin priced at nothing would quietly
 * wipe out the portfolio's value instead of surfacing in `missing`.
 */
export async function getLiveCryptoPrice(
  symbol: string
): Promise<number | null> {
  const [usd, rate] = await Promise.all([
    getLiveCryptoPriceUsd(symbol),
    getForexRate(QUOTE_CURRENCY),
  ]);
  if (usd === null || !(rate > 0)) return null;
  return usd * rate;
}

// =============================================================================
// Portfolio
// =============================================================================

/**
 * Aggregate holdings per coin.
 *
 * `livePrices=false` for past-year snapshots, where a today price would be wrong.
 *
 * Unpriced coins are excluded from BOTH pricedValue and pricedCost (ATLAS.md §14.11), so the
 * unrealized percentage is never computed against a partial denominator.
 */
export async function getCryptoPortfolio(
  asOf?: string,
  livePrices = true
): Promise<CryptoPortfolio> {
  const trades = await getCryptoTrades(asOf);

  interface Agg {
    buyUnits: number;
    buyIdr: number;
    sellUnits: number;
    proceeds: number;
    realizedPl: number;
  }

  const agg = new Map<string, Agg>();
  const of = (symbol: string): Agg => {
    let entry = agg.get(symbol);
    if (!entry) {
      entry = { buyUnits: 0, buyIdr: 0, sellUnits: 0, proceeds: 0, realizedPl: 0 };
      agg.set(symbol, entry);
    }
    return entry;
  };

  for (const trade of trades) {
    const entry = of(trade.symbol);
    if (trade.side === "buy") {
      entry.buyUnits += trade.units;
      entry.buyIdr += trade.idr;
    } else {
      entry.sellUnits += trade.units;
      entry.proceeds += trade.idr;
      entry.realizedPl += trade.realized_pl ?? 0;
    }
  }

  const lifetimeRealizedPl = [...agg.values()].reduce(
    (sum, e) => sum + e.realizedPl,
    0
  );

  // Only coins still held show as holdings; the rest survive in the lifetime figures.
  const held = [...agg.entries()]
    .map(([symbol, entry]) => ({
      symbol,
      entry,
      units: entry.buyUnits - entry.sellUnits,
    }))
    .filter((row) => row.units > DUST);

  // One rate for the whole portfolio: the quotes come back in USD, and looking the rate up
  // per coin would be the same request N times.
  const rate = livePrices && held.length > 0 ? await getForexRate(QUOTE_CURRENCY) : 0;

  const prices = new Map<string, number | null>();
  if (rate > 0) {
    // In parallel: a ten-coin portfolio should cost one round trip, not ten.
    const results = await Promise.all(
      held.map(
        async (row) =>
          [row.symbol, await getLiveCryptoPriceUsd(row.symbol)] as const
      )
    );
    for (const [symbol, usd] of results) {
      prices.set(symbol, usd === null ? null : usd * rate);
    }
  }

  const holdings: CryptoHolding[] = held.map(({ symbol, entry, units }) => {
    const avgPerUnit = entry.buyUnits > 0 ? entry.buyIdr / entry.buyUnits : 0;
    const costBasis = Math.round(units * avgPerUnit);
    const price = prices.get(symbol) ?? null;
    const value = price === null ? null : Math.round(units * price);

    return {
      symbol,
      units,
      costBasis,
      avgPerUnit,
      price,
      value,
      unrealizedPl: value === null ? null : value - costBasis,
      invested: entry.buyIdr,
      proceeds: entry.proceeds,
      realizedPl: entry.realizedPl,
    };
  });

  holdings.sort((a, b) => (b.value ?? b.costBasis) - (a.value ?? a.costBasis));

  let pricedValue = 0;
  let pricedCost = 0;
  const missing: string[] = [];

  for (const holding of holdings) {
    if (holding.value === null) {
      missing.push(holding.symbol);
      continue;
    }
    pricedValue += holding.value;
    pricedCost += holding.costBasis;
  }

  return {
    holdings,
    pricedValue,
    pricedCost,
    unrealizedPl: pricedValue - pricedCost,
    totalCost: holdings.reduce((sum, h) => sum + h.costBasis, 0),
    lifetimeRealizedPl,
    missing,
  };
}

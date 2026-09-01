import "server-only";

import { cache } from "react";
import { supabaseServer, isMissingTable } from "./supabaseServer";
import { getForexRate } from "./forex";

/**
 * Crypto. Quantity is in COINS and is fractional — that is the one thing separating this
 * module from `lib/stocks.ts`, where quantity is whole lots. Everything else is the same
 * shape: average cost per unit, realized P/L booked on a sell, live value on top.
 *
 * Cost basis is average cost, per coin, walked chronologically — see `cryptoPositions`.
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
  /**
   * Money still tied up in the units held now — the only "invested" figure there is.
   *
   * A sell takes its units out at average cost, so this is always exactly
   * `avgPerUnit × units`. Every rupiah ever bought is deliberately NOT carried alongside it,
   * for the reason `StockHolding.costBasis` spells out: the two diverge the moment anything
   * is sold. Recoverable as `costBasis + proceeds − realizedPl`.
   */
  costBasis: number;
  avgPerUnit: number;
  /** Live price per coin, in IDR. */
  price: number | null;
  value: number | null;
  unrealizedPl: number | null;
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

export interface CryptoPosition {
  /** Units still held. May be dust rather than a clean zero — compare against `DUST`. */
  units: number;
  /** What those units cost — the money still tied up in them. */
  costBasis: number;
  avgPerUnit: number;
}

const NO_POSITION: CryptoPosition = { units: 0, costBasis: 0, avgPerUnit: 0 };

/**
 * Units held and what they cost, per coin. Pure, so the sell path in the trade action prices
 * a disposal off the same numbers the portfolio shows without a second query.
 *
 * A chronological walk: a buy adds units and cost, a sell removes cost in PROPORTION to the
 * units it takes — average cost, not FIFO. Selling out therefore empties the position and the
 * next buy averages from scratch, where dividing every rupiah ever spent by every unit ever
 * bought would keep sold units in the denominator forever.
 */
export function cryptoPositions(
  trades: Pick<
    CryptoTrade,
    "id" | "symbol" | "side" | "units" | "idr" | "occurred_on"
  >[]
): Map<string, CryptoPosition> {
  const ordered = [...trades].sort((a, b) =>
    a.occurred_on === b.occurred_on
      ? a.id - b.id
      : a.occurred_on < b.occurred_on
        ? -1
        : 1
  );

  const running = new Map<string, { units: number; cost: number }>();
  for (const trade of ordered) {
    const entry = running.get(trade.symbol) ?? { units: 0, cost: 0 };
    if (trade.side === "buy") {
      entry.units += trade.units;
      entry.cost += trade.idr;
    } else if (entry.units > 0) {
      const sold = Math.min(trade.units, entry.units);
      entry.cost -= entry.cost * (sold / entry.units);
      entry.units -= sold;
    }
    running.set(trade.symbol, entry);
  }

  const positions = new Map<string, CryptoPosition>();
  for (const [symbol, { units, cost }] of running) {
    // Units are reported raw so "sell everything" still matches on a dust remainder, but a
    // dust position is priced at nothing: cost ÷ a millionth of a coin is not an average.
    const real = units > DUST;
    positions.set(symbol, {
      units,
      costBasis: real ? Math.round(cost) : 0,
      avgPerUnit: real ? cost / units : 0,
    });
  }
  return positions;
}

/** One coin's position. Zeroed for a coin never traded — or one sold out of entirely. */
export function cryptoPosition(
  trades: Pick<
    CryptoTrade,
    "id" | "symbol" | "side" | "units" | "idr" | "occurred_on"
  >[],
  symbol: string
): CryptoPosition {
  return (
    cryptoPositions(trades.filter((t) => t.symbol === symbol)).get(symbol) ??
    NO_POSITION
  );
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

  // Only the disposal side is aggregated. What a coin cost is never a sum of buys — it is
  // the walk in `cryptoPositions`, which takes cost back out as units leave.
  interface Agg {
    proceeds: number;
    realizedPl: number;
  }

  const agg = new Map<string, Agg>();
  const of = (symbol: string): Agg => {
    let entry = agg.get(symbol);
    if (!entry) {
      entry = { proceeds: 0, realizedPl: 0 };
      agg.set(symbol, entry);
    }
    return entry;
  };

  for (const trade of trades) {
    // Every traded coin gets a row, buys included, so a never-sold holding still appears.
    const entry = of(trade.symbol);
    if (trade.side === "sell") {
      entry.proceeds += trade.idr;
      entry.realizedPl += trade.realized_pl ?? 0;
    }
  }

  const lifetimeRealizedPl = [...agg.values()].reduce(
    (sum, e) => sum + e.realizedPl,
    0
  );

  // Only coins still held show as holdings; the rest survive in the lifetime figures.
  // Units and cost come from the walk: a sum of buys is what was *ever* put in, which cannot
  // price what is left over once some of it has been sold.
  const positions = cryptoPositions(trades);
  const held = [...agg.entries()]
    .map(([symbol, entry]) => ({
      symbol,
      entry,
      position: positions.get(symbol) ?? NO_POSITION,
    }))
    .filter((row) => row.position.units > DUST);

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

  const holdings: CryptoHolding[] = held.map(({ symbol, entry, position }) => {
    const { units, costBasis, avgPerUnit } = position;
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

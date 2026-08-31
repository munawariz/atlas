import "server-only";

import { cache } from "react";
import { supabaseServer, isMissingTable } from "./supabaseServer";

/**
 * Stocks. Quantity is in LOTS; 1 lot = 100 shares (IDX market convention).
 *
 * Cost basis is average cost, per lot, walked chronologically — see `stockPositions`.
 */

export const LOT_SIZE = 100;

/**
 * Yahoo's market suffix. `.JK` is Jakarta / IDX, which is what an IDR portfolio implies.
 * Exported as a constant rather than inlined so another market is a one-line change.
 */
export const EXCHANGE_SUFFIX = ".JK";

export interface StockTrade {
  id: number;
  ticker: string;
  side: "buy" | "sell";
  lots: number;
  idr: number;
  occurred_on: string;
  /** A pre-existing holding: it establishes cost basis but books no money movement. */
  opening: boolean;
  wallet_id: number | null;
  txn_id: number | null;
  pl_txn_id: number | null;
  realized_pl: number | null;
}

export interface StockTarget {
  id: number;
  ticker: string;
  lots: number;
  /** Speculative price per share, used for cashflow estimates. */
  price: number | null;
  effective_from: string;
}

export interface StockTargetMonth {
  id: number;
  ticker: string;
  month: string;
  lots: number;
  price: number | null;
}

export interface MonthStockTarget {
  ticker: string;
  lots: number;
  price: number | null;
  /** Where the winning number came from, so the UI can offer "revert to base". */
  source: "month" | "base";
  /** Whether a base rule exists at all — reverting is meaningless without one. */
  hasBase: boolean;
}

export interface StockDividend {
  id: number;
  ticker: string;
  idr: number;
  occurred_on: string;
  wallet_id: number | null;
  txn_id: number | null;
  note: string | null;
}

export interface StockHolding {
  ticker: string;
  lots: number;
  /** Money still tied up in the lots held now. */
  costBasis: number;
  avgPerLot: number;
  avgPerShare: number;
  price: number | null;
  value: number | null;
  unrealizedPl: number | null;
  /** Every rupiah ever put in, including lots since sold. */
  invested: number;
  proceeds: number;
  realizedPl: number;
  dividends: number;
}

export interface StockPortfolio {
  holdings: StockHolding[];
  /** Market value of the tickers that HAVE a live price. */
  pricedValue: number;
  /** Cost basis of those same tickers — the matching denominator. */
  pricedCost: number;
  unrealizedPl: number;
  totalCost: number;
  lifetimeRealizedPl: number;
  totalDividends: number;
  /** Tickers with no live price. Excluded from pricedValue/pricedCost entirely. */
  missing: string[];
}

// =============================================================================
// Queries
// =============================================================================

// Both trade readers fetch the WHOLE table once per request and apply `asOf` in JS.
// A single render used to hit stock_trades up to three times (page + getStockPortfolio +
// getAverageBuyPerLot, each with a different asOf); the tables are personal-scale, so one
// fetch shared via cache() beats three filtered queries. `occurred_on` is YYYY-MM-DD, so the
// string compare is the same `lte` PostgREST applied.

const getAllStockTrades = cache(async (): Promise<StockTrade[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("stock_trades")
    .select("*")
    .order("occurred_on", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []) as StockTrade[];
});

export async function getStockTrades(asOf?: string): Promise<StockTrade[]> {
  const all = await getAllStockTrades();
  return asOf ? all.filter((t) => t.occurred_on <= asOf) : all;
}

const getAllStockDividends = cache(async (): Promise<StockDividend[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("stock_dividends")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []) as StockDividend[];
});

export async function getStockDividends(asOf?: string): Promise<StockDividend[]> {
  const all = await getAllStockDividends();
  return asOf ? all.filter((d) => d.occurred_on <= asOf) : all;
}

export async function getStockTargets(): Promise<StockTarget[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("stock_targets")
    .select("*")
    .order("effective_from", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []) as StockTarget[];
}

/**
 * The winning buy target per ticker for a month — the same "override beats recurring rule"
 * shape as budgets (ATLAS.md §3.4).
 *
 * Base rules are ordered ASCENDING by `effective_from` so the last Map write is the latest
 * applicable rule; a per-month row then wins outright.
 */
export async function getStockTargetsForMonth(
  monthKey: string
): Promise<MonthStockTarget[]> {
  const sb = supabaseServer();

  const { data: bases, error: baseError } = await sb
    .from("stock_targets")
    .select("ticker, lots, price, effective_from")
    .lte("effective_from", monthKey)
    .order("effective_from", { ascending: true });
  if (baseError && !isMissingTable(baseError)) throw baseError;

  const resolved = new Map<string, MonthStockTarget>();
  for (const base of (bases ?? []) as {
    ticker: string;
    lots: number;
    price: number | null;
  }[]) {
    resolved.set(base.ticker, {
      ticker: base.ticker,
      lots: Number(base.lots),
      price: base.price == null ? null : Number(base.price),
      source: "base",
      hasBase: true,
    });
  }

  const { data: months, error: monthError } = await sb
    .from("stock_target_months")
    .select("ticker, lots, price")
    .eq("month", monthKey);
  if (monthError && !isMissingTable(monthError)) throw monthError;

  for (const row of (months ?? []) as {
    ticker: string;
    lots: number;
    price: number | null;
  }[]) {
    resolved.set(row.ticker, {
      ticker: row.ticker,
      lots: Number(row.lots),
      price: row.price == null ? null : Number(row.price),
      source: "month",
      hasBase: resolved.get(row.ticker)?.hasBase ?? false,
    });
  }

  return [...resolved.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
}

// =============================================================================
// Live prices
// =============================================================================

/**
 * Last traded price for a ticker, or null.
 *
 * NEVER throws. A price is a nicety — a dead network or a delisted symbol must not take the
 * portfolio page down, and every caller treats null as "unpriced" and excludes it from P/L.
 */
export async function getLiveStockPrice(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker + EXCHANGE_SUFFIX
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

// =============================================================================
// Portfolio
// =============================================================================

export interface StockPosition {
  /** Lots still held. */
  lots: number;
  /** What those lots cost — the money still tied up in them. */
  costBasis: number;
  avgPerLot: number;
}

const NO_POSITION: StockPosition = { lots: 0, costBasis: 0, avgPerLot: 0 };

/**
 * Lots held and what they cost, per ticker — PURE, so the sell path can price a disposal off
 * the same numbers the portfolio shows without a second query.
 *
 * A chronological walk, the same one `forexAvgCost` does: a buy adds lots and cost, a sell
 * removes cost in PROPORTION to the lots it takes. That proportionality is what makes it
 * average cost rather than FIFO — and it is why selling out empties the position, so the next
 * buy starts its average from scratch.
 *
 * Dividing every rupiah ever spent by every lot ever bought does not: it keeps sold lots in
 * the denominator, so a ticker bought at 1m, sold in full, then bought again at 2m reports an
 * average of 1.5m against a position that cost 2m. Closed positions must leave no residue.
 *
 * A sell with nothing behind it — a disposal mis-dated before its buy — is skipped rather
 * than driven negative, the same tolerance `forexAvgCost` applies.
 */
export function stockPositions(
  trades: Pick<
    StockTrade,
    "id" | "ticker" | "side" | "lots" | "idr" | "occurred_on"
  >[]
): Map<string, StockPosition> {
  const ordered = [...trades].sort((a, b) =>
    a.occurred_on === b.occurred_on
      ? a.id - b.id
      : a.occurred_on < b.occurred_on
        ? -1
        : 1
  );

  const running = new Map<string, { lots: number; cost: number }>();
  for (const trade of ordered) {
    const entry = running.get(trade.ticker) ?? { lots: 0, cost: 0 };
    if (trade.side === "buy") {
      entry.lots += trade.lots;
      entry.cost += trade.idr;
    } else if (entry.lots > 0) {
      const sold = Math.min(trade.lots, entry.lots);
      entry.cost -= entry.cost * (sold / entry.lots);
      entry.lots -= sold;
    }
    running.set(trade.ticker, entry);
  }

  const positions = new Map<string, StockPosition>();
  for (const [ticker, { lots, cost }] of running) {
    positions.set(ticker, {
      lots,
      costBasis: lots > 0 ? Math.round(cost) : 0,
      avgPerLot: lots > 0 ? cost / lots : 0,
    });
  }
  return positions;
}

/** One ticker's position. Zeroed for a ticker never traded — or one sold out of entirely. */
export function stockPosition(
  trades: Pick<
    StockTrade,
    "id" | "ticker" | "side" | "lots" | "idr" | "occurred_on"
  >[],
  ticker: string
): StockPosition {
  return (
    stockPositions(trades.filter((t) => t.ticker === ticker)).get(ticker) ??
    NO_POSITION
  );
}

/**
 * Aggregate holdings per ticker.
 *
 * `livePrices=false` for past-year snapshots, where a today price would be wrong.
 *
 * Unpriced tickers are excluded from BOTH pricedValue and pricedCost (ATLAS.md §14.11), so the
 * unrealized percentage is never computed against a partial denominator.
 */
export async function getStockPortfolio(
  asOf?: string,
  livePrices = true
): Promise<StockPortfolio> {
  const [trades, dividends] = await Promise.all([
    getStockTrades(asOf),
    getStockDividends(asOf),
  ]);

  interface Agg {
    buyLots: number;
    buyIdr: number;
    sellLots: number;
    proceeds: number;
    realizedPl: number;
    dividends: number;
  }

  const agg = new Map<string, Agg>();
  const of = (ticker: string): Agg => {
    let entry = agg.get(ticker);
    if (!entry) {
      entry = {
        buyLots: 0,
        buyIdr: 0,
        sellLots: 0,
        proceeds: 0,
        realizedPl: 0,
        dividends: 0,
      };
      agg.set(ticker, entry);
    }
    return entry;
  };

  for (const trade of trades) {
    const entry = of(trade.ticker);
    if (trade.side === "buy") {
      entry.buyLots += trade.lots;
      entry.buyIdr += trade.idr;
    } else {
      entry.sellLots += trade.lots;
      entry.proceeds += trade.idr;
      entry.realizedPl += trade.realized_pl ?? 0;
    }
  }

  for (const dividend of dividends) {
    of(dividend.ticker).dividends += dividend.idr;
  }

  const lifetimeRealizedPl = [...agg.values()].reduce(
    (sum, e) => sum + e.realizedPl,
    0
  );
  const totalDividends = [...agg.values()].reduce(
    (sum, e) => sum + e.dividends,
    0
  );

  // Only tickers still held show as holdings; the rest survive in the lifetime figures.
  // Lots and cost come from the walk, not from the buy/sell totals: those totals are what
  // `invested` and `proceeds` mean, and they cannot price what is left over.
  const positions = stockPositions(trades);
  const held = [...agg.entries()]
    .map(([ticker, entry]) => ({
      ticker,
      entry,
      position: positions.get(ticker) ?? NO_POSITION,
    }))
    .filter((row) => row.position.lots > 0);

  const prices = new Map<string, number | null>();
  if (livePrices) {
    // In parallel: a ten-ticker portfolio should cost one round trip, not ten.
    const results = await Promise.all(
      held.map(async (row) => [row.ticker, await getLiveStockPrice(row.ticker)] as const)
    );
    for (const [ticker, price] of results) prices.set(ticker, price);
  }

  const holdings: StockHolding[] = held.map(({ ticker, entry, position }) => {
    const { lots, costBasis, avgPerLot } = position;
    const price = prices.get(ticker) ?? null;
    const value = price == null ? null : Math.round(lots * LOT_SIZE * price);

    return {
      ticker,
      lots,
      costBasis,
      avgPerLot: Math.round(avgPerLot),
      avgPerShare: avgPerLot / LOT_SIZE,
      price,
      value,
      unrealizedPl: value == null ? null : value - costBasis,
      invested: entry.buyIdr,
      proceeds: entry.proceeds,
      realizedPl: entry.realizedPl,
      dividends: entry.dividends,
    };
  });

  holdings.sort((a, b) => (b.value ?? b.costBasis) - (a.value ?? a.costBasis));

  let pricedValue = 0;
  let pricedCost = 0;
  const missing: string[] = [];

  for (const holding of holdings) {
    if (holding.value == null) {
      missing.push(holding.ticker);
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
    totalDividends,
    missing,
  };
}

/**
 * Average buy price per lot across ALL TIME, per ticker — sold lots included.
 *
 * Deliberately not `stockPositions`: this prices a buy target, and a target is usually set on
 * a ticker that is not held yet or was sold out of, where a current-position average is zero
 * and prices nothing. It is a fallback estimate, never a cost basis.
 */
export async function getAverageBuyPerLot(): Promise<Map<string, number>> {
  const trades = await getStockTrades();
  const totals = new Map<string, { lots: number; idr: number }>();

  for (const trade of trades) {
    if (trade.side !== "buy") continue;
    const entry = totals.get(trade.ticker) ?? { lots: 0, idr: 0 };
    entry.lots += trade.lots;
    entry.idr += trade.idr;
    totals.set(trade.ticker, entry);
  }

  const averages = new Map<string, number>();
  for (const [ticker, entry] of totals) {
    if (entry.lots > 0) averages.set(ticker, Math.round(entry.idr / entry.lots));
  }
  return averages;
}

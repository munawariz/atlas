import "server-only";
import { supabaseServer } from "./supabaseServer";

export interface StockTrade {
  id: number;
  ticker: string;
  side: "buy" | "sell";
  lots: number;
  idr: number;
  occurred_on: string;
  opening: boolean;
  wallet_id: number | null;
  txn_id: number | null;
  pl_txn_id: number | null;
  realized_pl: number | null; // proceeds − cost basis (sells only)
}

export async function getStockTrades(): Promise<StockTrade[]> {
  const { data, error } = await supabaseServer()
    .from("stock_trades")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false });
  if (error && error.code !== "42P01") throw error; // tolerate table not migrated yet
  return (data ?? []) as StockTrade[];
}

/** Live price per share from Yahoo Finance for an IDX ticker (TICKER.JK). null on failure. */
export async function getLiveStockPrice(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.JK?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 600 } } // 10-min cache
    );
    if (!res.ok) return null;
    const j = await res.json();
    const price = j?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" && price > 0 ? price : null;
  } catch {
    return null;
  }
}

export interface StockHolding {
  ticker: string;
  lots: number; // current lots held (1 lot = 100 shares)
  avgPerShare: number; // average cost per share
  cost: number; // cost basis of the current holding
  price: number | null; // live market price per share
  value: number | null; // current market value
  pl: number | null; // unrealized profit/loss
  plPct: number | null;
}

export interface StockPortfolio {
  holdings: StockHolding[];
  totalCost: number; // cost of all current holdings
  pricedValue: number; // market value of holdings that have a live price
  pricedCost: number; // cost of those same holdings
  totalPL: number; // pricedValue − pricedCost
  missing: string[]; // tickers with no live price
}

/** Build the current portfolio from trades + live prices (1 lot = 100 shares). */
export async function getStockPortfolio(): Promise<StockPortfolio> {
  const trades = await getStockTrades();

  const agg = new Map<string, { buyLots: number; buyIdr: number; sellLots: number; sellIdr: number }>();
  for (const t of trades) {
    const k = t.ticker.toUpperCase();
    const a = agg.get(k) ?? { buyLots: 0, buyIdr: 0, sellLots: 0, sellIdr: 0 };
    if (t.side === "buy") {
      a.buyLots += t.lots;
      a.buyIdr += t.idr;
    } else {
      a.sellLots += t.lots;
      a.sellIdr += t.idr;
    }
    agg.set(k, a);
  }

  const open = [...agg.entries()]
    .map(([ticker, a]) => ({ ticker, lots: a.buyLots - a.sellLots, avgPerLot: a.buyLots ? a.buyIdr / a.buyLots : 0 }))
    .filter((h) => h.lots > 0);

  // Live prices in parallel (each is cached server-side).
  const prices = new Map<string, number | null>();
  await Promise.all(open.map(async (h) => prices.set(h.ticker, await getLiveStockPrice(h.ticker))));

  const holdings: StockHolding[] = open.map((h) => {
    const cost = Math.round(h.lots * h.avgPerLot);
    const price = prices.get(h.ticker) ?? null;
    const value = price != null ? Math.round(h.lots * 100 * price) : null;
    const pl = value != null ? value - cost : null;
    return {
      ticker: h.ticker,
      lots: h.lots,
      avgPerShare: h.avgPerLot / 100,
      cost,
      price,
      value,
      pl,
      plPct: pl != null && cost ? (pl / cost) * 100 : null,
    };
  });
  holdings.sort((a, b) => (b.value ?? b.cost) - (a.value ?? a.cost));

  const totalCost = holdings.reduce((s, h) => s + h.cost, 0);
  const priced = holdings.filter((h) => h.value != null);
  const pricedValue = priced.reduce((s, h) => s + (h.value ?? 0), 0);
  const pricedCost = priced.reduce((s, h) => s + h.cost, 0);

  return {
    holdings,
    totalCost,
    pricedValue,
    pricedCost,
    totalPL: pricedValue - pricedCost,
    missing: holdings.filter((h) => h.value == null).map((h) => h.ticker),
  };
}

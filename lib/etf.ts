import "server-only";

import { cache } from "react";
import { supabaseServer, isMissingTable } from "./supabaseServer";
import { getForexRate } from "./forex";

/**
 * ETFs held at a US-market broker.
 *
 * Each broker (`etf_accounts`) keeps its own USD cash. Everything inside a broker is in USD,
 * and the IDR ledger only sees money crossing the border:
 *
 *   top-up   — rupiah leaves a wallet as an `investment` into the ETF bucket; USD cash grows
 *   withdraw — USD cash shrinks; its rupiah cost comes back out of the bucket plus a P/L row
 *   buy      — USD cash → holding          (no ledger rows)
 *   sell     — holding → USD cash          (no ledger rows; USD P/L shown on the page)
 *   dividend — USD cash grows, recorded as USD income (no ledger rows)
 *
 * A dividend deliberately books no IDR income: it stays in USD at the broker, and because it
 * enters the cash pool at ZERO rupiah cost, converting it back to IDR later books it as profit
 * on the withdrawal. Booking it as income here as well would count it twice.
 *
 * Two costs are walked side by side, both average cost (ATLAS.md §3.5):
 *   - USD cost per holding, for the USD P/L the broker itself would show;
 *   - rupiah cost of every dollar, cash and holdings alike, so a withdrawal takes back exactly
 *     the rupiah that dollar cost — never more than was put in. The sum of the rupiah costs is
 *     what the ETF bucket holds in the ledger.
 */

/** Fractional shares never land on a clean zero after a round trip through numeric. */
export const DUST = 1e-8;
/** Half a cent: USD comparisons tolerate rounding, not real money. */
export const CENT = 0.005;

export const QUOTE_CURRENCY = "USD";

export type EtfSide = "topup" | "withdraw" | "buy" | "sell" | "dividend";

export interface EtfAccount {
  id: number;
  name: string;
  sort_order: number;
}

export interface EtfTrade {
  id: number;
  account_id: number;
  side: EtfSide;
  ticker: string | null;
  units: number | null;
  usd: number;
  idr: number | null;
  rate: number | null;
  /** Topup / withdraw only: optional rupiah conversion fee and tax, each its own expense row. */
  fee: number | null;
  tax: number | null;
  occurred_on: string;
  wallet_id: number | null;
  txn_id: number | null;
  pl_txn_id: number | null;
  fee_txn_id: number | null;
  tax_txn_id: number | null;
  realized_pl: number | null;
}

// =============================================================================
// Queries
// =============================================================================

export const getEtfAccounts = cache(async (): Promise<EtfAccount[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("etf_accounts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    name: String(row.name),
    sort_order: Number(row.sort_order ?? 0),
  }));
});

const num = (v: unknown) => (v == null ? null : Number(v));

// One fetch per request; `asOf` filters in JS, as the crypto module does.
const getAllEtfTrades = cache(async (): Promise<EtfTrade[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("etf_trades")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }

  // `units`, `usd` and `rate` are numeric, which the client returns as strings (ATLAS.md §14.5).
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    account_id: Number(row.account_id),
    side: row.side as EtfSide,
    ticker: row.ticker == null ? null : String(row.ticker),
    units: num(row.units),
    usd: Number(row.usd ?? 0),
    idr: num(row.idr),
    rate: num(row.rate),
    fee: num(row.fee),
    tax: num(row.tax),
    occurred_on: String(row.occurred_on),
    wallet_id: num(row.wallet_id),
    txn_id: num(row.txn_id),
    pl_txn_id: num(row.pl_txn_id),
    fee_txn_id: num(row.fee_txn_id),
    tax_txn_id: num(row.tax_txn_id),
    realized_pl: num(row.realized_pl),
  }));
});

/** Newest first. */
export async function getEtfTrades(asOf?: string): Promise<EtfTrade[]> {
  const all = await getAllEtfTrades();
  return asOf ? all.filter((t) => t.occurred_on <= asOf) : all;
}

// =============================================================================
// The walk
// =============================================================================

export interface EtfPosition {
  ticker: string;
  /** Raw units — may be dust rather than a clean zero; compare against `DUST`. */
  units: number;
  costUsd: number;
  avgUsd: number;
  /** Rupiah cost of the dollars that bought these units. */
  costIdr: number;
  proceedsUsd: number;
  realizedUsd: number;
  dividendsUsd: number;
}

export interface EtfBook {
  cashUsd: number;
  /** Rupiah cost of the USD cash on hand. */
  cashIdr: number;
  positions: Map<string, EtfPosition>;
  /** Realized rupiah P/L from converting USD back to IDR, as booked. */
  realizedIdr: number;
  dividendsUsd: number;
  /** Conversion fees and tax paid on top-ups and withdrawals. Expenses — never cost basis. */
  feesIdr: number;
}

/**
 * The fraction of the cash pool's rupiah cost that `usd` takes with it. Spending the last cent
 * takes the whole cost, so a rounding remainder never strands rupiah behind.
 */
function cashShare(cashUsd: number, usd: number): number {
  if (cashUsd <= 0) return 0;
  return usd >= cashUsd - CENT ? 1 : usd / cashUsd;
}

/** Rupiah cost a `usd` withdrawal takes out of the bucket — the same share `etfBook` draws. */
export function withdrawalCost(book: EtfBook, usd: number): number {
  return Math.round(book.cashIdr * cashShare(book.cashUsd, usd));
}

type WalkTrade = Pick<
  EtfTrade,
  | "id"
  | "side"
  | "ticker"
  | "units"
  | "usd"
  | "idr"
  | "fee"
  | "tax"
  | "occurred_on"
  | "realized_pl"
>;

/**
 * One broker's cash and positions, walked chronologically. Pure, so the trade action checks
 * a buy or a withdrawal against the same numbers the page shows.
 *
 * Every USD move carries its rupiah cost with it: a buy takes the average rupiah cost of the
 * cash it spends into the holding, a sell brings the holding's rupiah cost back into cash in
 * proportion to the units sold. Rupiah cost is therefore conserved inside the broker and only
 * leaves through a withdrawal — mirroring the ETF bucket in the ledger.
 */
export function etfBook(trades: WalkTrade[]): EtfBook {
  const ordered = [...trades].sort((a, b) =>
    a.occurred_on === b.occurred_on
      ? a.id - b.id
      : a.occurred_on < b.occurred_on
        ? -1
        : 1
  );

  const book: EtfBook = {
    cashUsd: 0,
    cashIdr: 0,
    positions: new Map(),
    realizedIdr: 0,
    dividendsUsd: 0,
    feesIdr: 0,
  };

  const position = (ticker: string): EtfPosition => {
    let p = book.positions.get(ticker);
    if (!p) {
      p = {
        ticker,
        units: 0,
        costUsd: 0,
        avgUsd: 0,
        costIdr: 0,
        proceedsUsd: 0,
        realizedUsd: 0,
        dividendsUsd: 0,
      };
      book.positions.set(ticker, p);
    }
    return p;
  };

  // Take `usd` out of the cash pool and return the rupiah cost that leaves with it.
  const drawCash = (usd: number): number => {
    const idr = book.cashIdr * cashShare(book.cashUsd, usd);
    book.cashUsd -= usd;
    book.cashIdr -= idr;
    if (Math.abs(book.cashUsd) < CENT) book.cashUsd = 0;
    return idr;
  };

  for (const trade of ordered) {
    book.feesIdr += (trade.fee ?? 0) + (trade.tax ?? 0);

    switch (trade.side) {
      case "topup":
        book.cashUsd += trade.usd;
        book.cashIdr += trade.idr ?? 0;
        break;

      case "withdraw":
        drawCash(trade.usd);
        book.realizedIdr += trade.realized_pl ?? 0;
        break;

      case "buy": {
        if (!trade.ticker) break;
        const p = position(trade.ticker);
        p.costIdr += drawCash(trade.usd);
        p.units += trade.units ?? 0;
        p.costUsd += trade.usd;
        break;
      }

      case "sell": {
        if (!trade.ticker) break;
        const p = position(trade.ticker);
        const sold = Math.min(trade.units ?? 0, p.units);
        let outUsd = 0;
        let outIdr = 0;
        if (p.units > 0) {
          const share = p.units - sold <= DUST ? 1 : sold / p.units;
          outUsd = p.costUsd * share;
          outIdr = p.costIdr * share;
          p.costUsd -= outUsd;
          p.costIdr -= outIdr;
          p.units -= sold;
        }
        p.proceedsUsd += trade.usd;
        p.realizedUsd += trade.usd - outUsd;
        book.cashUsd += trade.usd;
        book.cashIdr += outIdr;
        break;
      }

      case "dividend":
        if (trade.ticker) position(trade.ticker).dividendsUsd += trade.usd;
        book.dividendsUsd += trade.usd;
        // Zero rupiah cost: a dividend is pure gain, recognised when it is converted back.
        book.cashUsd += trade.usd;
        break;
    }
  }

  for (const p of book.positions.values()) {
    p.avgUsd = p.units > DUST ? p.costUsd / p.units : 0;
  }

  return book;
}

// =============================================================================
// Live prices
// =============================================================================

/**
 * Last traded price of a US-listed ETF, in USD, or null.
 *
 * US listings quote on Yahoo under the bare ticker (VOO, QQQ), so no suffix. NEVER throws, for
 * the reason `getLiveStockPrice` doesn't.
 */
export async function getLiveEtfPriceUsd(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker
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

export interface EtfHolding extends EtfPosition {
  priceUsd: number | null;
  valueUsd: number | null;
  unrealizedUsd: number | null;
}

export interface EtfBroker {
  account: EtfAccount;
  cashUsd: number;
  /** Rupiah cost of that cash. */
  cashIdr: number;
  holdings: EtfHolding[];
  /** Tickers sold out of entirely — kept so their P/L and dividends stay visible. */
  closed: EtfPosition[];
  /** Cash plus every PRICED holding. */
  valueUsd: number;
  /** Rupiah still tied up at this broker — its share of the ETF bucket. */
  costIdr: number;
  realizedUsd: number;
  realizedIdr: number;
  dividendsUsd: number;
  feesIdr: number;
}

export interface EtfPortfolio {
  brokers: EtfBroker[];
  /** Live IDR per USD; 0 when the rate source is down or prices are off. Reference only. */
  rate: number;
  cashUsd: number;
  /** Market value of the holdings that HAVE a live price. */
  pricedValueUsd: number;
  /** USD cost of those same holdings — the matching denominator. */
  pricedCostUsd: number;
  unrealizedUsd: number;
  /** Cash + priced holdings. */
  totalValueUsd: number;
  /** Rupiah still invested across every broker. */
  costIdr: number;
  realizedUsd: number;
  realizedIdr: number;
  dividendsUsd: number;
  /** Conversion fees and tax, in rupiah. */
  feesIdr: number;
  /** Tickers with no live price. Excluded from value and P/L, as stocks and crypto do. */
  missing: string[];
}

/**
 * Every broker, valued in USD, with the live rupiah rate alongside for reference.
 *
 * `livePrices=false` for past-year snapshots, where a today price would be wrong.
 */
export async function getEtfPortfolio(
  asOf?: string,
  livePrices = true
): Promise<EtfPortfolio> {
  const [accounts, trades] = await Promise.all([
    getEtfAccounts(),
    getEtfTrades(asOf),
  ]);

  const books = accounts.map((account) => ({
    account,
    book: etfBook(trades.filter((t) => t.account_id === account.id)),
  }));

  const heldTickers = [
    ...new Set(
      books.flatMap(({ book }) =>
        [...book.positions.values()]
          .filter((p) => p.units > DUST)
          .map((p) => p.ticker)
      )
    ),
  ];

  // One lookup per ticker across every broker, in parallel, plus one rate.
  const [rate, priced] = await Promise.all([
    livePrices ? getForexRate(QUOTE_CURRENCY) : Promise.resolve(0),
    livePrices
      ? Promise.all(
          heldTickers.map(
            async (ticker) => [ticker, await getLiveEtfPriceUsd(ticker)] as const
          )
        )
      : Promise.resolve([] as (readonly [string, number | null])[]),
  ]);
  const prices = new Map<string, number | null>(priced);

  const missing = new Set<string>();
  let pricedValueUsd = 0;
  let pricedCostUsd = 0;

  const brokers: EtfBroker[] = books.map(({ account, book }) => {
    const positions = [...book.positions.values()];
    const holdings: EtfHolding[] = positions
      .filter((p) => p.units > DUST)
      .map((p) => {
        const priceUsd = prices.get(p.ticker) ?? null;
        const valueUsd = priceUsd === null ? null : p.units * priceUsd;
        return {
          ...p,
          priceUsd,
          valueUsd,
          unrealizedUsd: valueUsd === null ? null : valueUsd - p.costUsd,
        };
      })
      .sort((a, b) => (b.valueUsd ?? b.costUsd) - (a.valueUsd ?? a.costUsd));

    let valueUsd = book.cashUsd;
    for (const h of holdings) {
      if (h.valueUsd === null) {
        missing.add(h.ticker);
        continue;
      }
      valueUsd += h.valueUsd;
      pricedValueUsd += h.valueUsd;
      pricedCostUsd += h.costUsd;
    }

    return {
      account,
      cashUsd: book.cashUsd,
      cashIdr: Math.round(book.cashIdr),
      holdings,
      closed: positions.filter((p) => p.units <= DUST),
      valueUsd,
      costIdr: Math.round(
        book.cashIdr + holdings.reduce((sum, h) => sum + h.costIdr, 0)
      ),
      realizedUsd: positions.reduce((sum, p) => sum + p.realizedUsd, 0),
      realizedIdr: book.realizedIdr,
      dividendsUsd: book.dividendsUsd,
      feesIdr: book.feesIdr,
    };
  });

  const sum = (pick: (b: EtfBroker) => number) =>
    brokers.reduce((total, b) => total + pick(b), 0);

  return {
    brokers,
    rate,
    cashUsd: sum((b) => b.cashUsd),
    pricedValueUsd,
    pricedCostUsd,
    unrealizedUsd: pricedValueUsd - pricedCostUsd,
    totalValueUsd: sum((b) => b.valueUsd),
    costIdr: sum((b) => b.costIdr),
    realizedUsd: sum((b) => b.realizedUsd),
    realizedIdr: sum((b) => b.realizedIdr),
    dividendsUsd: sum((b) => b.dividendsUsd),
    feesIdr: sum((b) => b.feesIdr),
    missing: [...missing],
  };
}

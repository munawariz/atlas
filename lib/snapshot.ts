import "server-only";
import {
  categoryMap,
  deriveWalletBalances,
  getLoanPayments,
  getLoans,
  getPaylaterItems,
  getPaylaterPayments,
  getSavingsBuckets,
  getWallets,
  getYearTransactions,
  walletMap,
} from "./data";
import { getBondPortfolio } from "./bonds";
import { getStockPortfolio } from "./stocks";
import { getForexAccounts, getForexRate, forexUnitsAt } from "./forex";
import { todayISO } from "./format";

const span = (a: string, b: string) => {
  const [ay, am] = a.slice(0, 7).split("-").map(Number);
  const [by, bm] = b.slice(0, 7).split("-").map(Number);
  return by * 12 + bm - (ay * 12 + am) + 1;
};

export interface SnapshotTxn {
  date: string;
  type: string;
  amount: number;
  category: string;
  from: string;
  to: string;
  description: string;
}

export interface Snapshot {
  year: number;
  generatedOn: string;
  isCurrentYear: boolean;
  // that year's flows
  income: number;
  expense: number;
  saving: number;
  investment: number;
  net: number;
  // net worth (wallet cash) at year start/end
  netWorthStart: number;
  netWorth: number;
  transactions: SnapshotTxn[];
  wallets: { name: string; balance: number }[];
  savings: { name: string; kind: string; balance: number }[];
  savingsTotal: number;
  stocks: { ticker: string; lots: number; avgPerShare: number; cost: number; price: number | null; value: number | null; pl: number | null }[];
  stocksCost: number;
  stocksValue: number;
  bonds: { name: string; units: number; principal: number; coupons: number }[];
  bondsPrincipal: number;
  bondsCoupons: number;
  forex: { name: string; currency: string; units: number; rate: number; idr: number }[];
  forexTotal: number;
  loans: { person: string; installment: number; monthsLeft: number; outstanding: number }[];
  loansOutstanding: number;
  paylater: { item: string; monthly: number; monthsLeft: number; remaining: number }[];
  paylaterRemaining: number;
  trackedTotal: number;
}

/** Gather a year's financial status: that year's transactions + flows, plus holdings &
 *  balances as of the end of that year. */
export async function gatherSnapshot(year: number): Promise<Snapshot> {
  const generatedOn = todayISO();
  const isCurrentYear = year === Number(generatedOn.slice(0, 4));
  const endMonth = `${year}-12-01`; // balances at end of December that year
  const cutoff = `${year}-12-31`; // holdings up to year-end

  const [txns, cats, ws, walletList, derivedEnd, derivedStart, savings, stockP, bondP, forexAccounts, loans, loanPayments, plItems, plPayments] =
    await Promise.all([
      getYearTransactions(year),
      categoryMap(),
      walletMap(),
      getWallets(),
      deriveWalletBalances(endMonth),
      deriveWalletBalances(`${year - 1}-12-01`),
      getSavingsBuckets(cutoff),
      getStockPortfolio(cutoff, isCurrentYear),
      getBondPortfolio(cutoff),
      getForexAccounts(),
      getLoans(),
      getLoanPayments(),
      getPaylaterItems(),
      getPaylaterPayments(),
    ]);

  // Transactions sheet rows
  const transactions: SnapshotTxn[] = txns.map((t) => ({
    date: t.occurred_on.slice(0, 10),
    type: t.type,
    amount: t.amount,
    category: t.category_id ? cats.get(t.category_id)?.name ?? "" : "",
    from: t.source_wallet_id ? ws.get(t.source_wallet_id) ?? "" : "",
    to: t.dest_wallet_id ? ws.get(t.dest_wallet_id) ?? "" : "",
    description: t.description ?? "",
  }));

  const sumType = (type: string) => txns.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
  const income = sumType("income");
  const expense = sumType("expense");
  const saving = sumType("saving");
  const investment = sumType("investment");

  const wallets = walletList.map((w) => ({ name: w.name, balance: derivedEnd.get(w.id) ?? 0 }));
  const netWorth = wallets.reduce((s, w) => s + w.balance, 0);
  const netWorthStart = [...derivedStart.values()].reduce((s, v) => s + v, 0);

  const savingsRows = savings
    .filter((b) => b.balance !== 0 || b.contributed !== 0 || b.withdrawn !== 0)
    .map((b) => ({ name: b.name, kind: b.kind, balance: b.balance }));
  const savingsTotal = savingsRows.reduce((s, b) => s + b.balance, 0);

  const stocks = stockP.holdings.map((h) => ({
    ticker: h.ticker,
    lots: h.lots,
    avgPerShare: Math.round(h.avgPerShare),
    cost: h.cost,
    price: h.price,
    value: h.value,
    pl: h.pl,
  }));

  const bonds = bondP.holdings.map((h) => ({ name: h.name, units: h.units, principal: h.invested, coupons: h.coupons }));

  // Forex units as of year-end × current reference rate.
  const fxUnits = await forexUnitsAt(endMonth);
  const fxCurrencies = [...new Set(forexAccounts.map((a) => a.currency))];
  const fxRates = new Map<string, number>();
  await Promise.all(fxCurrencies.map(async (c) => fxRates.set(c, await getForexRate(c))));
  const forex = forexAccounts
    .map((a) => {
      const units = fxUnits.get(a.id) ?? a.units;
      const rate = fxRates.get(a.currency) ?? 0;
      return { name: a.name, currency: a.currency, units, rate, idr: Math.round(units * rate) };
    })
    .filter((a) => a.units !== 0);
  const forexTotal = forex.reduce((s, a) => s + a.idr, 0);

  const loanRows = loans
    .map((l) => {
      const unpaid = loanPayments.filter((p) => p.loan_id === l.id && !p.paid).length;
      return { person: l.person, installment: l.installment, monthsLeft: unpaid, outstanding: unpaid * l.installment };
    })
    .filter((l) => l.outstanding > 0);
  const loansOutstanding = loanRows.reduce((s, l) => s + l.outstanding, 0);

  const paylaterRows = plItems
    .map((p) => {
      const total = span(p.first_month_date, p.last_month_date);
      const paidCount = plPayments.filter(
        (pp) => pp.item_id === p.id && pp.month >= p.first_month_date && pp.month <= p.last_month_date
      ).length;
      const unpaid = Math.max(0, total - paidCount);
      return { item: p.item, monthly: p.monthly_amount, monthsLeft: unpaid, remaining: unpaid * p.monthly_amount };
    })
    .filter((p) => p.remaining > 0);
  const paylaterRemaining = paylaterRows.reduce((s, p) => s + p.remaining, 0);

  const trackedTotal = netWorth + savingsTotal + forexTotal + loansOutstanding - paylaterRemaining;

  return {
    year,
    generatedOn,
    isCurrentYear,
    income,
    expense,
    saving,
    investment,
    net: income - expense - saving - investment,
    netWorthStart,
    netWorth,
    transactions,
    wallets,
    savings: savingsRows,
    savingsTotal,
    stocks,
    stocksCost: stockP.totalCost,
    stocksValue: stockP.pricedValue,
    bonds,
    bondsPrincipal: bondP.totalInvested,
    bondsCoupons: bondP.totalCoupons,
    forex,
    forexTotal,
    loans: loanRows,
    loansOutstanding,
    paylater: paylaterRows,
    paylaterRemaining,
    trackedTotal,
  };
}

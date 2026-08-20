import "server-only";

import {
  deriveWalletBalances,
  getCategories,
  getLoanPayments,
  getLoans,
  getPaylaterItems,
  getPaylaterPayments,
  getSavingsBuckets,
  getWallets,
  getYearTransactions,
  monthKeyOf,
  prevMonthKey,
  sumBalances,
  type SavingsBucket,
} from "./data";
import { getBondPortfolio, type BondPortfolio } from "./bonds";
import { getCryptoPortfolio, type CryptoPortfolio } from "./crypto";
import { getStockPortfolio, type StockPortfolio } from "./stocks";
import { forexAvgCost, getForexAccounts, getForexRate, getForexTransactions } from "./forex";
import type { Category, Loan, LoanPayment, PaylaterItem, Transaction, Wallet } from "./types";

export interface ForexSnapshot {
  name: string;
  currency: string;
  units: number;
  invested: number;
  value: number;
  realizedPl: number;
  rate: number;
}

export interface Snapshot {
  year: number;
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  /** Wallet balances at the last day of the previous year and of this one. */
  startNetWorth: number;
  endNetWorth: number;
  endBalances: Map<number, number>;
  flows: { income: number; expense: number; saving: number; investment: number };
  savings: SavingsBucket[];
  savingsTotal: number;
  stocks: StockPortfolio;
  bonds: BondPortfolio;
  crypto: CryptoPortfolio;
  forex: ForexSnapshot[];
  forexTotal: number;
  loans: (Loan & { expected: number; collected: number; outstanding: number })[];
  loansOutstanding: number;
  paylater: (PaylaterItem & { paidMonths: number; totalMonths: number; remaining: number })[];
  paylaterRemaining: number;
  /** Everything the app tracks, netted into one figure. */
  trackedTotal: number;
}

function monthsBetween(first: string, last: string): number {
  const fy = parseInt(first.slice(0, 4), 10);
  const fm = parseInt(first.slice(5, 7), 10);
  const ly = parseInt(last.slice(0, 4), 10);
  const lm = parseInt(last.slice(5, 7), 10);
  return Math.max(1, (ly - fy) * 12 + (lm - fm) + 1);
}

/**
 * Everything needed to render one year as a workbook.
 *
 * Holdings are taken AS OF YEAR-END, not as of today — a 2023 snapshot must describe 2023.
 * Live stock and coin prices are therefore skipped unless the year in question is the current
 * one, where "as of year-end" and "now" are the same thing.
 */
export async function gatherSnapshot(year: number): Promise<Snapshot> {
  const cutoff = `${year}-12-31`;
  const endMonth = `${year}-12-01`;
  const isCurrentYear = year === new Date().getFullYear();

  const [
    transactions,
    categories,
    wallets,
    endBalances,
    startBalances,
    savings,
    stocks,
    bonds,
    crypto,
    forexAccounts,
    loans,
    loanPayments,
    paylaterItems,
    paylaterPayments,
  ] = await Promise.all([
    getYearTransactions(year),
    getCategories(true),
    getWallets(true),
    deriveWalletBalances(endMonth),
    deriveWalletBalances(prevMonthKey(`${year}-01-01`)),
    getSavingsBuckets(cutoff),
    getStockPortfolio(cutoff, isCurrentYear),
    getBondPortfolio(cutoff),
    getCryptoPortfolio(cutoff, isCurrentYear),
    getForexAccounts(),
    getLoans(),
    getLoanPayments(),
    getPaylaterItems(),
    getPaylaterPayments(),
  ]);

  // --- Flows --------------------------------------------------------------
  const kindOf = new Map(categories.map((c) => [c.id, c.kind]));
  const flows = { income: 0, expense: 0, saving: 0, investment: 0 };

  for (const txn of transactions) {
    if (txn.type === "transfer") continue;
    if (txn.type === "withdrawal") {
      const kind = txn.category_id != null ? kindOf.get(txn.category_id) : undefined;
      if (kind === "saving" || kind === "investment") flows[kind] -= txn.amount;
      continue;
    }
    flows[txn.type] += txn.amount;
  }

  // --- Forex, valued at year-end units ------------------------------------
  const forex: ForexSnapshot[] = await Promise.all(
    forexAccounts.map(async (account) => {
      const txns = await getForexTransactions(account.id);

      // Walk back from the current balance to what was held at the cutoff.
      let units = account.units;
      for (const txn of txns) {
        if (txn.occurred_on <= cutoff) continue;
        units += txn.direction === "buy" ? -txn.units : txn.units;
      }

      const upToCutoff = txns.filter((t) => t.occurred_on <= cutoff);
      const avgCost = forexAvgCost(upToCutoff);
      const rate = await getForexRate(account.currency);

      return {
        name: account.name,
        currency: account.currency,
        units,
        invested: Math.round(avgCost * units),
        value: Math.round(rate * units),
        realizedPl: upToCutoff.reduce((sum, t) => sum + (t.realized_pl ?? 0), 0),
        rate,
      };
    })
  );

  // --- Loans --------------------------------------------------------------
  const paymentsByLoan = new Map<number, LoanPayment[]>();
  for (const payment of loanPayments) {
    const list = paymentsByLoan.get(payment.loan_id) ?? [];
    list.push(payment);
    paymentsByLoan.set(payment.loan_id, list);
  }

  const loanRows = loans.map((loan) => {
    const schedule = paymentsByLoan.get(loan.id) ?? [];
    const expected = schedule.reduce(
      (sum, p) => sum + (p.amount ?? loan.installment),
      0
    );
    const collected = schedule
      .filter((p) => p.paid)
      .reduce((sum, p) => sum + (p.amount ?? loan.installment), 0);
    return { ...loan, expected, collected, outstanding: expected - collected };
  });

  // --- Installments -------------------------------------------------------
  const paidByItem = new Map<number, number>();
  for (const payment of paylaterPayments) {
    if (payment.month > cutoff) continue;
    paidByItem.set(payment.item_id, (paidByItem.get(payment.item_id) ?? 0) + 1);
  }

  const paylater = paylaterItems.map((item) => {
    const totalMonths = monthsBetween(item.first_month_date, item.last_month_date);
    const paidMonths = paidByItem.get(item.id) ?? 0;
    return {
      ...item,
      totalMonths,
      paidMonths,
      remaining: Math.max(0, totalMonths - paidMonths) * item.monthly_amount,
    };
  });

  const endNetWorth = sumBalances(endBalances);
  const savingsTotal = savings.reduce((sum, b) => sum + b.balance, 0);
  const forexTotal = forex.reduce((sum, f) => sum + f.value, 0);
  const loansOutstanding = loanRows.reduce((sum, l) => sum + l.outstanding, 0);
  const paylaterRemaining = paylater.reduce((sum, p) => sum + p.remaining, 0);

  return {
    year,
    transactions,
    categories,
    wallets,
    startNetWorth: sumBalances(startBalances),
    endNetWorth,
    endBalances,
    flows,
    savings,
    savingsTotal,
    stocks,
    bonds,
    crypto,
    forex,
    forexTotal,
    loans: loanRows,
    loansOutstanding,
    paylater,
    paylaterRemaining,
    // Wallets + buckets + forex + what is owed to you, less what you still owe.
    trackedTotal:
      endNetWorth +
      savingsTotal +
      forexTotal +
      loansOutstanding -
      paylaterRemaining,
  };
}

/** Convenience for the workbook's Transactions sheet. */
export function monthOf(iso: string): string {
  return monthKeyOf(iso);
}

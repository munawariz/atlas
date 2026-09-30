import "server-only";

import { supabaseServer, isMissingTable } from "./supabaseServer";
import {
  endOfMonth,
  getOpeningBalances,
  getOpeningMonth,
  getWalletTransactions,
  monthKeyOf,
  nextMonthKey,
  prevMonthKey,
} from "./data";
import type { CreditCard, Transaction } from "./types";

/**
 * Credit cards.
 *
 * A card is a wallet whose balance runs negative: a purchase is an ordinary `expense` from it,
 * booked the day you swipe, so budgets see the spend when it happens and net worth falls by
 * what you owe. Paying the bill is a `transfer` into the card — not spending, which was already
 * counted — and interest or fees are `expense`s charged to it.
 *
 * Nothing about a bill is stored. Every figure here is derived from the card wallet's ledger
 * rows and the card's terms, so editing or deleting a purchase in History reprices every bill it
 * falls in. Interest and fees the bank adds to a statement are ESTIMATED until the user records
 * the bank's figure; until then the estimate is counted into the bill, so the bill reads like
 * the statement does.
 */

/** Bank Indonesia's cap on a late fee: 1% of the bill, and never more than Rp100,000. */
export const LATE_FEE_PCT = 1;
export const LATE_FEE_CAP = 100_000;

// =============================================================================
// Dates — pure YYYY-MM-DD arithmetic in UTC, so nothing drifts by a timezone.
// =============================================================================

const DAY_MS = 86_400_000;

function utc(iso: string): number {
  const [y, m, d] = iso.split("-").map((p) => parseInt(p, 10));
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / DAY_MS);
}

function addDays(iso: string, n: number): string {
  return new Date(utc(iso) + n * DAY_MS).toISOString().slice(0, 10);
}

/** `day` of a month, clamped to its length — a statement on the 31st prints on 28 Feb. */
function dayIn(monthKey: string, day: number): string {
  const last = parseInt(endOfMonth(monthKey).slice(8), 10);
  return `${monthKey.slice(0, 7)}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

/** The statement date falling in a month. */
export function closingIn(card: Pick<CreditCard, "statement_day">, monthKey: string): string {
  return dayIn(monthKey, card.statement_day);
}

/** The most recent statement date on or before `today`. */
export function latestClosing(card: Pick<CreditCard, "statement_day">, today: string): string {
  const here = closingIn(card, monthKeyOf(today));
  return here <= today ? here : closingIn(card, prevMonthKey(monthKeyOf(today)));
}

/** A bill's due date: the first `due_day` after its statement date. */
export function dueFor(card: Pick<CreditCard, "due_day">, closing: string): string {
  const month = monthKeyOf(closing);
  const same = dayIn(month, card.due_day);
  return same > closing ? same : dayIn(nextMonthKey(month), card.due_day);
}

// =============================================================================
// The money
// =============================================================================

/**
 * The minimum payment on a statement, as Indonesian issuers word it: the highest of
 *  - `min_pct` of the statement,
 *  - the statement's interest and fees (only when `min_covers_charges`, as Honest does),
 *  - `min_floor`,
 * with any past-due minimum and over-limit amount added to the first two — and never more than
 * the statement itself, so a small one is simply due in full.
 *
 * Honest's own examples: Rp1,000,000 with a Rp44,000 admin fee → Rp50,000; Rp120,000 with a
 * Rp30,000 admin fee → Rp30,000; Rp20,000 → Rp20,000.
 */
export function minimumFor(
  card: Pick<CreditCard, "min_pct" | "min_floor" | "min_covers_charges">,
  statement: number,
  charges = 0,
  extra = 0
): number {
  if (statement <= 0) return 0;
  const byPct = Math.round((statement * card.min_pct) / 100) + extra;
  const byCharges = card.min_covers_charges ? charges + extra : 0;
  return Math.min(statement, Math.max(byPct, byCharges, card.min_floor));
}

/** One ledger row as it moves what is owed: positive = charged, negative = paid or refunded. */
export interface CardMove {
  date: string;
  owed: number;
  txn: Transaction;
}

/** The categories interest and fees are recorded under — `cat_card_interest` / `cat_card_fee`. */
export interface ChargeCategories {
  interest: number | null;
  fee: number | null;
}

function isInterest(move: CardMove, cats: ChargeCategories): boolean {
  return move.owed > 0 && cats.interest != null && move.txn.category_id === cats.interest;
}
function isFee(move: CardMove, cats: ChargeCategories): boolean {
  return move.owed > 0 && cats.fee != null && move.txn.category_id === cats.fee;
}

/**
 * The card wallet's rows, oldest first, as changes to what is owed.
 *
 * This is the balance rule (ATLAS.md §3.3, `bumpWallet`) read from the card's side with the
 * sign flipped: money leaving the wallet is money owed, money arriving pays it down.
 */
export function cardMoves(walletId: number, txns: Transaction[]): CardMove[] {
  const moves: CardMove[] = [];
  for (const txn of txns) {
    let owed = 0;
    if (txn.type === "income" || txn.type === "withdrawal") {
      if (txn.dest_wallet_id === walletId) owed -= txn.amount;
    } else if (txn.type === "transfer") {
      if (txn.source_wallet_id === walletId) owed += txn.amount;
      if (txn.dest_wallet_id === walletId) owed -= txn.amount;
    } else if (txn.source_wallet_id === walletId) {
      // expense, saving, investment
      owed += txn.amount;
    }
    if (owed !== 0) moves.push({ date: txn.occurred_on, owed, txn });
  }
  return moves.sort((a, b) => a.date.localeCompare(b.date) || a.txn.id - b.txn.id);
}

/**
 * - `clear`   nothing was owed on the statement date;
 * - `full`    paid in full by the due date — no interest, and any admin fee comes back;
 * - `minimum` the minimum is in, the rest is not: interest runs;
 * - `due`     not yet paid down to the minimum, and the due date has not passed;
 * - `missed`  the due date passed short of the minimum.
 */
export type BillStatus = "clear" | "full" | "minimum" | "due" | "missed";

export interface CardBill {
  /** The previous statement date. This bill covers (opened, closing]. */
  opened: string;
  closing: string;
  due: string;
  nextClosing: string;
  /** The statement: owed at the end of the statement date, estimated charges included. */
  balance: number;
  /** The part of it that is spending rather than interest and fees — what an admin fee is on. */
  principal: number;
  /** Interest on this statement — recorded, or the app's estimate. */
  interest: number;
  /** True while `interest` is an estimate (nothing recorded in the cycle yet). */
  interestEstimated: boolean;
  /** Fees on this statement — the admin fee and any late fee — recorded, or estimated. */
  fees: number;
  feesEstimated: boolean;
  /** The admin fee part of `fees`, refunded when this bill is paid in full on time. */
  adminFee: number;
  /** An earlier minimum left unpaid, and anything over the limit — both added to the minimum. */
  pastDue: number;
  overLimit: number;
  minimum: number;
  /** New spending within the cycle. */
  charged: number;
  /** Payments and refunds from the day after the statement through the due date. */
  paidByDue: number;
  /** The same through the next statement — a late payment still lowers what is left. */
  paid: number;
  status: BillStatus;
}

/** The late fee a bill that missed its minimum brings onto the next one. */
export function lateFeeFor(card: CreditCard, bill: CardBill): number {
  if (!card.late_fee || bill.status !== "missed") return 0;
  return Math.min(LATE_FEE_CAP, Math.round((bill.balance * LATE_FEE_PCT) / 100));
}

/**
 * The interest the NEXT statement is expected to carry, because this bill was not (or, before
 * its due date, will not be) paid in full. Zero for a bill that was.
 *
 * Daily interest at `interest_rate × 12 / 365`, the way Honest's FAQ and the Indonesian banks
 * describe it:
 *  - on each of the bill's own purchases from the day it posted through the statement date —
 *    the grace period is lost — unless the previous bill had already revolved, in which case
 *    those days were charged on this bill instead;
 *  - then on the balance owed at the end of every day after the statement, through the next
 *    statement date: a payment stops interest on what it pays from the day it lands, and a new
 *    purchase starts accruing the day it posts.
 * Both ends count, and the result is rounded down. Honest's examples: Rp1,000,000 posted 8 May,
 * statement 16 May, nothing paid through 16 June → 40 days → Rp23,013; Rp600,000 of it paid on
 * 24 May → 16 days on Rp1,000,000 + 24 days on Rp400,000 → Rp14,728.
 *
 * Before the due date it assumes exactly the minimum is paid on the due date — the answer to
 * "what does paying the minimum cost me?". After it, only what was actually paid counts.
 */
export function interestOnNextBill(
  card: CreditCard,
  moves: CardMove[],
  bill: CardBill,
  previous: CardBill | null,
  today: string,
  cats: ChargeCategories
): number {
  if (bill.status === "clear" || bill.status === "full") return 0;

  let owedDays = 0;

  const revolving =
    previous != null && previous.balance > 0 && previous.status !== "full";
  if (!revolving) {
    for (const move of moves) {
      if (
        move.date > bill.opened &&
        move.date <= bill.closing &&
        move.owed > 0 &&
        !isInterest(move, cats) &&
        !isFee(move, cats)
      ) {
        owedDays += move.owed * (daysBetween(move.date, bill.closing) + 1);
      }
    }
  }

  const byDay = new Map<string, number>();
  for (const move of moves) {
    if (move.date <= bill.closing || move.date > bill.nextClosing) continue;
    // Charges the bank posts ON the next statement date are that statement's, not accruing.
    if (move.date === bill.nextClosing && (isInterest(move, cats) || isFee(move, cats))) continue;
    byDay.set(move.date, (byDay.get(move.date) ?? 0) + move.owed);
  }
  if (today <= bill.due && bill.paidByDue < bill.minimum) {
    const topUp = bill.minimum - bill.paidByDue;
    byDay.set(bill.due, (byDay.get(bill.due) ?? 0) - topUp);
  }

  let owed = bill.balance;
  for (let day = addDays(bill.closing, 1); day <= bill.nextClosing; day = addDays(day, 1)) {
    owed += byDay.get(day) ?? 0;
    owedDays += Math.max(0, owed);
  }

  return Math.floor((owedDays * card.interest_rate * 12) / 100 / 365);
}

/**
 * One statement, derived. `previous` (and the one before it) are the bills already derived for
 * the two statements before — interest, a late fee and a past-due minimum all carry forward.
 */
function billAt(
  card: CreditCard,
  moves: CardMove[],
  openingOwed: number,
  closing: string,
  today: string,
  cats: ChargeCategories,
  previous: CardBill | null,
  beforePrevious: CardBill | null
): CardBill {
  const month = monthKeyOf(closing);
  const opened = closingIn(card, prevMonthKey(month));
  const nextClosing = closingIn(card, nextMonthKey(month));
  const due = dueFor(card, closing);

  let ledger = openingOwed;
  // Interest and fees still owed: a payment settles these first, the way issuers allocate it,
  // so what remains of the balance is principal.
  let chargesOwed = 0;
  let charged = 0;
  let interestRecorded = 0;
  let feesRecorded = 0;
  let paidByDue = 0;
  let paid = 0;

  for (const move of moves) {
    const charge = isInterest(move, cats) || isFee(move, cats);
    if (move.date <= closing) {
      ledger += move.owed;
      if (charge) chargesOwed += move.owed;
      else if (move.owed < 0) chargesOwed = Math.max(0, chargesOwed + move.owed);
    }
    if (move.date > opened && move.date <= closing) {
      if (isInterest(move, cats)) interestRecorded += move.owed;
      else if (isFee(move, cats)) feesRecorded += move.owed;
      else if (move.owed > 0) charged += move.owed;
    }
    if (move.date > closing && move.date <= nextClosing && move.owed < 0) {
      paid -= move.owed;
      if (move.date <= due) paidByDue -= move.owed;
    }
  }

  // What the bank adds on the statement date. Recorded figures win; until one is recorded the
  // estimate stands in, so the bill reads the way the statement does.
  const principal = Math.max(0, ledger - chargesOwed);
  const interestEstimated = interestRecorded === 0;
  const interest = interestEstimated
    ? previous
      ? interestOnNextBill(card, moves, previous, beforePrevious, today, cats)
      : 0
    : interestRecorded;

  const adminFee = Math.round((principal * card.admin_fee_pct) / 100);
  const feesEstimated = feesRecorded === 0;
  const fees = feesEstimated
    ? adminFee + (previous ? lateFeeFor(card, previous) : 0)
    : feesRecorded;

  const balance =
    ledger + (interestEstimated ? interest : 0) + (feesEstimated ? fees : 0);

  const pastDue =
    previous?.status === "missed" ? Math.max(0, previous.minimum - previous.paidByDue) : 0;
  const overLimit =
    card.credit_limit > 0 ? Math.max(0, balance - card.credit_limit) : 0;
  const minimum = minimumFor(card, balance, interest + fees, pastDue + overLimit);

  let status: BillStatus;
  if (balance <= 0) status = "clear";
  else if (paidByDue >= balance) status = "full";
  else if (paidByDue >= minimum) status = "minimum";
  else status = today <= due ? "due" : "missed";

  return {
    opened,
    closing,
    due,
    nextClosing,
    balance,
    principal,
    interest,
    interestEstimated,
    fees,
    feesEstimated,
    adminFee,
    pastDue,
    overLimit,
    minimum,
    charged,
    paidByDue,
    paid,
    status,
  };
}

/**
 * Paying only the minimum, every month, with no new spending: how many months until the card
 * is clear and what that costs in interest and admin fees. A month-by-month approximation —
 * each month's interest and admin fee on what is left after that month's payment — so it
 * reads "about".
 *
 * Null when the minimum never outpaces what each month adds, or needs over 100 years to. With an
 * admin fee that is not a corner case: at Honest's 1.75% interest, an admin fee above about 3.5%
 * makes the minimum exactly the month's charges, so the balance never falls — and from about
 * 3.3% it falls so slowly that it takes over a century.
 */
export function minimumOnlyPayoff(
  card: CreditCard,
  owedNow: number
): { months: number; cost: number } | null {
  const monthly = (card.interest_rate + card.admin_fee_pct) / 100;
  let owed = owedNow;
  let charges = 0;
  let months = 0;
  let cost = 0;
  while (owed > 0) {
    const pay = minimumFor(card, owed, charges);
    const left = owed - pay;
    charges = Math.round(left * monthly);
    if ((left > 0 && charges >= pay) || months >= 1200) return null;
    owed = left + charges;
    cost += charges;
    months += 1;
  }
  return { months, cost };
}

// =============================================================================
// A card, put together
// =============================================================================

export interface CardBook {
  card: CreditCard;
  owedNow: number;
  /** Limit minus what is owed; null when no limit is set. */
  available: number | null;
  /** The latest printed bill; null before the card's first statement. */
  bill: CardBill | null;
  /** Earlier bills, newest first. */
  history: CardBill[];
  /** The next statement date. */
  nextClosing: string;
  /** Spending since the latest statement — it lands on the next bill. */
  unbilled: number;
  /** See `interestOnNextBill`. */
  interestNext: number;
  /** The late fee the next statement will carry if this bill missed its minimum. */
  lateFee: number;
  /**
   * Minimum-only payoff of what is left of the latest bill; null when it is settled or never
   * pays off.
   */
  payoff: { months: number; cost: number } | null;
  /** The card's ledger rows, newest first. */
  recent: Transaction[];
}

/**
 * Pure. `openingOwed` is what the card owed at the end of `since` (the opening month) —
 * rows up to that date are already inside it, exactly as `deriveWalletBalances` treats them.
 */
export function cardBook(
  card: CreditCard,
  txns: Transaction[],
  openingOwed: number,
  since: string,
  today: string,
  cats: ChargeCategories = { interest: null, fee: null }
): CardBook {
  const moves = cardMoves(card.wallet_id, txns).filter((m) => m.date > since);

  let owedNow = openingOwed;
  for (const move of moves) if (move.date <= today) owedNow += move.owed;

  const latest = latestClosing(card, today);
  const nextClosing = closingIn(card, nextMonthKey(monthKeyOf(latest)));

  // One bill per statement date from the card's first activity through the latest, oldest
  // first — each needs the ones before it. A card carrying an opening balance has owed since
  // `since`; otherwise the first bill is the first statement after the first row.
  const bills: CardBill[] = [];
  const start = openingOwed !== 0 ? since : (moves[0]?.date ?? today);
  for (let month = monthKeyOf(start); month <= monthKeyOf(latest); month = nextMonthKey(month)) {
    const closing = closingIn(card, month);
    if (closing <= since || closing < start || closing > latest) continue;
    bills.push(
      billAt(card, moves, openingOwed, closing, today, cats, bills.at(-1) ?? null, bills.at(-2) ?? null)
    );
  }

  const bill = bills.at(-1) ?? null;
  const previous = bills.at(-2) ?? null;

  let unbilled = 0;
  for (const move of moves) {
    if (move.date > latest && move.date <= today && move.owed > 0) unbilled += move.owed;
  }

  // Estimated charges are not in the ledger yet, but they are owed — except an admin fee on a
  // bill paid in full, which the issuer refunds: paying the whole statement leaves exactly that
  // much as credit on the card, and so does the ledger.
  if (bill) {
    if (bill.interestEstimated) owedNow += bill.interest;
    if (bill.feesEstimated) owedNow += bill.fees - (bill.status === "full" ? bill.adminFee : 0);
  }

  return {
    card,
    owedNow,
    available: card.credit_limit > 0 ? card.credit_limit - owedNow : null,
    bill,
    history: bills.slice(0, -1).reverse().slice(0, 12),
    nextClosing,
    unbilled,
    interestNext: bill ? interestOnNextBill(card, moves, bill, previous, today, cats) : 0,
    lateFee: bill ? lateFeeFor(card, bill) : 0,
    // Before anything is paid the whole bill is at stake; after, only what is left of it.
    payoff:
      bill && bill.status !== "clear" && bill.status !== "full" && bill.balance > bill.paid
        ? minimumOnlyPayoff(card, bill.balance - bill.paid)
        : null,
    recent: moves
      .slice()
      .reverse()
      .slice(0, 15)
      .map((m) => m.txn),
  };
}

// =============================================================================
// Reads
// =============================================================================

export async function getCreditCards(): Promise<CreditCard[]> {
  const { data, error } = await supabaseServer()
    .from("credit_cards")
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  // numeric columns come back as strings (ATLAS.md §14.5). The issuer columns default so the
  // page still works before the migration that adds them has run.
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: Number(row.id),
    wallet_id: Number(row.wallet_id),
    credit_limit: Number(row.credit_limit ?? 0),
    statement_day: Number(row.statement_day),
    due_day: Number(row.due_day),
    interest_rate: Number(row.interest_rate),
    min_pct: Number(row.min_pct),
    min_floor: Number(row.min_floor ?? 0),
    provider_id: row.provider_id == null ? null : Number(row.provider_id),
    admin_fee_pct: Number(row.admin_fee_pct ?? 0),
    min_covers_charges: Boolean(row.min_covers_charges ?? false),
    late_fee: row.late_fee == null ? true : Boolean(row.late_fee),
  }));
}

export async function getCardBook(
  card: CreditCard,
  today: string,
  cats: ChargeCategories
): Promise<CardBook> {
  const [txns, openingMonth, opening] = await Promise.all([
    getWalletTransactions(card.wallet_id),
    getOpeningMonth(),
    getOpeningBalances(),
  ]);
  // A wallet's balance is money held, so what the card owes is its negative.
  const openingBalance = opening.find((b) => b.wallet_id === card.wallet_id)?.balance ?? 0;
  return cardBook(card, txns, -Number(openingBalance), endOfMonth(openingMonth), today, cats);
}

// Shared types + constants. No server imports — client components use this module.

export type CategoryKind = "income" | "expense" | "saving" | "investment";

export type TxnType =
  | "expense"
  | "income"
  | "saving"
  | "investment"
  | "transfer"
  | "withdrawal";

export type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

export const BUDGET_PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export interface Wallet {
  id: number;
  name: string;
  sort_order: number;
  archived: boolean;
}

/** A user-named collection of categories, free to mix kinds. Drives the Add sheet. */
export interface CategoryGroup {
  id: number;
  name: string;
  sort_order: number;
  archived: boolean;
}

/** One membership row — a category can live in any number of groups. */
export interface CategoryGroupMember {
  group_id: number;
  category_id: number;
}

export interface Category {
  id: number;
  kind: CategoryKind;
  name: string;
  sort_order: number;
  archived: boolean;
  is_favorite: boolean;
  period: BudgetPeriod;
  is_installment: boolean;
}

export interface Transaction {
  id: number;
  occurred_on: string; // YYYY-MM-DD
  type: TxnType;
  amount: number; // integer rupiah, always >= 0
  description: string | null;
  category_id: number | null;
  source_wallet_id: number | null;
  dest_wallet_id: number | null;
  created_at?: string;
}

/** A transactions row before it has an id — what parseTransactionForm produces. */
export type TransactionInput = Omit<Transaction, "id" | "created_at">;

export interface WalletBalance {
  id: number;
  month: string; // YYYY-MM-01
  wallet_id: number;
  balance: number;
}

/** A per-month budget OVERRIDE row. Wins outright over any recurring rule (ATLAS.md §3.4). */
export interface Budget {
  id: number;
  category_id: number;
  month: string; // YYYY-MM-01
  amount: number;
}

/** A recurring budget RULE, versioned by `effective_from`. */
export interface RecurringBudget {
  id: number;
  category_id: number;
  amount: number;
  effective_from: string; // YYYY-MM-01
}

export interface EffectiveBudget {
  category_id: number;
  amount: number;
  /** Where the winning number came from: a per-month override or the recurring rule. */
  source: "month" | "rule";
}

/** The three save scopes shared by budgets and stock buy targets (ATLAS.md §3.4). */
export type SaveScope = "month" | "forward" | "all";

export interface PaylaterProvider {
  id: number;
  name: string;
  sort_order: number;
  archived: boolean;
  category_id: number | null;
}

export interface PaylaterItem {
  id: number;
  item: string;
  monthly_amount: number;
  first_month_date: string; // YYYY-MM-01
  last_month_date: string; // YYYY-MM-01
  category_id: number | null;
  provider_id: number | null;
  note: string | null;
}

export interface PaylaterPayment {
  id: number;
  item_id: number;
  month: string; // YYYY-MM-01
  expense_txn_id: number | null;
}

export interface ForexAccount {
  id: number;
  name: string;
  currency: string; // ISO code, e.g. "JPY"
  units: number;
}

export interface ForexTransaction {
  id: number;
  account_id: number;
  occurred_on: string;
  direction: "buy" | "sell";
  idr: number;
  units: number;
  wallet_id: number | null;
  txn_id: number | null;
  pl_txn_id: number | null;
  realized_pl: number | null;
}

export interface Loan {
  id: number;
  person: string;
  note: string | null;
  installment: number;
  lender: string | null;
  /**
   * Optional due date for a ONE-payment loan, `YYYY-MM-DD`. A monthly loan is paced by its
   * schedule and leaves this null; so does a one-payment loan with no date agreed.
   */
  deadline: string | null;
}

export interface LoanPayment {
  id: number;
  loan_id: number;
  period_month: string; // YYYY-MM-01
  /** Fully collected. A partial collection leaves this false — the month stays open. */
  paid: boolean;
  /** Legacy: the first collection's income row. New collections live in `LoanCollection`. */
  income_txn_id: number | null;
  /** Running total collected against this month; null = nothing collected yet. */
  amount: number | null;
}

/**
 * One collection actually received against a scheduled month.
 *
 * A month can hold several, because a partial collection leaves it open — each one books its
 * own income row on its own date, which is the only way history stays true to when the money
 * arrived.
 */
export interface LoanCollection {
  id: number;
  payment_id: number;
  amount: number;
  occurred_on: string; // YYYY-MM-DD
  txn_id: number | null;
}

/**
 * A credit card's terms. The card itself is the wallet `wallet_id` — its balance runs negative
 * as you spend — so everything about what is owed comes from that wallet's ledger rows.
 */
export interface CreditCard {
  id: number;
  wallet_id: number;
  credit_limit: number;
  /** Day of the month the bill is printed (clamped to short months). */
  statement_day: number;
  /** Day of the month payment is due — the first such day after the statement. */
  due_day: number;
  /** Percent per month, charged daily from the purchase date once a bill is not paid in full. */
  interest_rate: number;
  /** Minimum payment as a percent of the bill. */
  min_pct: number;
  /** The smallest minimum; a bill below it is due in full. */
  min_floor: number;
  /** Installment provider billed on this card — shown on the bill, still paid on My Installment. */
  provider_id: number | null;
  /**
   * Monthly admin fee, percent of the principal on each statement (interest and fees excluded).
   * Refunded when that bill is paid in full on time. 0 for most banks.
   */
  admin_fee_pct: number;
  /** The minimum is at least the statement's interest and fees, when that beats `min_pct`. */
  min_covers_charges: boolean;
  /** A missed minimum carries a late fee (1% of the bill, capped at Rp100,000). */
  late_fee: boolean;
}

export type CardTerms = Omit<CreditCard, "id" | "wallet_id" | "credit_limit" | "provider_id">;

/**
 * Starting terms a new card can be filled from. Every field stays editable, because the
 * regulator and the issuers have each moved these before.
 *
 * - Bank Indonesia's current rules: interest capped at 1.75% a month, a minimum of 5% of the
 *   bill but at least Rp50,000, and a late fee.
 * - Honest (honest.co.id FAQ): the same 1.75%, but the minimum is the highest of 5% of the bill,
 *   the statement's interest plus admin fee, or Rp20,000; a personalised admin fee of 0–6.49%
 *   a month that is refunded when the bill is paid in full on time; and no late fee. The admin
 *   rate is left for the user to copy from their statement.
 */
export interface CardPreset {
  key: string;
  label: string;
  /** `admin_fee_pct: null` = personalised; the form keeps whatever was typed. */
  terms: Omit<CardTerms, "statement_day" | "due_day" | "admin_fee_pct"> & {
    admin_fee_pct: number | null;
  };
}

export const CARD_PRESETS: CardPreset[] = [
  {
    key: "standard",
    label: "Bank standard",
    terms: {
      interest_rate: 1.75,
      min_pct: 5,
      min_floor: 50_000,
      admin_fee_pct: 0,
      min_covers_charges: false,
      late_fee: true,
    },
  },
  {
    key: "honest",
    label: "Honest",
    terms: {
      interest_rate: 1.75,
      min_pct: 5,
      min_floor: 20_000,
      admin_fee_pct: null,
      min_covers_charges: true,
      late_fee: false,
    },
  },
];

/** What a brand-new card starts with: the bank standard. */
export const CARD_DEFAULTS = CARD_PRESETS[0].terms;

/**
 * Which category kind each transaction type draws from.
 * `withdrawal` is null because it draws from saving OR investment — handled specially
 * in the form (ATLAS.md §9.1).
 */
export const TYPE_TO_CATEGORY_KIND: Record<TxnType, CategoryKind | null> = {
  expense: "expense",
  income: "income",
  saving: "saving",
  investment: "investment",
  transfer: null,
  withdrawal: null,
};

export const TXN_TYPES: { value: TxnType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "saving", label: "Saving" },
  { value: "investment", label: "Invest" },
  { value: "transfer", label: "Transfer" },
  { value: "withdrawal", label: "Withdraw" },
];

/** Types that draw money out of a source wallet. */
export const SOURCE_WALLET_TYPES: TxnType[] = [
  "expense",
  "saving",
  "investment",
  "transfer",
];

/** Types that put money into a destination wallet. */
export const DEST_WALLET_TYPES: TxnType[] = ["income", "withdrawal", "transfer"];

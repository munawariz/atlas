export type CategoryKind = "income" | "expense" | "saving" | "investment";
export type TxnType = "expense" | "income" | "saving" | "investment" | "transfer" | "withdrawal";

export interface Wallet {
  id: number;
  name: string;
  sort_order: number;
  archived: boolean;
}

export interface Category {
  id: number;
  kind: CategoryKind;
  name: string;
  sort_order: number;
  archived: boolean;
}

export interface Transaction {
  id: number;
  occurred_on: string; // YYYY-MM-DD
  type: TxnType;
  amount: number;
  description: string | null;
  category_id: number | null;
  source_wallet_id: number | null;
  dest_wallet_id: number | null;
  created_at: string;
}

export interface WalletBalance {
  id: number;
  month: string; // YYYY-MM-DD (first of month)
  wallet_id: number;
  balance: number;
}

export interface Budget {
  id: number;
  category_id: number;
  month: string;
  amount: number;
}

// A recurring monthly budget: `amount` applies to every month from `effective_from`
// onward (until a later rule or a per-month override supersedes it).
export interface RecurringBudget {
  id: number;
  category_id: number;
  amount: number;
  effective_from: string;
}

// The resolved budget for a given month: a per-month override wins, otherwise the
// recurring rule in effect. `recurring` is true when the value came from a rule.
export interface EffectiveBudget {
  category_id: number;
  amount: number;
  recurring: boolean;
}

export interface PaylaterItem {
  id: number;
  item: string;
  monthly_amount: number;
  first_month_date: string; // YYYY-MM-01
  last_month_date: string; // YYYY-MM-01
  category_id: number | null; // null = default "Cicilan Paylater"
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
  currency: string;
  units: number;
}

export interface ForexTransaction {
  id: number;
  account_id: number;
  occurred_on: string; // YYYY-MM-DD
  direction: "buy" | "sell";
  idr: number;
  units: number;
  wallet_id: number | null;
  txn_id: number | null;
}

export interface Loan {
  id: number;
  person: string;
  note: string | null;
  installment: number;
  lender: string | null;
}

export interface LoanPayment {
  id: number;
  loan_id: number;
  period_month: string; // YYYY-MM-01
  paid: boolean;
  income_txn_id: number | null;
}

// Which category kind feeds which transaction type's category picker.
export const TYPE_TO_CATEGORY_KIND: Record<TxnType, CategoryKind | null> = {
  expense: "expense",
  income: "income",
  saving: "saving",
  investment: "investment",
  transfer: null,
  withdrawal: null, // draws from saving OR investment buckets — handled specially in the form
};

export const TXN_TYPES: { value: TxnType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "saving", label: "Saving" },
  { value: "investment", label: "Invest" },
  { value: "transfer", label: "Transfer" },
  { value: "withdrawal", label: "Ambil Tabungan" },
];

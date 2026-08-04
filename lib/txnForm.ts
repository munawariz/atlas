// Pure form parsing shared by Add and Edit. No server imports.

import type { TransactionInput, TxnType } from "./types";

const TYPES: TxnType[] = [
  "expense",
  "income",
  "saving",
  "investment",
  "transfer",
  "withdrawal",
];

/** Strip thousand separators and anything else non-numeric. */
export function digits(v: FormDataEntryValue | string | null | undefined): number {
  return parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
}

/** Positive integer or null — used for optional id fields. */
export function optInt(v: FormDataEntryValue | string | null | undefined): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface ParsedTransaction {
  row?: TransactionInput;
  error?: string;
}

/**
 * Validate then normalize a transaction form.
 *
 * Normalization is load-bearing: the ledger's direction is implied by `type`, so the wallet
 * and category columns that do not apply to a type must be nulled (ATLAS.md §3.1).
 */
export function parseTransactionForm(formData: FormData): ParsedTransaction {
  const rawType = String(formData.get("type") ?? "");
  const type = (TYPES.includes(rawType as TxnType) ? rawType : "expense") as TxnType;

  const amount = digits(formData.get("amount"));
  if (amount <= 0) return { error: "Enter an amount." };

  const occurred_on = String(formData.get("occurred_on") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurred_on)) return { error: "Pick a date." };

  const rawDescription = String(formData.get("description") ?? "").trim();
  const description = rawDescription || null;

  let category_id = optInt(formData.get("category_id"));
  let source_wallet_id = optInt(formData.get("source_wallet_id"));
  let dest_wallet_id = optInt(formData.get("dest_wallet_id"));

  // --- Category ---------------------------------------------------------
  if (type !== "transfer" && !category_id) {
    if (type === "saving" || type === "investment") {
      return { error: "Choose where it's going." };
    }
    if (type === "withdrawal") {
      return { error: "Choose which savings to withdraw from." };
    }
    return { error: "Choose a category." };
  }

  // --- Wallets ----------------------------------------------------------
  if (type === "transfer") {
    if (!source_wallet_id || !dest_wallet_id) {
      return { error: "Choose both wallets." };
    }
    if (source_wallet_id === dest_wallet_id) {
      return { error: "Pick two different wallets." };
    }
  } else if (type === "income" || type === "withdrawal") {
    if (!dest_wallet_id) return { error: "Choose which wallet received it." };
  } else if (type === "expense") {
    if (!source_wallet_id) return { error: "Choose which wallet you paid from." };
  }

  // --- Normalize --------------------------------------------------------
  if (type === "transfer") category_id = null;
  if (type === "income" || type === "withdrawal") source_wallet_id = null;
  if (type !== "transfer" && type !== "income" && type !== "withdrawal") {
    dest_wallet_id = null;
  }

  return {
    row: {
      occurred_on,
      type,
      amount,
      description,
      category_id,
      source_wallet_id,
      dest_wallet_id,
    },
  };
}

import type { TxnType } from "./types";

export interface TxnRow {
  occurred_on: string;
  type: TxnType;
  amount: number;
  description: string | null;
  category_id: number | null;
  source_wallet_id: number | null;
  dest_wallet_id: number | null;
}

function num(v: FormDataEntryValue | null): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Validate + normalize a transaction form into a DB row (or an error message). */
export function parseTransactionForm(formData: FormData): { row?: TxnRow; error?: string } {
  const type = String(formData.get("type") ?? "") as TxnType;
  const amount = num(formData.get("amount"));
  const occurred_on = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const category_id = num(formData.get("category_id"));
  const source_wallet_id = num(formData.get("source_wallet_id"));
  const dest_wallet_id = num(formData.get("dest_wallet_id"));

  if (!amount) return { error: "Enter an amount." };
  if (!occurred_on) return { error: "Pick a date." };

  if ((type === "expense" || type === "income") && !category_id) return { error: "Choose a category." };
  if ((type === "saving" || type === "investment") && !category_id) return { error: "Choose where it's going." };
  if (type === "expense" && !source_wallet_id) return { error: "Choose the wallet you paid from." };
  if (type === "income" && !dest_wallet_id) return { error: "Choose the wallet it went into." };
  if (type === "transfer" && (!source_wallet_id || !dest_wallet_id)) return { error: "Choose both From and To wallets." };
  if (type === "transfer" && source_wallet_id === dest_wallet_id) return { error: "From and To must differ." };

  return {
    row: {
      occurred_on,
      type,
      amount,
      description,
      category_id: type === "transfer" ? null : category_id,
      source_wallet_id: type === "income" ? null : source_wallet_id,
      dest_wallet_id: type === "transfer" || type === "income" ? dest_wallet_id : null,
    },
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { getPaylaterItems, getPaylaterPayments } from "@/lib/data";
import { resolveProviderCategory } from "../actions";

const digits = (v: FormDataEntryValue | null) =>
  parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
const optInt = (v: FormDataEntryValue | null) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const monthDate = (v: FormDataEntryValue | null) => {
  const m = /^(\d{4}-\d{2})(?:-\d{2})?$/.exec(String(v ?? "").trim());
  return m ? `${m[1]}-01` : null;
};

function revalidateInstallments() {
  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
  revalidatePath("/more/budgets");
  revalidatePath("/more/cashflow");
  revalidatePath("/history");
}

export async function addPaylaterItem(formData: FormData): Promise<void> {
  const item = text(formData.get("item"));
  const monthly = digits(formData.get("monthly_amount"));
  const first = monthDate(formData.get("first_month_date"));
  const last = monthDate(formData.get("last_month_date"));
  if (!item || !first || !last) return;

  await supabaseServer().from("paylater_items").insert({
    item,
    monthly_amount: monthly,
    first_month_date: first,
    // A backwards range would make the item permanently inactive rather than erroring, so
    // clamp it to a single month instead.
    last_month_date: last < first ? first : last,
    provider_id: optInt(formData.get("provider_id")),
    note: text(formData.get("note")) || null,
  });

  revalidateInstallments();
}

/**
 * Edit an item.
 *
 * Already-booked months are NOT rewritten (ATLAS.md §14.12) — a paid month keeps the expense
 * it actually booked, as historical record. Only future months feel the new amount.
 */
export async function updatePaylaterItem(
  id: number,
  formData: FormData
): Promise<void> {
  const item = text(formData.get("item"));
  const first = monthDate(formData.get("first_month_date"));
  const last = monthDate(formData.get("last_month_date"));
  if (!item || !first || !last) return;

  await supabaseServer()
    .from("paylater_items")
    .update({
      item,
      monthly_amount: digits(formData.get("monthly_amount")),
      first_month_date: first,
      last_month_date: last < first ? first : last,
      provider_id: optInt(formData.get("provider_id")),
      note: text(formData.get("note")) || null,
    })
    .eq("id", id);

  revalidateInstallments();
}

export async function deletePaylaterItem(id: number): Promise<void> {
  const sb = supabaseServer();

  // Remove the ledger rows this item booked before the payments cascade away with it.
  const { data: payments } = await sb
    .from("paylater_payments")
    .select("expense_txn_id")
    .eq("item_id", id);

  const txnIds = ((payments ?? []) as { expense_txn_id: number | null }[])
    .map((p) => p.expense_txn_id)
    .filter((v): v is number => v != null);

  if (txnIds.length > 0) {
    await sb.from("transactions").delete().in("id", txnIds);
  }

  await sb.from("paylater_items").delete().eq("id", id);
  revalidateInstallments();
}

/**
 * Mark one month paid, booking an expense under the PROVIDER'S OWN category.
 *
 * `skipTransaction` covers "already paid elsewhere" — the month is recorded as settled but no
 * ledger row is created, because the money left through some other entry.
 */
export async function payPaylaterMonth(formData: FormData): Promise<void> {
  const itemId = optInt(formData.get("item_id"));
  const month = monthDate(formData.get("month"));
  if (!itemId || !month) return;

  const sb = supabaseServer();

  // Never double-book: a month already marked paid is left exactly as it is.
  const { data: existing } = await sb
    .from("paylater_payments")
    .select("id")
    .eq("item_id", itemId)
    .eq("month", month)
    .maybeSingle();
  if (existing) return;

  const skip = String(formData.get("skip_transaction") ?? "") === "1";
  const walletId = optInt(formData.get("wallet_id"));
  const occurredOn = text(formData.get("occurred_on")) || month;

  const items = await getPaylaterItems();
  const item = items.find((i) => i.id === itemId);
  if (!item) return;

  let expenseTxnId: number | null = null;

  if (!skip) {
    const categoryId =
      item.provider_id != null
        ? await resolveProviderCategory(item.provider_id)
        : null;

    const { data: created } = await sb
      .from("transactions")
      .insert({
        occurred_on: occurredOn,
        type: "expense",
        amount: item.monthly_amount,
        // The description is the installment item's own name (ATLAS.md §3.5).
        description: item.item,
        category_id: categoryId,
        source_wallet_id: walletId,
        dest_wallet_id: null,
      })
      .select("id")
      .maybeSingle();

    expenseTxnId = created ? Number(created.id) : null;
  }

  await sb.from("paylater_payments").insert({
    item_id: itemId,
    month,
    expense_txn_id: expenseTxnId,
  });

  revalidateInstallments();
}

/** Un-pay: delete the linked expense first, then the payment row. */
export async function unpayPaylaterMonth(formData: FormData): Promise<void> {
  const itemId = optInt(formData.get("item_id"));
  const month = monthDate(formData.get("month"));
  if (!itemId || !month) return;

  const sb = supabaseServer();
  const { data: payment } = await sb
    .from("paylater_payments")
    .select("id, expense_txn_id")
    .eq("item_id", itemId)
    .eq("month", month)
    .maybeSingle();
  if (!payment) return;

  if (payment.expense_txn_id) {
    await sb.from("transactions").delete().eq("id", payment.expense_txn_id);
  }
  await sb.from("paylater_payments").delete().eq("id", payment.id);

  revalidateInstallments();
}

/**
 * Pay every unpaid item in a provider group for a month, in one go.
 *
 * Months already marked paid are SKIPPED, so re-running this never double-books.
 */
export async function payPaylaterMonths(formData: FormData): Promise<void> {
  const month = monthDate(formData.get("month"));
  if (!month) return;

  const ids = String(formData.get("item_ids") ?? "")
    .split(",")
    .map((v) => parseInt(v, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return;

  const walletId = optInt(formData.get("wallet_id"));
  const occurredOn = text(formData.get("occurred_on")) || month;

  const [items, payments] = await Promise.all([
    getPaylaterItems(),
    getPaylaterPayments(),
  ]);
  const alreadyPaid = new Set(
    payments.filter((p) => p.month === month).map((p) => p.item_id)
  );

  for (const id of ids) {
    if (alreadyPaid.has(id)) continue;
    const item = items.find((i) => i.id === id);
    if (!item) continue;

    const single = new FormData();
    single.set("item_id", String(id));
    single.set("month", month);
    single.set("occurred_on", occurredOn);
    if (walletId) single.set("wallet_id", String(walletId));
    await payPaylaterMonth(single);
  }

  revalidateInstallments();
}

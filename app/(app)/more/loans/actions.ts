"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { currentMonthKey, getLoans } from "@/lib/data";
import { resolveCategoryId, unmappedError } from "@/lib/settings";

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
/** A full calendar date, `YYYY-MM-DD`. Blank stays null — a deadline is optional. */
const dateISO = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

function revalidateLoans() {
  revalidatePath("/more/loans");
  revalidatePath("/dashboard");
  revalidatePath("/more/budgets");
  revalidatePath("/more/cashflow");
  revalidatePath("/history");
}

export interface LoanState {
  ok?: boolean;
  error?: string;
  nonce?: number;
}

function addMonths(monthKey: string, n: number): string {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Create a loan and lay out its collection schedule. Capped at 60 months.
 *
 * Two shapes, told apart by `months`:
 *
 *  - **One payment** (months = 1). There is no monthly rhythm to schedule from, so the form
 *    asks for an optional `deadline` instead of a start month. The single collection slot
 *    still needs a month to live in — it takes the deadline's, or the current one when no
 *    date was agreed — but that month is an internal detail the UI never asks for or shows.
 *  - **Monthly** (months > 1). A start month is required and `deadline` stays null: the
 *    schedule is what paces the loan.
 */
export async function addLoan(
  _prev: LoanState,
  formData: FormData
): Promise<LoanState> {
  const person = text(formData.get("person"));
  const months = Math.min(60, Math.max(1, optInt(formData.get("months")) ?? 1));
  const installment = digits(formData.get("installment"));
  const once = months === 1;

  const deadline = once ? dateISO(formData.get("deadline")) : null;
  const start = once
    ? deadline
      ? monthDate(deadline.slice(0, 7))
      : currentMonthKey()
    : monthDate(formData.get("start_month"));

  if (!person) return { error: "Enter who owes you." };
  if (installment <= 0) {
    return { error: once ? "Enter the amount." : "Enter the monthly amount." };
  }
  if (!start) return { error: "Pick the month collection starts." };

  const sb = supabaseServer();
  const { data: created } = await sb
    .from("loans")
    .insert({
      person,
      lender: text(formData.get("lender")) || null,
      installment,
      note: text(formData.get("note")) || null,
      deadline,
    })
    .select("id")
    .maybeSingle();
  if (!created) return { error: "Could not save that loan." };

  const schedule = Array.from({ length: months }, (_, i) => ({
    loan_id: Number(created.id),
    period_month: addMonths(start, i),
    paid: false,
  }));
  await sb.from("loan_payments").insert(schedule);

  revalidateLoans();
  return { ok: true, nonce: Date.now() };
}

export async function deleteLoan(id: number): Promise<void> {
  const sb = supabaseServer();

  // Remove the income rows this loan booked before its payments cascade away. Collections are
  // where they live now; `income_txn_id` is read too so a database that has not run the
  // backfill yet still leaves nothing behind.
  const { data: payments } = await sb
    .from("loan_payments")
    .select("id, income_txn_id")
    .eq("loan_id", id);

  const paymentIds = ((payments ?? []) as { id: number }[]).map((p) => Number(p.id));
  const { data: collections } = paymentIds.length
    ? await sb.from("loan_collections").select("txn_id").in("payment_id", paymentIds)
    : { data: [] };

  const txnIds = [
    ...((payments ?? []) as { income_txn_id: number | null }[]).map((p) => p.income_txn_id),
    ...((collections ?? []) as { txn_id: number | null }[]).map((c) => c.txn_id),
  ].filter((v): v is number => v != null);

  if (txnIds.length > 0) {
    await sb.from("transactions").delete().in("id", txnIds);
  }

  await sb.from("loans").delete().eq("id", id);
  revalidateLoans();
}

/**
 * Collect against one scheduled month, booking income under the mapped loan category.
 *
 * A month can be collected more than once. Each call books its own income row on its own date
 * and adds a `loan_collections` row; the schedule slot carries the running total, and `paid`
 * flips only when that total reaches the installment. That is what keeps a partially
 * collected month open — and collectable again.
 *
 * The mapping is checked BEFORE the first write (ATLAS.md §11): discovering it is unmapped
 * halfway through would leave a payment marked collected with no matching ledger row.
 */
export async function collectLoanMonth(formData: FormData): Promise<LoanState> {
  const loanId = optInt(formData.get("loan_id"));
  const month = monthDate(formData.get("period_month"));
  if (!loanId || !month) return { error: "Nothing to collect." };

  const categoryId = await resolveCategoryId("cat_loan");
  if (categoryId === null) return { error: unmappedError("cat_loan") };

  const loans = await getLoans();
  const loan = loans.find((l) => l.id === loanId);
  if (!loan) return { error: "That loan no longer exists." };

  const walletId = optInt(formData.get("wallet_id"));
  if (!walletId) return { error: "Choose which wallet received it." };

  const sb = supabaseServer();
  const { data: slot } = await sb
    .from("loan_payments")
    .select("id, amount")
    .eq("loan_id", loanId)
    .eq("period_month", month)
    .maybeSingle();

  const already = Number(slot?.amount ?? 0);
  const remaining = Math.max(0, loan.installment - already);

  // Blank means whatever is still owed on this month: the full installment the first time,
  // the remainder after a partial. Once the month is square there is no remainder to infer,
  // so blank falls back to a fresh installment rather than booking nothing.
  const rawAmount = digits(formData.get("amount"));
  const amount =
    rawAmount > 0 ? rawAmount : remaining > 0 ? remaining : loan.installment;
  if (amount <= 0) return { error: "Enter an amount." };

  const occurredOn = text(formData.get("occurred_on")) || month;

  const { data: created } = await sb
    .from("transactions")
    .insert({
      occurred_on: occurredOn,
      type: "income",
      amount,
      // The description is the person's name (ATLAS.md §3.5).
      description: loan.person,
      category_id: categoryId,
      source_wallet_id: null,
      dest_wallet_id: walletId,
    })
    .select("id")
    .maybeSingle();

  const total = already + amount;
  const { data: saved } = await sb
    .from("loan_payments")
    .upsert(
      {
        loan_id: loanId,
        period_month: month,
        paid: total >= loan.installment,
        amount: total,
      },
      { onConflict: "loan_id,period_month" }
    )
    .select("id")
    .maybeSingle();

  const paymentId = Number(saved?.id ?? slot?.id ?? 0);
  if (paymentId) {
    await sb.from("loan_collections").insert({
      payment_id: paymentId,
      amount,
      occurred_on: occurredOn,
      txn_id: created ? Number(created.id) : null,
    });
  }

  revalidateLoans();
  return { ok: true, nonce: Date.now() };
}

/**
 * Undo one collection: delete the income row it booked, drop it, re-total its month.
 *
 * Undoing the only collection leaves the month uncollected; undoing one of several reopens
 * the month for what is left.
 */
export async function undoLoanCollection(formData: FormData): Promise<void> {
  const id = optInt(formData.get("collection_id"));
  if (!id) return;

  const sb = supabaseServer();
  const { data: collection } = await sb
    .from("loan_collections")
    .select("id, payment_id, txn_id")
    .eq("id", id)
    .maybeSingle();
  if (!collection) return;

  if (collection.txn_id) {
    await sb.from("transactions").delete().eq("id", collection.txn_id);
  }
  await sb.from("loan_collections").delete().eq("id", collection.id);

  await retotalPayment(Number(collection.payment_id));
  revalidateLoans();
}

/**
 * Re-sum a schedule slot from the collections still standing against it.
 *
 * The stored total is derived, never adjusted in place: rebuilding it from the rows is what
 * keeps `paid` honest whichever collection was undone.
 */
async function retotalPayment(paymentId: number): Promise<void> {
  const sb = supabaseServer();
  const { data: payment } = await sb
    .from("loan_payments")
    .select("id, loan_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return;

  const loans = await getLoans();
  const installment =
    loans.find((l) => l.id === Number(payment.loan_id))?.installment ?? 0;

  const { data: rows } = await sb
    .from("loan_collections")
    .select("amount")
    .eq("payment_id", paymentId);

  const total = ((rows ?? []) as { amount: number }[]).reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  await sb
    .from("loan_payments")
    .update({
      paid: total > 0 && total >= installment,
      amount: total > 0 ? total : null,
      income_txn_id: null,
    })
    .eq("id", paymentId);
}

/** Un-collect a whole month: delete every income row it booked, then reset the slot. */
export async function uncollectLoanMonth(formData: FormData): Promise<void> {
  const loanId = optInt(formData.get("loan_id"));
  const month = monthDate(formData.get("period_month"));
  if (!loanId || !month) return;

  const sb = supabaseServer();
  const { data: payment } = await sb
    .from("loan_payments")
    .select("id, income_txn_id")
    .eq("loan_id", loanId)
    .eq("period_month", month)
    .maybeSingle();
  if (!payment) return;

  const { data: collections } = await sb
    .from("loan_collections")
    .select("txn_id")
    .eq("payment_id", payment.id);

  const txnIds = [
    payment.income_txn_id as number | null,
    ...((collections ?? []) as { txn_id: number | null }[]).map((c) => c.txn_id),
  ].filter((v): v is number => v != null);

  if (txnIds.length > 0) {
    await sb.from("transactions").delete().in("id", txnIds);
  }
  await sb.from("loan_collections").delete().eq("payment_id", payment.id);
  await sb
    .from("loan_payments")
    .update({ paid: false, income_txn_id: null, amount: null })
    .eq("id", payment.id);

  revalidateLoans();
}

/** Add a month to the schedule. */
export async function scheduleLoanMonth(formData: FormData): Promise<void> {
  const loanId = optInt(formData.get("loan_id"));
  const month = monthDate(formData.get("period_month"));
  if (!loanId || !month) return;

  await supabaseServer()
    .from("loan_payments")
    .upsert(
      { loan_id: loanId, period_month: month, paid: false },
      { onConflict: "loan_id,period_month" }
    );

  revalidateLoans();
}

/**
 * Remove a month from the schedule. Anything collected against it must be undone first —
 * including a partial, which leaves `paid` false but still has income rows behind it that
 * deleting the slot would cascade away and orphan.
 */
export async function unscheduleLoanMonth(formData: FormData): Promise<void> {
  const loanId = optInt(formData.get("loan_id"));
  const month = monthDate(formData.get("period_month"));
  if (!loanId || !month) return;

  const sb = supabaseServer();
  const { data: payment } = await sb
    .from("loan_payments")
    .select("id")
    .eq("loan_id", loanId)
    .eq("period_month", month)
    .eq("paid", false)
    .maybeSingle();
  if (!payment) return;

  const { count } = await sb
    .from("loan_collections")
    .select("id", { count: "exact", head: true })
    .eq("payment_id", payment.id);
  if (count) return;

  await sb.from("loan_payments").delete().eq("id", payment.id);

  revalidateLoans();
}

/**
 * Set or clear a one-payment loan's deadline.
 *
 * Blank clears it: "no date agreed" is a real state, not a missing value, so set and clear
 * are the same write rather than two actions. The collection slot's `period_month` is left
 * where it is — it is an internal key, and moving a collected payment to another month would
 * silently rewrite which month the ledger says the money arrived in.
 */
export async function setLoanDeadline(
  id: number,
  formData: FormData
): Promise<void> {
  const deadline = dateISO(formData.get("deadline"));
  await supabaseServer().from("loans").update({ deadline }).eq("id", id);
  revalidateLoans();
}

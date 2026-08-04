"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { getLoans } from "@/lib/data";
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

/** Create a loan and lay out its collection schedule. Capped at 60 months. */
export async function addLoan(formData: FormData): Promise<void> {
  const person = text(formData.get("person"));
  const start = monthDate(formData.get("start_month"));
  const months = Math.min(60, Math.max(1, optInt(formData.get("months")) ?? 1));
  if (!person || !start) return;

  const sb = supabaseServer();
  const { data: created } = await sb
    .from("loans")
    .insert({
      person,
      lender: text(formData.get("lender")) || null,
      installment: digits(formData.get("installment")),
      note: text(formData.get("note")) || null,
    })
    .select("id")
    .maybeSingle();
  if (!created) return;

  const schedule = Array.from({ length: months }, (_, i) => ({
    loan_id: Number(created.id),
    period_month: addMonths(start, i),
    paid: false,
  }));
  await sb.from("loan_payments").insert(schedule);

  revalidateLoans();
}

export async function deleteLoan(id: number): Promise<void> {
  const sb = supabaseServer();

  // Remove the income rows this loan booked before its payments cascade away.
  const { data: payments } = await sb
    .from("loan_payments")
    .select("income_txn_id")
    .eq("loan_id", id);

  const txnIds = ((payments ?? []) as { income_txn_id: number | null }[])
    .map((p) => p.income_txn_id)
    .filter((v): v is number => v != null);

  if (txnIds.length > 0) {
    await sb.from("transactions").delete().in("id", txnIds);
  }

  await sb.from("loans").delete().eq("id", id);
  revalidateLoans();
}

/**
 * Collect one scheduled month, booking income under the mapped loan category.
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

  // A blank amount means the full installment; a partial collection stores what was taken.
  const rawAmount = digits(formData.get("amount"));
  const amount = rawAmount > 0 ? rawAmount : loan.installment;
  if (amount <= 0) return { error: "Enter an amount." };

  const occurredOn = text(formData.get("occurred_on")) || month;

  const sb = supabaseServer();
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

  await sb.from("loan_payments").upsert(
    {
      loan_id: loanId,
      period_month: month,
      paid: true,
      income_txn_id: created ? Number(created.id) : null,
      amount: rawAmount > 0 ? rawAmount : null,
    },
    { onConflict: "loan_id,period_month" }
  );

  revalidateLoans();
  return { ok: true, nonce: Date.now() };
}

/** Un-collect: delete the linked income row, then reset the schedule slot. */
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

  if (payment.income_txn_id) {
    await sb.from("transactions").delete().eq("id", payment.income_txn_id);
  }
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

/** Remove an uncollected month from the schedule. Collected months must be un-collected first. */
export async function unscheduleLoanMonth(formData: FormData): Promise<void> {
  const loanId = optInt(formData.get("loan_id"));
  const month = monthDate(formData.get("period_month"));
  if (!loanId || !month) return;

  await supabaseServer()
    .from("loan_payments")
    .delete()
    .eq("loan_id", loanId)
    .eq("period_month", month)
    .eq("paid", false);

  revalidateLoans();
}

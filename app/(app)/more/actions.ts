"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { SESSION_COOKIE } from "@/lib/auth";
import type { CategoryKind } from "@/lib/types";

function digits(v: FormDataEntryValue | null): number {
  return parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
}

// An <input type="month"> gives "YYYY-MM"; store it as a first-of-month date.
function monthDate(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}$/.test(s) ? `${s}-01` : null;
}

function addMonthsISO(iso: string, n: number): string {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((((idx % 12) + 12) % 12) + 1).padStart(2, "0")}-01`;
}

function units(v: FormDataEntryValue | null): number {
  return parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
}

// Optional positive integer (e.g. a selected category id); "" / invalid -> null.
function optInt(v: FormDataEntryValue | null): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}


export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ---- Wallets ----
export async function addWallet(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sb = supabaseServer();
  const { data } = await sb.from("wallets").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const next = (data?.[0]?.sort_order ?? 0) + 1;
  await sb.from("wallets").insert({ name, sort_order: next });
  revalidatePath("/more/wallets");
}

export async function toggleWalletArchived(id: number) {
  const sb = supabaseServer();
  const { data } = await sb.from("wallets").select("archived").eq("id", id).maybeSingle();
  await sb.from("wallets").update({ archived: !data?.archived }).eq("id", id);
  revalidatePath("/more/wallets");
}

// ---- Categories ----
export async function addCategory(formData: FormData) {
  const kind = String(formData.get("kind") ?? "") as CategoryKind;
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !["income", "expense", "saving", "investment"].includes(kind)) return;
  await supabaseServer().from("categories").insert({ kind, name });
  revalidatePath("/more/categories");
}

export async function toggleCategoryArchived(id: number) {
  const sb = supabaseServer();
  const { data } = await sb.from("categories").select("archived").eq("id", id).maybeSingle();
  await sb.from("categories").update({ archived: !data?.archived }).eq("id", id);
  revalidatePath("/more/categories");
}

// ---- Budgets ----
// scope: "month" = this month only (a per-month override); "forward" = this month and
// every month after (a recurring rule, clearing later rules/overrides); "all" = every
// month (a single recurring rule from the beginning, clearing all rules/overrides).
export async function setBudget(formData: FormData) {
  const category_id = parseInt(String(formData.get("category_id") ?? ""), 10);
  const month = String(formData.get("month") ?? "");
  const scope = String(formData.get("scope") ?? "month");
  const amount = digits(formData.get("amount"));
  if (!category_id || !/^\d{4}-\d{2}-01$/.test(month)) return;
  const sb = supabaseServer();

  if (scope === "all") {
    // One recurring rule from the dawn of time; wipe every override and other rule.
    await sb.from("recurring_budgets").delete().eq("category_id", category_id);
    await sb.from("budgets").delete().eq("category_id", category_id);
    await sb.from("recurring_budgets").insert({ category_id, amount, effective_from: "1900-01-01" });
  } else if (scope === "forward") {
    // Authoritative from this month on: drop later rules + overrides, set the rule here.
    await sb.from("recurring_budgets").delete().eq("category_id", category_id).gt("effective_from", month);
    await sb.from("budgets").delete().eq("category_id", category_id).gte("month", month);
    await sb
      .from("recurring_budgets")
      .upsert({ category_id, amount, effective_from: month }, { onConflict: "category_id,effective_from" });
  } else {
    // This month only — a per-month override on top of any recurring rule.
    await sb.from("budgets").upsert({ category_id, month, amount }, { onConflict: "category_id,month" });
  }

  revalidatePath("/more/budgets");
  revalidatePath("/dashboard");
}

// ---- Paylater ----
export async function addPaylater(formData: FormData) {
  const item = String(formData.get("item") ?? "").trim();
  const first = monthDate(formData.get("first_month"));
  const last = monthDate(formData.get("last_month"));
  if (!item || !first || !last) return;
  await supabaseServer().from("paylater_items").insert({
    item,
    monthly_amount: digits(formData.get("monthly_amount")),
    first_month_date: first,
    last_month_date: last < first ? first : last,
    category_id: optInt(formData.get("category_id")),
    note: String(formData.get("note") ?? "").trim() || null,
  });
  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
}

export async function editPaylater(formData: FormData) {
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  const item = String(formData.get("item") ?? "").trim();
  const first = monthDate(formData.get("first_month"));
  const last = monthDate(formData.get("last_month"));
  if (!id || !item || !first || !last) return;
  await supabaseServer()
    .from("paylater_items")
    .update({
      item,
      monthly_amount: digits(formData.get("monthly_amount")),
      first_month_date: first,
      last_month_date: last < first ? first : last,
      category_id: optInt(formData.get("category_id")),
      note: String(formData.get("note") ?? "").trim() || null,
    })
    .eq("id", id);
  // Note: already-booked paid months keep their original expense (historical record);
  // editing only changes the item's details going forward.
  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
}

export async function deletePaylater(id: number) {
  await supabaseServer().from("paylater_items").delete().eq("id", id);
  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
}

// Pay an installment month: book an expense withdrawn from the chosen wallet and mark
// the month paid (linked to that expense).
export async function payPaylaterMonth(itemId: number, month: string, walletId: number, dateISO: string) {
  const sb = supabaseServer();
  const occurred_on = /^\d{4}-\d{2}-\d{2}$/.test(dateISO) ? dateISO : new Date().toISOString().slice(0, 10);
  const { data: item } = await sb
    .from("paylater_items")
    .select("item, monthly_amount, category_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item || !walletId) return;

  // Book the expense under the item's custom category, or default to "Cicilan Paylater".
  let categoryId = item.category_id as number | null;
  if (!categoryId) {
    let { data: cat } = await sb
      .from("categories")
      .select("id")
      .eq("kind", "expense")
      .eq("name", "Cicilan Paylater")
      .maybeSingle();
    if (!cat) {
      const ins = await sb.from("categories").insert({ kind: "expense", name: "Cicilan Paylater" }).select("id").single();
      cat = ins.data;
    }
    categoryId = cat?.id ?? null;
  }
  const txn = await sb
    .from("transactions")
    .insert({
      occurred_on,
      type: "expense",
      amount: item.monthly_amount,
      description: item.item,
      category_id: categoryId,
      source_wallet_id: walletId,
    })
    .select("id")
    .single();

  await sb
    .from("paylater_payments")
    .upsert({ item_id: itemId, month, expense_txn_id: txn.data?.id ?? null }, { onConflict: "item_id,month" });

  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

// Un-pay an installment month: delete the linked expense and the paid marker.
export async function unpayPaylaterMonth(itemId: number, month: string) {
  const sb = supabaseServer();
  const { data } = await sb
    .from("paylater_payments")
    .select("id, expense_txn_id")
    .eq("item_id", itemId)
    .eq("month", month)
    .maybeSingle();
  if (data) {
    if (data.expense_txn_id) await sb.from("transactions").delete().eq("id", data.expense_txn_id);
    await sb.from("paylater_payments").delete().eq("id", data.id);
  }
  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

// ---- Forex ----
// Move money between an IDR wallet and a foreign-currency holding. Buy = IDR -> forex
// (books a Forex investment out of the wallet); Sell = forex -> IDR (books income in).
export async function convertForex(formData: FormData) {
  const sb = supabaseServer();
  const accountId = parseInt(String(formData.get("account_id") ?? ""), 10);
  const direction = String(formData.get("direction") ?? "buy");
  const walletId = parseInt(String(formData.get("wallet_id") ?? ""), 10);
  const idr = digits(formData.get("idr"));
  const fx = units(formData.get("units"));
  if (!accountId || !walletId || idr <= 0 || fx <= 0) return;

  const { data: acct } = await sb.from("forex_accounts").select("currency, units").eq("id", accountId).maybeSingle();
  if (!acct) return;
  const occurred_on = new Date().toISOString().slice(0, 10);
  const dir = direction === "sell" ? "sell" : "buy";

  // The IDR side moves a real wallet (so wallet balances stay correct); the foreign side
  // is tracked separately and is NOT added to networth.
  let txnId: number | null = null;
  if (dir === "sell") {
    const ins = await sb.from("transactions").insert({
      occurred_on, type: "income", amount: idr, description: `Sell ${acct.currency} (forex)`,
      category_id: null, dest_wallet_id: walletId,
    }).select("id").single();
    txnId = ins.data?.id ?? null;
    await sb.from("forex_accounts").update({ units: Math.max(0, Number(acct.units) - fx) }).eq("id", accountId);
  } else {
    const ins = await sb.from("transactions").insert({
      occurred_on, type: "investment", amount: idr, description: `Buy ${acct.currency} (forex)`,
      category_id: null, source_wallet_id: walletId,
    }).select("id").single();
    txnId = ins.data?.id ?? null;
    await sb.from("forex_accounts").update({ units: Number(acct.units) + fx }).eq("id", accountId);
  }

  await sb.from("forex_transactions").insert({
    account_id: accountId, occurred_on, direction: dir, idr, units: fx, wallet_id: walletId, txn_id: txnId,
  });

  revalidatePath("/more/forex");
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

// Correct a forex holding's balance directly (no transaction booked).
export async function setForexUnits(accountId: number, formData: FormData) {
  await supabaseServer().from("forex_accounts").update({ units: units(formData.get("units")) }).eq("id", accountId);
  revalidatePath("/more/forex");
  revalidatePath("/dashboard");
}

// ---- Loans ----
export async function addLoan(formData: FormData) {
  const person = String(formData.get("person") ?? "").trim();
  if (!person) return;
  const sb = supabaseServer();
  const { data: loan } = await sb
    .from("loans")
    .insert({
      person,
      note: String(formData.get("note") ?? "").trim() || null,
      installment: digits(formData.get("installment")),
      lender: String(formData.get("lender") ?? "").trim() || null,
    })
    .select("id")
    .single();

  // Optionally lay out the promised months: from a start month, for N months (any year).
  const start = monthDate(formData.get("start_month"));
  const count = digits(formData.get("months"));
  if (loan && start && count > 0) {
    const rows = [];
    for (let i = 0; i < Math.min(count, 60); i++) {
      rows.push({ loan_id: loan.id, period_month: addMonthsISO(start, i), paid: false });
    }
    if (rows.length) await sb.from("loan_payments").insert(rows);
  }

  revalidatePath("/more/loans");
  revalidatePath("/dashboard");
}

export async function deleteLoan(id: number) {
  await supabaseServer().from("loans").delete().eq("id", id);
  revalidatePath("/more/loans");
}

// Add a month to a loan's promised schedule (edit mode) — starts as "owed".
export async function scheduleMonth(loanId: number, periodMonth: string) {
  const sb = supabaseServer();
  const { data } = await sb
    .from("loan_payments")
    .select("id")
    .eq("loan_id", loanId)
    .eq("period_month", periodMonth)
    .maybeSingle();
  if (!data) {
    await sb.from("loan_payments").insert({ loan_id: loanId, period_month: periodMonth, paid: false });
  }
  revalidatePath("/more/loans");
  revalidatePath("/dashboard");
}

// Remove a month from the promised schedule (edit mode) — only if not yet collected.
export async function unscheduleMonth(loanId: number, periodMonth: string) {
  const sb = supabaseServer();
  const { data } = await sb
    .from("loan_payments")
    .select("id, paid")
    .eq("loan_id", loanId)
    .eq("period_month", periodMonth)
    .maybeSingle();
  if (data && !data.paid) await sb.from("loan_payments").delete().eq("id", data.id);
  revalidatePath("/more/loans");
  revalidatePath("/dashboard");
}

// Un-collect: drop a collected month back to "owed" and delete its income record
// (the month stays in the schedule, since it's still promised).
export async function uncollectLoanPayment(loanId: number, periodMonth: string) {
  const sb = supabaseServer();
  const { data } = await sb
    .from("loan_payments")
    .select("id, income_txn_id")
    .eq("loan_id", loanId)
    .eq("period_month", periodMonth)
    .maybeSingle();
  if (data) {
    if (data.income_txn_id) await sb.from("transactions").delete().eq("id", data.income_txn_id);
    await sb.from("loan_payments").update({ paid: false, income_txn_id: null }).eq("id", data.id);
  }
  revalidatePath("/more/loans");
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

// Mark a month as collected AND book it as Hutang income into the chosen wallet.
export async function collectLoanPayment(loanId: number, periodMonth: string, walletId: number, dateISO: string) {
  const sb = supabaseServer();
  const occurred_on = /^\d{4}-\d{2}-\d{2}$/.test(dateISO) ? dateISO : new Date().toISOString().slice(0, 10);

  // 1) ensure the cell exists and is marked paid; get its id
  const { data: existing } = await sb
    .from("loan_payments")
    .select("id")
    .eq("loan_id", loanId)
    .eq("period_month", periodMonth)
    .maybeSingle();
  let paymentId = existing?.id;
  if (paymentId) {
    await sb.from("loan_payments").update({ paid: true }).eq("id", paymentId);
  } else {
    const ins = await sb
      .from("loan_payments")
      .insert({ loan_id: loanId, period_month: periodMonth, paid: true })
      .select("id")
      .single();
    paymentId = ins.data?.id;
  }

  // 2) book the collected amount as Hutang income and link it to the cell
  const { data: loan } = await sb.from("loans").select("person, installment").eq("id", loanId).maybeSingle();
  if (loan && walletId) {
    let { data: cat } = await sb
      .from("categories")
      .select("id")
      .eq("kind", "income")
      .eq("name", "Hutang")
      .maybeSingle();
    if (!cat) {
      const ins = await sb.from("categories").insert({ kind: "income", name: "Hutang" }).select("id").single();
      cat = ins.data;
    }
    const txn = await sb
      .from("transactions")
      .insert({
        occurred_on,
        type: "income",
        amount: loan.installment,
        description: loan.person,
        category_id: cat?.id ?? null,
        dest_wallet_id: walletId,
      })
      .select("id")
      .single();
    if (paymentId && txn.data?.id) {
      await sb.from("loan_payments").update({ income_txn_id: txn.data.id }).eq("id", paymentId);
    }
  }

  revalidatePath("/more/loans");
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

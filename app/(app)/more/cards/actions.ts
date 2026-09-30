"use server";

import { revalidatePath, updateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { TAGS } from "@/lib/cacheTags";
import { getCreditCards } from "@/lib/creditCards";
import { getWallets } from "@/lib/data";
import { resolveCategoryId, unmappedError } from "@/lib/settings";

// Local helpers — three lines each, kept per action file by design (ATLAS.md §11).
const digits = (v: FormDataEntryValue | null) =>
  parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
const optInt = (v: FormDataEntryValue | null) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const decimal = (v: FormDataEntryValue | null) =>
  parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export interface CardState {
  ok?: boolean;
  error?: string;
  nonce?: number;
}

function revalidateCards() {
  revalidatePath("/more/cards");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/charts");
  revalidatePath("/balances");
  revalidatePath("/more/budgets");
}

/** The terms shared by add and edit, validated. */
function parseTerms(formData: FormData):
  | { error: string }
  | {
      terms: {
        credit_limit: number;
        statement_day: number;
        due_day: number;
        interest_rate: number;
        min_pct: number;
        min_floor: number;
        provider_id: number | null;
        admin_fee_pct: number;
        min_covers_charges: boolean;
        late_fee: boolean;
      };
    } {
  const statementDay = parseInt(text(formData.get("statement_day")), 10);
  const dueDay = parseInt(text(formData.get("due_day")), 10);
  const interestRate = decimal(formData.get("interest_rate"));
  const minPct = decimal(formData.get("min_pct"));
  const adminFeePct = decimal(formData.get("admin_fee_pct"));

  const isDay = (n: number) => Number.isInteger(n) && n >= 1 && n <= 31;
  if (!isDay(statementDay)) return { error: "The statement day is a day of the month, 1 to 31." };
  if (!isDay(dueDay)) return { error: "The due day is a day of the month, 1 to 31." };
  if (dueDay === statementDay) return { error: "The due day can't be the statement day." };
  if (!(interestRate >= 0 && interestRate <= 10)) {
    return { error: "Enter the interest as a percent per month, e.g. 1.75." };
  }
  if (!(minPct > 0 && minPct <= 100)) {
    return { error: "Enter the minimum payment as a percent of the bill, e.g. 5." };
  }
  if (!(adminFeePct >= 0 && adminFeePct <= 20)) {
    return { error: "Enter the admin fee as a percent per month, e.g. 3.99 — or 0 for none." };
  }

  return {
    terms: {
      credit_limit: digits(formData.get("credit_limit")),
      statement_day: statementDay,
      due_day: dueDay,
      interest_rate: interestRate,
      min_pct: minPct,
      min_floor: digits(formData.get("min_floor")),
      provider_id: optInt(formData.get("provider_id")),
      admin_fee_pct: adminFeePct,
      min_covers_charges: formData.get("min_covers_charges") === "on",
      late_fee: formData.get("late_fee") === "on",
    },
  };
}

// =============================================================================
// Cards
// =============================================================================

/**
 * Add a card: its wallet, then its terms.
 *
 * The card is a wallet so every existing path — the Add sheet's "Paid from", transfers, net
 * worth, charts — handles it without knowing cards exist. An existing wallet can be turned into
 * a card instead, for anyone who already logged purchases against one.
 */
export async function addCreditCard(
  _prev: CardState,
  formData: FormData
): Promise<CardState> {
  const existingId = optInt(formData.get("wallet_id"));
  const name = text(formData.get("name"));
  if (!existingId && !name) return { error: "Name the card." };

  const parsed = parseTerms(formData);
  if ("error" in parsed) return { error: parsed.error };

  const sb = supabaseServer();
  let walletId = existingId;

  if (walletId) {
    const cards = await getCreditCards();
    if (cards.some((c) => c.wallet_id === walletId)) {
      return { error: "That wallet is already a card." };
    }
  } else {
    const { data: last } = await sb
      .from("wallets")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: wallet, error } = await sb
      .from("wallets")
      .insert({ name, sort_order: Number(last?.sort_order ?? -1) + 1 })
      .select("id")
      .single();
    if (error || !wallet) {
      return {
        error:
          error?.code === "23505"
            ? `A wallet named ${name} already exists — pick it under "Existing wallet" instead.`
            : "Could not create the card's wallet.",
      };
    }
    walletId = Number(wallet.id);
  }

  const { error } = await sb
    .from("credit_cards")
    .insert({ wallet_id: walletId, ...parsed.terms });
  if (error) {
    // Don't leave a wallet behind for a card that was never saved.
    if (!existingId) await sb.from("wallets").delete().eq("id", walletId);
    return { error: "Could not save the card." };
  }

  // A new wallet feeds every wallet picker, the Add sheet's included.
  updateTag(TAGS.wallets);
  revalidatePath("/more/wallets");
  revalidatePath("/", "layout");
  revalidateCards();
  return { ok: true, nonce: Date.now() };
}

export async function updateCreditCard(
  id: number,
  _prev: CardState,
  formData: FormData
): Promise<CardState> {
  const parsed = parseTerms(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabaseServer()
    .from("credit_cards")
    .update(parsed.terms)
    .eq("id", id);
  if (error) return { error: "Could not save those terms." };

  revalidateCards();
  return { ok: true, nonce: Date.now() };
}

/**
 * Stop treating a wallet as a card. Only the terms go: the wallet and every purchase and
 * payment recorded against it stay, so nothing in the ledger moves.
 */
export async function removeCreditCard(id: number): Promise<void> {
  await supabaseServer().from("credit_cards").delete().eq("id", id);
  revalidateCards();
}

// =============================================================================
// Money
// =============================================================================

async function cardWallet(cardId: number | null) {
  if (!cardId) return null;
  const [cards, wallets] = await Promise.all([getCreditCards(), getWallets(true)]);
  const card = cards.find((c) => c.id === cardId);
  const wallet = card ? wallets.find((w) => w.id === card.wallet_id) : null;
  return card && wallet ? { card, wallet, cards } : null;
}

/**
 * Pay the card: a `transfer` from a cash wallet into it.
 *
 * Not an expense — every purchase on the card was already booked as one when it was made, so
 * booking the payment too would count the spending twice. The transfer only moves the debt:
 * the cash wallet falls, the card's negative balance rises toward zero, and net worth stays put.
 */
export async function payCreditCard(
  _prev: CardState,
  formData: FormData
): Promise<CardState> {
  const found = await cardWallet(optInt(formData.get("card_id")));
  if (!found) return { error: "Choose a card." };

  const amount = digits(formData.get("amount"));
  const walletId = optInt(formData.get("wallet_id"));
  const occurredOn = text(formData.get("occurred_on"));

  if (amount <= 0) return { error: "Enter how much you paid." };
  if (!walletId) return { error: "Choose the wallet you paid from." };
  if (found.cards.some((c) => c.wallet_id === walletId)) {
    return { error: "Pay a card from a cash wallet, not another card." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Pick a date." };

  const { error } = await supabaseServer().from("transactions").insert({
    occurred_on: occurredOn,
    type: "transfer",
    amount,
    description: `Pay ${found.wallet.name}`,
    category_id: null,
    source_wallet_id: walletId,
    dest_wallet_id: found.card.wallet_id,
  });
  if (error) return { error: "Could not record that payment." };

  revalidateCards();
  return { ok: true, nonce: Date.now() };
}

/**
 * Record interest or a fee from the bill: an `expense` charged to the card, so it adds to what
 * is owed exactly the way the bank adds it, and shows up as spending in its own category.
 *
 * A refundable admin fee is recorded only once it stops being refundable — the bill was not
 * paid in full on time. Until then the page carries it as an estimate on the statement.
 */
export async function chargeCreditCard(
  _prev: CardState,
  formData: FormData
): Promise<CardState> {
  const found = await cardWallet(optInt(formData.get("card_id")));
  if (!found) return { error: "Choose a card." };

  const kind = text(formData.get("kind")) === "fee" ? "fee" : "interest";
  const amount = digits(formData.get("amount"));
  const occurredOn = text(formData.get("occurred_on"));

  if (amount <= 0) return { error: `Enter the ${kind} on the bill.` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Pick a date." };

  const key = kind === "fee" ? "cat_card_fee" : "cat_card_interest";
  const categoryId = await resolveCategoryId(key);
  if (categoryId === null) return { error: unmappedError(key) };

  const { error } = await supabaseServer().from("transactions").insert({
    occurred_on: occurredOn,
    type: "expense",
    amount,
    description: `${kind === "fee" ? "Fee" : "Interest"} ${found.wallet.name}`,
    category_id: categoryId,
    source_wallet_id: found.card.wallet_id,
    dest_wallet_id: null,
  });
  if (error) return { error: `Could not record that ${kind}.` };

  revalidateCards();
  return { ok: true, nonce: Date.now() };
}

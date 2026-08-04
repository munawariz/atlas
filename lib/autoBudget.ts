import "server-only";

import {
  getLoanPayments,
  getLoans,
  getPaylaterItems,
  getPaylaterProviders,
} from "./data";
import { getCategories } from "./data";
import { getSettings, mappedCategoryId } from "./settings";

/**
 * Budgets that are DERIVED rather than entered.
 *
 * Two categories of spend/income are already fully described elsewhere in the app, so asking
 * the user to also type a budget for them would be asking them to keep two numbers in sync:
 *
 *  - loan collection — the schedule already says what is expected this month;
 *  - each installment category — the active items already say what is due.
 *
 * Both render as read-only rows with an `auto` badge wherever budgets are shown.
 */

export interface AutoBudget {
  category_id: number;
  amount: number;
  /** Shown under the row so the number is explainable, e.g. "3 loans scheduled". */
  note: string;
}

/** Expected loan collection for a month, from the payment schedule. */
export async function loanAutoBudget(
  monthKey: string
): Promise<AutoBudget | null> {
  const [settings, categories] = await Promise.all([
    getSettings(),
    getCategories(true),
  ]);
  const categoryId = mappedCategoryId(settings, categories, "cat_loan");
  // Unmapped is a real, handled state: the read path degrades quietly (ATLAS.md §8).
  if (categoryId === null) return null;

  const [loans, payments] = await Promise.all([getLoans(), getLoanPayments()]);
  const installmentOf = new Map(loans.map((l) => [l.id, l.installment]));

  let total = 0;
  let count = 0;
  for (const payment of payments) {
    if (payment.period_month !== monthKey) continue;
    // A partial collection stores what was actually taken; otherwise the full installment
    // is what is expected.
    total += payment.amount ?? installmentOf.get(payment.loan_id) ?? 0;
    count += 1;
  }

  if (count === 0) return null;
  return {
    category_id: categoryId,
    amount: total,
    note: `${count} scheduled ${count === 1 ? "month" : "months"}`,
  };
}

/** True while `monthKey` falls inside an item's first..last window, inclusive. */
export function itemActiveIn(
  item: { first_month_date: string; last_month_date: string },
  monthKey: string
): boolean {
  return item.first_month_date <= monthKey && monthKey <= item.last_month_date;
}

/**
 * Expected installment spend this month, keyed by each provider's own category.
 *
 * Items with no provider are returned separately — they still cost money, they just have no
 * category to book against, so the cashflow page shows them on their own line.
 */
export async function installmentAutoBudgets(monthKey: string): Promise<{
  byCategory: Map<number, AutoBudget>;
  unassigned: { amount: number; count: number };
}> {
  const [items, providers] = await Promise.all([
    getPaylaterItems(),
    getPaylaterProviders(true),
  ]);
  const categoryOf = new Map(providers.map((p) => [p.id, p.category_id]));

  const byCategory = new Map<number, AutoBudget>();
  const unassigned = { amount: 0, count: 0 };

  for (const item of items) {
    if (!itemActiveIn(item, monthKey)) continue;

    const categoryId =
      item.provider_id != null ? categoryOf.get(item.provider_id) : null;

    if (categoryId == null) {
      unassigned.amount += item.monthly_amount;
      unassigned.count += 1;
      continue;
    }

    const existing = byCategory.get(categoryId);
    if (existing) {
      existing.amount += item.monthly_amount;
      const n = parseInt(existing.note, 10) + 1;
      existing.note = `${n} active items`;
    } else {
      byCategory.set(categoryId, {
        category_id: categoryId,
        amount: item.monthly_amount,
        note: "1 active item",
      });
    }
  }

  return { byCategory, unassigned };
}

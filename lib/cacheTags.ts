/**
 * Data-cache tags for the slow-moving tables — the ones cached across requests with
 * `unstable_cache` and flushed by `revalidateTag` from the actions that write them.
 *
 * Deliberately NOT tagged/cached: transactions, deltas, balances, budgets, trades, loans,
 * paylater items/payments. Those change on everyday writes; their queries are month-scoped
 * and cheap, and the invalidation surface isn't worth it.
 */
export const TAGS = {
  wallets: "wallets",
  categories: "categories",
  categoryGroups: "category-groups",
  groupMembers: "group-members",
  paylaterProviders: "paylater-providers",
  appSettings: "app-settings",
} as const;

export const ALL_TAGS: string[] = Object.values(TAGS);

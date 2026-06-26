import "server-only";
import { supabaseServer } from "./supabaseServer";
import type { Category } from "./types";

// Categories used by automated transactions. `default` is the seeded fallback name so a
// fresh clone (or one that hasn't configured settings) still works out of the box.
export const CATEGORY_SETTINGS = [
  { key: "cat_loan", label: "Loan collection", kind: "income", default: "Hutang", help: "Income booked when you collect a loan payment" },
  { key: "cat_stock", label: "Stock holding", kind: "investment", default: "Stock", help: "Bucket money moves into when buying/selling stocks" },
  { key: "cat_stock_profit", label: "Stock realized profit", kind: "income", default: "Trading", help: "Income when a stock is sold at a gain" },
  { key: "cat_stock_loss", label: "Stock realized loss", kind: "expense", default: "Cut Loss", help: "Expense when a stock is sold at a loss" },
  { key: "cat_bond", label: "Bond holding", kind: "investment", default: "Bonds", help: "Bucket money moves into when buying/selling bonds" },
  { key: "cat_bond_coupon", label: "Bond coupon", kind: "income", default: "Kupon", help: "Income when you log a bond coupon" },
  { key: "cat_forex", label: "Forex holding", kind: "investment", default: "Forex", help: "Bucket money moves into when buying/selling forex" },
  { key: "cat_forex_profit", label: "Forex realized profit", kind: "income", default: "Forex Profit", help: "Income when forex is sold at a gain" },
  { key: "cat_forex_loss", label: "Forex realized loss", kind: "expense", default: "Forex Loss", help: "Expense when forex is sold at a loss" },
] as const;

export const WALLET_SETTINGS = [
  { key: "wallet_stock", label: "Default stock wallet", match: "stockbit", help: "Pre-selected when buying/selling stocks" },
  { key: "wallet_bond", label: "Default bond wallet", match: "", help: "Pre-selected when buying/selling bonds" },
] as const;

export const SETTING_KEYS = [...CATEGORY_SETTINGS.map((s) => s.key), ...WALLET_SETTINGS.map((s) => s.key)];

export async function getSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabaseServer().from("app_settings").select("key, value");
  if (error && error.code !== "42P01") throw error; // tolerate table not migrated yet
  const out: Record<string, string> = {};
  for (const r of (data ?? []) as { key: string; value: string | null }[]) if (r.value) out[r.key] = r.value;
  return out;
}

/**
 * Resolve the category id for an auto-transaction: the configured one if set & still
 * exists, else look up by the default name (creating it if missing). Used in action paths.
 */
export async function resolveCategoryId(key: string, defaultName: string, kind: string): Promise<number | null> {
  const sb = supabaseServer();
  const { data: setting } = await sb.from("app_settings").select("value").eq("key", key).maybeSingle();
  const id = setting?.value ? parseInt(setting.value, 10) : NaN;
  if (Number.isFinite(id) && id > 0) {
    const { data: exists } = await sb.from("categories").select("id").eq("id", id).maybeSingle();
    if (exists) return id;
  }
  let { data: cat } = await sb.from("categories").select("id").eq("kind", kind).eq("name", defaultName).maybeSingle();
  if (!cat) {
    const ins = await sb.from("categories").insert({ kind, name: defaultName }).select("id").single();
    cat = ins.data;
  }
  return cat?.id ?? null;
}

/** Pure resolver for read paths (dashboard/budgets) given preloaded settings + categories. */
export function mappedCategoryId(
  settings: Record<string, string>,
  cats: Category[],
  key: string,
  defaultName: string,
  kind: string
): number | null {
  const v = settings[key];
  if (v) {
    const id = parseInt(v, 10);
    if (cats.some((c) => c.id === id)) return id;
  }
  return cats.find((c) => c.kind === kind && c.name === defaultName)?.id ?? null;
}

/** Pure resolver for a default wallet: configured id, else a name hint, else the first wallet. */
export function mappedWalletId(
  settings: Record<string, string>,
  wallets: { id: number; name: string }[],
  key: string,
  matchHint: string
): number | null {
  const v = settings[key];
  if (v) {
    const id = parseInt(v, 10);
    if (wallets.some((w) => w.id === id)) return id;
  }
  if (matchHint) {
    const m = wallets.find((w) => w.name.toLowerCase().includes(matchHint));
    if (m) return m.id;
  }
  return wallets[0]?.id ?? null;
}

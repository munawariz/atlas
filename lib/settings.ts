import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabaseServer, isMissingTable } from "./supabaseServer";
import { TAGS } from "./cacheTags";
import { getCategories, getWallets } from "./data";
import type { Category, CategoryKind, Wallet } from "./types";

/**
 * The single point where the app decides which category an automated transaction uses.
 *
 * NO CATEGORY NAME MAY APPEAR ANYWHERE ELSE IN THE CODEBASE (ATLAS.md §14.14) — not in an
 * action, not in a page, not in a migration. Everything resolves through `app_settings` by id.
 * A name in application code will one day create a duplicate category against a database that
 * named things differently, silently splitting history in two.
 *
 * Note what is absent below: no `default` name, no `match` hint. A key is either mapped to a
 * real category id or it is unmapped. There is no third state where the app guesses.
 */

export interface CategorySetting {
  key: string;
  label: string;
  kind: CategoryKind;
  help: string;
  /** Needed only when the user enters the amount it books, so it never raises the setup banner. */
  optional?: boolean;
}

export const CATEGORY_SETTINGS: CategorySetting[] = [
  {
    key: "cat_loan",
    label: "Loan collection",
    kind: "income",
    help: "Income booked when you collect a month of a loan someone owes you.",
  },
  {
    key: "cat_stock",
    label: "Stock holding",
    kind: "investment",
    help: "The bucket your stock purchases move money into.",
  },
  {
    key: "cat_stock_profit",
    label: "Stock realized profit",
    kind: "income",
    help: "Income booked when you sell a stock above its average cost.",
  },
  {
    key: "cat_stock_loss",
    label: "Stock realized loss",
    kind: "expense",
    help: "Expense booked when you sell a stock below its average cost.",
  },
  {
    key: "cat_stock_dividend",
    label: "Stock dividend",
    kind: "income",
    help: "Income booked when you log a dividend.",
  },
  {
    key: "cat_bond",
    label: "Bond holding",
    kind: "investment",
    help: "The bucket your bond principal moves into.",
  },
  {
    key: "cat_bond_coupon",
    label: "Bond coupon",
    kind: "income",
    help: "Income booked when a bond pays a coupon.",
  },
  {
    key: "cat_forex",
    label: "Forex holding",
    kind: "investment",
    help: "The bucket your foreign-currency purchases move money into.",
  },
  {
    key: "cat_forex_profit",
    label: "Forex realized profit",
    kind: "income",
    help: "Income booked when you sell foreign currency above its average cost.",
  },
  {
    key: "cat_forex_loss",
    label: "Forex realized loss",
    kind: "expense",
    help: "Expense booked when you sell foreign currency below its average cost.",
  },
  {
    key: "cat_crypto",
    label: "Crypto holding",
    kind: "investment",
    help: "The bucket your coin purchases move money into.",
  },
  {
    key: "cat_crypto_profit",
    label: "Crypto realized profit",
    kind: "income",
    help: "Income booked when you sell a coin above its average cost.",
  },
  {
    key: "cat_crypto_loss",
    label: "Crypto realized loss",
    kind: "expense",
    help: "Expense booked when you sell a coin below its average cost.",
  },
  {
    key: "cat_etf",
    label: "ETF holding",
    kind: "investment",
    help: "The bucket a broker top-up moves rupiah into. Buys, sells and dividends stay in USD.",
  },
  {
    key: "cat_etf_profit",
    label: "ETF realized profit",
    kind: "income",
    help: "Income booked when USD withdrawn from a broker is worth more rupiah than it cost.",
  },
  {
    key: "cat_etf_loss",
    label: "ETF realized loss",
    kind: "expense",
    help: "Expense booked when USD withdrawn from a broker is worth less rupiah than it cost.",
  },
  {
    key: "cat_etf_fee",
    label: "ETF conversion fee",
    kind: "expense",
    help: "Expense booked when a broker top-up or withdrawal carries a conversion fee.",
    optional: true,
  },
  {
    key: "cat_etf_tax",
    label: "ETF tax",
    kind: "expense",
    help: "Expense booked when a broker top-up or withdrawal carries tax.",
    optional: true,
  },
  {
    key: "cat_admin_fee",
    label: "Transfer admin fee",
    kind: "expense",
    help: "Expense booked when a transfer includes an admin fee.",
  },
  {
    key: "cat_card_interest",
    label: "Credit card interest",
    kind: "expense",
    help: "Expense charged to a card when you record the interest on its bill.",
    optional: true,
  },
  {
    key: "cat_card_fee",
    label: "Credit card fee",
    kind: "expense",
    help: "Expense charged to a card when you record a late, annual or other fee on its bill.",
    optional: true,
  },
];

export interface WalletSetting {
  key: string;
  label: string;
  help: string;
}

export const WALLET_SETTINGS: WalletSetting[] = [
  {
    key: "wallet_stock",
    label: "Default stock wallet",
    help: "Pre-selected on the stock trade form.",
  },
  {
    key: "wallet_bond",
    label: "Default bond wallet",
    help: "Pre-selected on the bond trade form.",
  },
  {
    key: "wallet_crypto",
    label: "Default crypto wallet",
    help: "Pre-selected on the crypto trade form.",
  },
  {
    key: "wallet_etf",
    label: "Default ETF top-up wallet",
    help: "Pre-selected when topping up or withdrawing from a broker.",
  },
];

/**
 * Ordered candidate names per key. The FIRST case-insensitive exact match on a category of the
 * right kind wins.
 *
 * This is the ONLY place name-matching is allowed, it runs interactively from the Auto-detect
 * button, and it never writes without the user confirming. The legacy Indonesian names are
 * deliberate — they are what lets an existing database adopt this build without duplicates
 * (ATLAS.md §18) — and they cost nothing, because these strings are never consulted at runtime.
 */
export const DETECT_HINTS: Record<string, string[]> = {
  cat_loan: ["Loan Repayment", "Loan Collection", "Hutang"],
  cat_stock: ["Stock", "Stocks", "Saham"],
  cat_stock_profit: ["Trading Profit", "Trading", "Realized Gain"],
  cat_stock_loss: ["Realized Loss", "Cut Loss", "Trading Loss"],
  cat_stock_dividend: ["Dividend", "Dividends", "Dividen"],
  cat_bond: ["Bonds", "Bond", "Obligasi"],
  cat_bond_coupon: ["Bond Coupon", "Coupon", "Kupon"],
  cat_forex: ["Forex", "FX", "Foreign Currency"],
  cat_forex_profit: ["Forex Profit", "FX Profit"],
  cat_forex_loss: ["Forex Loss", "FX Loss"],
  cat_crypto: ["Crypto", "Cryptocurrency", "Kripto"],
  cat_crypto_profit: ["Crypto Profit", "Crypto Gain"],
  cat_crypto_loss: ["Crypto Loss"],
  cat_etf: ["ETF", "ETFs", "US ETF"],
  cat_etf_profit: ["ETF Profit", "ETF Gain"],
  cat_etf_loss: ["ETF Loss"],
  cat_etf_fee: ["ETF Fee", "Conversion Fee", "Broker Fee"],
  cat_etf_tax: ["Tax", "Taxes", "Pajak"],
  cat_admin_fee: ["Admin Fee", "Bank Fee", "Biaya Admin", "Admin"],
  cat_card_interest: ["Card Interest", "Credit Card Interest", "Interest", "Bunga Kartu Kredit", "Bunga"],
  cat_card_fee: ["Card Fee", "Credit Card Fee", "Late Fee", "Annual Fee", "Denda", "Iuran Tahunan"],
};

// =============================================================================
// Read
// =============================================================================

// Cached across requests (settings change only through the settings actions, which flush the
// tag) and deduped per request. The inner fetcher throws on a missing table — thrown results
// are never cached, so a fresh DB isn't stuck with a cached {} once migrated. Note that
// getOpeningMonth's render-time self-heal upsert cannot flush this tag (revalidateTag is
// forbidden during render); that's safe because its fallback derivation is deterministic.
const fetchSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const sb = supabaseServer();
    const { data, error } = await sb.from("app_settings").select("key, value");
    if (error) throw error;
    const settings: Record<string, string> = {};
    for (const row of (data ?? []) as { key: string; value: string | null }[]) {
      if (row.value != null) settings[row.key] = row.value;
    }
    return settings;
  },
  ["all-app-settings"],
  { tags: [TAGS.appSettings] }
);

export const getSettings = cache(async (): Promise<Record<string, string>> => {
  try {
    return await fetchSettings();
  } catch (error) {
    if (isMissingTable(error as { code?: string })) return {};
    throw error;
  }
});

export async function getSetting(key: string): Promise<string | null> {
  const settings = await getSettings();
  return settings[key] ?? null;
}

/**
 * Pure read path — no writes, no guessing.
 *
 * Returns null when the key is unmapped OR when the mapped id points at a category that no
 * longer exists. A stale id from a deleted category counts as unmapped.
 */
export function mappedCategoryId(
  settings: Record<string, string>,
  categories: Category[],
  key: string
): number | null {
  const raw = settings[key];
  if (!raw) return null;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id)) return null;
  return categories.some((c) => c.id === id) ? id : null;
}

export function mappedWalletId(
  settings: Record<string, string>,
  wallets: Wallet[],
  key: string
): number | null {
  const raw = settings[key];
  if (!raw) return null;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id)) return null;
  return wallets.some((w) => w.id === id) ? id : null;
}

/**
 * Write path — used inside server actions. NEVER creates a category.
 *
 * Returns null rather than inventing anything, so the caller can refuse with a readable
 * message and write nothing at all.
 */
export async function resolveCategoryId(key: string): Promise<number | null> {
  const [settings, categories] = await Promise.all([
    getSettings(),
    getCategories(true),
  ]);
  return mappedCategoryId(settings, categories, key);
}

export async function resolveWalletId(key: string): Promise<number | null> {
  const [settings, wallets] = await Promise.all([
    getSettings(),
    getWallets(true),
  ]);
  return mappedWalletId(settings, wallets, key);
}

/** The standard refusal copy. Every automated action uses this, so the wording never drifts. */
export function unmappedError(key: string): string {
  const label = CATEGORY_SETTINGS.find((s) => s.key === key)?.label ?? key;
  return `No category is mapped for "${label}". Set it in More → Settings.`;
}

/** Which required keys are still unmapped. Drives the dashboard setup banner. */
export async function missingSettings(): Promise<
  { key: string; label: string; kind: string }[]
> {
  const [settings, categories] = await Promise.all([
    getSettings(),
    getCategories(true),
  ]);
  return CATEGORY_SETTINGS.filter(
    (setting) =>
      !setting.optional &&
      mappedCategoryId(settings, categories, setting.key) === null
  ).map(({ key, label, kind }) => ({ key, label, kind }));
}

// =============================================================================
// Write
// =============================================================================

/**
 * Persist a set of key/value settings.
 *
 * A BLANK VALUE DELETES THE ROW rather than being filtered out — otherwise a mapping is
 * impossible to clear once set, and the Settings page's "— not set —" option is a lie.
 */
export async function saveSettings(
  entries: Record<string, string>
): Promise<void> {
  const sb = supabaseServer();

  const upserts: { key: string; value: string }[] = [];
  const deletes: string[] = [];

  for (const [key, value] of Object.entries(entries)) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) upserts.push({ key, value: trimmed });
    else deletes.push(key);
  }

  if (upserts.length > 0) {
    const { error } = await sb
      .from("app_settings")
      .upsert(upserts, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }

  if (deletes.length > 0) {
    const { error } = await sb.from("app_settings").delete().in("key", deletes);
    if (error) throw new Error(error.message);
  }
}

/**
 * Run DETECT_HINTS against the existing categories.
 *
 * Returns proposals only — the Settings page fills its selects with these and the user presses
 * Save. Nothing is written here, and no category is ever created.
 */
export async function autoDetectSettings(): Promise<{
  matched: Record<string, number>;
  unmatched: string[];
}> {
  const categories = await getCategories(true);
  const matched: Record<string, number> = {};
  const unmatched: string[] = [];

  for (const setting of CATEGORY_SETTINGS) {
    const candidates = DETECT_HINTS[setting.key] ?? [];
    const hit = candidates
      .map((name) =>
        categories.find(
          (c) =>
            c.kind === setting.kind &&
            c.name.toLowerCase() === name.toLowerCase()
        )
      )
      .find(Boolean);

    if (hit) matched[setting.key] = hit.id;
    else unmatched.push(setting.label);
  }

  return { matched, unmatched };
}

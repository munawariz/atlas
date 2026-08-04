"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDateShort, formatNumber, formatRupiah } from "@/lib/format";
import { TXN_TYPES, type Category, type Transaction, type TxnType, type Wallet } from "@/lib/types";
import { Search, X, Check } from "@/components/icons";
import { bulkUpdateTransactions } from "./actions";

const FILTERS_KEY = "ft_history_filters";

/** Sign prefix + colour per type. Money in is positive-500; money out stays near-black. */
const TYPE_STYLE: Record<TxnType, { prefix: string; className: string }> = {
  expense: { prefix: "−", className: "text-negative-600" },
  income: { prefix: "+", className: "text-positive-600" },
  saving: { prefix: "→", className: "text-info-600" },
  investment: { prefix: "→", className: "text-forest-800" },
  withdrawal: { prefix: "←", className: "text-info-600" },
  transfer: { prefix: "", className: "text-ink-800" },
};

interface HistoryClientProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  monthKey: string;
}

interface Filters {
  query: string;
  type: string;
  categoryId: string;
}

const EMPTY_FILTERS: Filters = { query: "", type: "", categoryId: "" };

export default function HistoryClient({
  transactions,
  categories,
  wallets,
  monthKey,
}: HistoryClientProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [hydrated, setHydrated] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const walletById = useMemo(
    () => new Map(wallets.map((w) => [w.id, w])),
    [wallets]
  );

  // --- Restore, THEN persist (ATLAS.md §14.8) --------------------------------
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FILTERS_KEY);
      if (raw) setFilters({ ...EMPTY_FILTERS, ...JSON.parse(raw) });
    } catch {
      // Ignore corrupt state and start clean.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    } catch {
      // Non-fatal.
    }
  }, [filters, hydrated]);

  /**
   * One lowercase haystack per row — note, category, both wallets, and the amount both raw
   * and formatted. Typing then costs a single substring check instead of re-deriving names.
   */
  const searchIndex = useMemo(() => {
    const index = new Map<number, string>();
    for (const txn of transactions) {
      const parts = [
        txn.description ?? "",
        txn.category_id != null ? catById.get(txn.category_id)?.name ?? "" : "",
        txn.source_wallet_id != null
          ? walletById.get(txn.source_wallet_id)?.name ?? ""
          : "",
        txn.dest_wallet_id != null
          ? walletById.get(txn.dest_wallet_id)?.name ?? ""
          : "",
        String(txn.amount),
        formatNumber(txn.amount),
        txn.type,
      ];
      index.set(txn.id, parts.join(" ").toLowerCase());
    }
    return index;
  }, [transactions, catById, walletById]);

  /**
   * Category options are the categories present THIS month, plus whatever is currently
   * selected — so stepping to a month without that category does not silently drop the filter.
   */
  const categoryOptions = useMemo(() => {
    const ids = new Set<number>();
    for (const txn of transactions) {
      if (txn.category_id != null) ids.add(txn.category_id);
    }
    if (filters.categoryId) ids.add(parseInt(filters.categoryId, 10));
    return [...ids]
      .map((id) => catById.get(id))
      .filter((c): c is Category => Boolean(c))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions, filters.categoryId, catById]);

  const visible = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const categoryId = filters.categoryId ? parseInt(filters.categoryId, 10) : null;

    return transactions
      .filter((txn) => {
        if (filters.type && txn.type !== filters.type) return false;
        if (categoryId && txn.category_id !== categoryId) return false;
        if (query && !(searchIndex.get(txn.id) ?? "").includes(query)) return false;
        return true;
      })
      .sort((a, b) =>
        a.occurred_on === b.occurred_on
          ? b.id - a.id
          : a.occurred_on < b.occurred_on
            ? 1
            : -1
      );
  }, [transactions, filters, searchIndex]);

  // Group by day for the date headers.
  const groups = useMemo(() => {
    const byDay = new Map<string, Transaction[]>();
    for (const txn of visible) {
      const list = byDay.get(txn.occurred_on);
      if (list) list.push(txn);
      else byDay.set(txn.occurred_on, [txn]);
    }
    return [...byDay.entries()];
  }, [visible]);

  // Bulk edit only makes sense within a single type, so the first pick fixes the type.
  const selectedRows = visible.filter((t) => selected.has(t.id));
  const selectedType = selectedRows[0]?.type ?? null;

  function toggleRow(txn: Transaction) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(txn.id)) next.delete(txn.id);
      else if (!selectedType || selectedType === txn.type) next.add(txn.id);
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function metaLine(txn: Transaction): string {
    const cat = txn.category_id != null ? catById.get(txn.category_id)?.name : null;
    const from =
      txn.source_wallet_id != null
        ? walletById.get(txn.source_wallet_id)?.name
        : null;
    const to =
      txn.dest_wallet_id != null ? walletById.get(txn.dest_wallet_id)?.name : null;

    if (txn.type === "transfer") return `${from ?? "?"} → ${to ?? "?"}`;
    if (txn.type === "withdrawal") return `${cat ?? "?"} → ${to ?? "?"}`;
    if (txn.type === "income") return [cat, to].filter(Boolean).join(" · ");
    if (txn.type === "saving" || txn.type === "investment") {
      return `${from ?? "?"} → ${cat ?? "?"}`;
    }
    return [cat, from].filter(Boolean).join(" · ");
  }

  const filtersActive =
    Boolean(filters.query) || Boolean(filters.type) || Boolean(filters.categoryId);

  return (
    <div className="space-y-4 privacy-scope">
      {/* --- Search + filters ---------------------------------------------- */}
      <div className="space-y-2">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-300">
            <Search size={18} />
          </span>
          <input
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Search notes, categories, wallets, amounts"
            aria-label="Search transactions"
            className="field pl-11"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            aria-label="Filter by type"
            className="field"
          >
            <option value="">All types</option>
            {TXN_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={filters.categoryId}
            onChange={(e) =>
              setFilters((f) => ({ ...f, categoryId: e.target.value }))
            }
            aria-label="Filter by category"
            className="field"
          >
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="label">
            {visible.length} {visible.length === 1 ? "entry" : "entries"}
          </span>
          <div className="flex items-center gap-3">
            {filtersActive && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-[13px] font-semibold text-forest-800"
              >
                Clear filters
              </button>
            )}
            <button
              type="button"
              onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
              className="text-[13px] font-semibold text-forest-800"
            >
              {selectMode ? "Done" : "Select"}
            </button>
          </div>
        </div>
      </div>

      {/* --- Bulk edit panel ------------------------------------------------ */}
      {selectMode && selectedRows.length > 0 && selectedType && (
        <BulkPanel
          ids={selectedRows.map((t) => t.id)}
          type={selectedType}
          wallets={wallets}
          categories={categories}
          onDone={exitSelect}
        />
      )}

      {/* --- Rows ------------------------------------------------------------ */}
      {groups.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
          {transactions.length === 0
            ? "Nothing recorded this month yet."
            : "No entries match those filters."}
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([day, rows]) => (
            <section key={day}>
              <h2 className="label mb-3">{formatDateShort(day)}</h2>
              <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
                {rows.map((txn, i) => {
                  const style = TYPE_STYLE[txn.type];
                  const isSelected = selected.has(txn.id);
                  const selectable = !selectedType || selectedType === txn.type;

                  const body = (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink-900">
                          {txn.description ||
                            (txn.category_id != null
                              ? catById.get(txn.category_id)?.name
                              : null) ||
                            TXN_TYPES.find((t) => t.value === txn.type)?.label}
                        </span>
                        <span className="block truncate text-[13px] text-ink-500">
                          {metaLine(txn)}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-[15px] font-bold tabular-nums ${style.className}`}
                      >
                        {style.prefix}
                        {formatRupiah(txn.amount).replace("-", "")}
                      </span>
                    </>
                  );

                  const rowClass = `flex w-full items-center gap-3 px-4 py-3 text-left ${
                    i > 0 ? "border-t border-[var(--border-subtle)]" : ""
                  }`;

                  if (selectMode) {
                    return (
                      <button
                        key={txn.id}
                        type="button"
                        onClick={() => toggleRow(txn)}
                        disabled={!selectable}
                        aria-pressed={isSelected}
                        className={`${rowClass} ${selectable ? "" : "opacity-40"}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            isSelected
                              ? "border-forest-800 bg-forest-800 text-white"
                              : "border-[var(--border-default)]"
                          }`}
                        >
                          {isSelected && <Check size={14} />}
                        </span>
                        {body}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={txn.id}
                      href={`/history/${txn.id}`}
                      className={`${rowClass} no-underline`}
                    >
                      {body}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Keeps the month in the URL available to the edit page's redirect. */}
      <input type="hidden" value={monthKey} readOnly />
    </div>
  );
}

/** Only the fields meaningful for the selected type are offered. */
function BulkPanel({
  ids,
  type,
  wallets,
  categories,
  onDone,
}: {
  ids: number[];
  type: TxnType;
  wallets: Wallet[];
  categories: Category[];
  onDone: () => void;
}) {
  const showSource =
    type === "expense" || type === "saving" || type === "investment" || type === "transfer";
  const showDest =
    type === "income" || type === "withdrawal" || type === "transfer";
  const showCategory = type !== "transfer";

  const categoryChoices = categories.filter((c) => {
    if (type === "withdrawal") return c.kind === "saving" || c.kind === "investment";
    if (type === "expense") return c.kind === "expense";
    if (type === "income") return c.kind === "income";
    if (type === "saving") return c.kind === "saving";
    if (type === "investment") return c.kind === "investment";
    return false;
  });

  return (
    <form
      action={async (formData: FormData) => {
        await bulkUpdateTransactions(formData);
        onDone();
      }}
      className="space-y-3 rounded-[var(--radius-card)] bg-sage-100 p-4"
    >
      <input type="hidden" name="ids" value={ids.join(",")} />
      <input type="hidden" name="type" value={type} />

      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-forest-800">
          Editing {ids.length} {ids.length === 1 ? "entry" : "entries"}
        </span>
        <button
          type="button"
          onClick={onDone}
          aria-label="Cancel bulk edit"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-forest-800"
        >
          <X size={16} />
        </button>
      </div>

      <p className="text-[13px] text-ink-700">
        Leave a field blank to keep it as it is.
      </p>

      {showCategory && (
        <select name="category_id" aria-label="Set category" className="field" defaultValue="">
          <option value="">Category — unchanged</option>
          {categoryChoices.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {showSource && (
        <select
          name="source_wallet_id"
          aria-label="Set source wallet"
          className="field"
          defaultValue=""
        >
          <option value="">{type === "transfer" ? "From" : "Paid from"} — unchanged</option>
          {wallets.map((w) => (
            <option key={w.id} value={String(w.id)}>
              {w.name}
            </option>
          ))}
        </select>
      )}

      {showDest && (
        <select
          name="dest_wallet_id"
          aria-label="Set destination wallet"
          className="field"
          defaultValue=""
        >
          <option value="">{type === "transfer" ? "To" : "Received in"} — unchanged</option>
          {wallets.map((w) => (
            <option key={w.id} value={String(w.id)}>
              {w.name}
            </option>
          ))}
        </select>
      )}

      <input
        type="date"
        name="occurred_on"
        aria-label="Set date"
        className="field"
        defaultValue=""
      />

      <button type="submit" className="btn btn-primary w-full">
        Apply to {ids.length}
      </button>
    </form>
  );
}

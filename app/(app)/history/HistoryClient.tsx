"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatRupiah, formatDateShort } from "@/lib/format";
import { TXN_TYPES, type Transaction, type TxnType } from "@/lib/types";

const SIGN: Record<TxnType, { color: string; prefix: string }> = {
  expense: { color: "text-clay", prefix: "−" },
  income: { color: "text-jade", prefix: "+" },
  saving: { color: "text-sky", prefix: "→" },
  investment: { color: "text-plum", prefix: "→" },
  transfer: { color: "text-paper-dim", prefix: "" },
  withdrawal: { color: "text-sky", prefix: "←" },
};

type Cat = { id: number; name: string; kind: string };
type Wal = { id: number; name: string };

// Client-side filtering over the month's transactions (already loaded), so search and
// the type/category filters are instant — no per-keystroke server round-trips.
export default function HistoryClient({
  transactions,
  categories,
  wallets,
}: {
  transactions: Transaction[];
  categories: Cat[];
  wallets: Wal[];
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TxnType | "all">("all");
  const [catId, setCatId] = useState<number | "all">("all");
  const [hydrated, setHydrated] = useState(false);

  // Keep the search + filters for the session so they survive leaving the page to edit a
  // transaction (the edit redirect remounts this component) and other in-app navigations.
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem("ft_history_filters") ?? "{}");
      if (typeof s.query === "string") setQuery(s.query);
      if (s.type === "all" || TXN_TYPES.some((t) => t.value === s.type)) setType(s.type);
      if (s.catId === "all" || typeof s.catId === "number") setCatId(s.catId);
    } catch {}
    setHydrated(true);
  }, []);

  // Only persist AFTER restoring — otherwise the default empty state would overwrite the
  // saved value on mount (and, under StrictMode's double-invoked effects, reset it).
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem("ft_history_filters", JSON.stringify({ query, type, catId }));
    } catch {}
  }, [hydrated, query, type, catId]);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const walName = useMemo(() => new Map(wallets.map((w) => [w.id, w.name])), [wallets]);

  const meta = (t: Transaction): string => {
    const cat = t.category_id ? catName.get(t.category_id) : undefined;
    const src = t.source_wallet_id ? walName.get(t.source_wallet_id) : undefined;
    const dst = t.dest_wallet_id ? walName.get(t.dest_wallet_id) : undefined;
    if (t.type === "transfer") return `${src ?? "?"} → ${dst ?? "?"}`;
    if (t.type === "withdrawal") return `${cat ?? "?"} → ${dst ?? "?"}`;
    if (t.type === "income") return [cat, dst].filter(Boolean).join(" · ");
    return [cat, src].filter(Boolean).join(" · ");
  };

  // Offer the categories that appear in this month — plus the active selection, so a
  // filter you set keeps working (and stays shown) as you move between months.
  const catOptions = useMemo(() => {
    const ids = new Set<number>();
    for (const t of transactions) if (t.category_id) ids.add(t.category_id);
    if (catId !== "all") ids.add(catId);
    return categories.filter((c) => ids.has(c.id));
  }, [transactions, categories, catId]);

  // Precompute a searchable string per transaction (note + category + wallets + amount,
  // raw and formatted) so typing only does a substring check, not a rebuild each keystroke.
  const searchIndex = useMemo(() => {
    const idx = new Map<number, string>();
    for (const t of transactions) {
      idx.set(
        t.id,
        [
          t.description ?? "",
          t.category_id ? catName.get(t.category_id) ?? "" : "",
          t.source_wallet_id ? walName.get(t.source_wallet_id) ?? "" : "",
          t.dest_wallet_id ? walName.get(t.dest_wallet_id) ?? "" : "",
          String(t.amount),
          formatRupiah(t.amount),
        ]
          .join(" ")
          .toLowerCase()
      );
    }
    return idx;
  }, [transactions, catName, walName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (catId !== "all" && t.category_id !== catId) return false;
      if (!q) return true;
      return (searchIndex.get(t.id) ?? "").includes(q);
    });
  }, [transactions, type, catId, query, searchIndex]);

  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const key = t.occurred_on.slice(0, 10);
      (m.get(key) ?? m.set(key, []).get(key)!).push(t);
    }
    return [...m.entries()];
  }, [filtered]);

  const hasFilter = query.trim() !== "" || type !== "all" || catId !== "all";

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-faint"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search note, category, wallet, amount…"
          className="field pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-paper-faint active:text-paper"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category filter */}
      <select
        value={catId}
        onChange={(e) => setCatId(e.target.value === "all" ? "all" : Number(e.target.value))}
        className="field [color-scheme:dark]"
      >
        <option value="all" className="bg-ink-2">All categories</option>
        {catOptions.map((c) => (
          <option key={c.id} value={c.id} className="bg-ink-2">
            {c.name}
          </option>
        ))}
      </select>

      {/* Type filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip label="All" active={type === "all"} onClick={() => setType("all")} />
        {TXN_TYPES.map((t) => (
          <FilterChip key={t.value} label={t.label} active={type === t.value} onClick={() => setType(t.value)} />
        ))}
      </div>

      <p className="px-1 text-[11px] text-paper-faint">
        {filtered.length} of {transactions.length} {transactions.length === 1 ? "entry" : "entries"}
        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setType("all");
              setCatId("all");
            }}
            className="ml-2 text-paper-dim underline decoration-dotted underline-offset-2 active:text-paper"
          >
            clear filters
          </button>
        )}
      </p>

      {filtered.length === 0 ? (
        <p className="pt-10 text-center text-sm text-paper-faint">
          {transactions.length === 0 ? "No transactions for this month." : "No transactions match your filters."}
        </p>
      ) : (
        <div className="stagger space-y-5">
          {groups.map(([date, rows]) => (
            <div key={date}>
              <div className="label mb-2 px-1">{formatDateShort(date)}</div>
              <div className="card overflow-hidden">
                {rows.map((t, i) => {
                  const s = SIGN[t.type];
                  return (
                    <Link
                      key={t.id}
                      href={`/history/${t.id}`}
                      className={`flex items-center justify-between gap-3 px-4 py-3.5 transition-colors active:bg-ink-3 ${
                        i > 0 ? "hr-dash border-t" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-medium text-paper">
                          {t.description || (t.category_id ? catName.get(t.category_id) : undefined) || t.type}
                        </div>
                        <div className="truncate text-xs text-paper-dim">{meta(t)}</div>
                      </div>
                      <div className={`shrink-0 font-display text-[15px] font-medium tabular-nums ${s.color}`}>
                        {s.prefix}
                        {formatRupiah(t.amount).replace("Rp", "").trim()}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-gold text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"
      }`}
    >
      {label}
    </button>
  );
}

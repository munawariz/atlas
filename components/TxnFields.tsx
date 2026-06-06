"use client";

import { useEffect, useMemo, useState } from "react";
import { TXN_TYPES, TYPE_TO_CATEGORY_KIND, type Category, type TxnType, type Wallet } from "@/lib/types";
import { formatNumber, todayISO } from "@/lib/format";

const ACCENT: Record<TxnType, string> = {
  expense: "bg-clay text-ink",
  income: "bg-jade text-ink",
  saving: "bg-sky text-ink",
  investment: "bg-plum text-ink",
  transfer: "bg-sand text-ink",
  withdrawal: "bg-sky text-ink",
};

export interface TxnInitial {
  type?: TxnType;
  amount?: number;
  date?: string;
  description?: string;
  categoryId?: number | null;
  sourceWalletId?: number | null;
  destWalletId?: number | null;
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all active:scale-95 ${
        selected
          ? "bg-gold text-ink shadow-[0_4px_14px_-4px_rgba(63,185,80,0.5)]"
          : "border border-line/60 bg-ink-3 text-paper-dim"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Controlled transaction fields shared by Add and Edit. All values are submitted
 * via hidden inputs, so the parent only needs to wrap this in a <form action=…>.
 */
export default function TxnFields({
  wallets,
  categories,
  initial,
  initialToday,
  persist = false,
}: {
  wallets: Wallet[];
  categories: Category[];
  initial?: TxnInitial;
  initialToday: string;
  persist?: boolean;
}) {
  const [type, setType] = useState<TxnType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? initialToday);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null);
  const [sourceWalletId, setSourceWalletId] = useState<number | null>(initial?.sourceWalletId ?? null);
  const [destWalletId, setDestWalletId] = useState<number | null>(initial?.destWalletId ?? null);

  useEffect(() => {
    if (!persist) return;
    setDate(todayISO());
    try {
      const s = JSON.parse(localStorage.getItem("ft_last") ?? "{}");
      if (s.type) setType(s.type);
      if (s.sourceWalletId) setSourceWalletId(s.sourceWalletId);
      if (s.destWalletId) setDestWalletId(s.destWalletId);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!persist) return;
    try {
      localStorage.setItem("ft_last", JSON.stringify({ type, sourceWalletId, destWalletId }));
    } catch {}
  }, [persist, type, sourceWalletId, destWalletId]);

  const kind = TYPE_TO_CATEGORY_KIND[type];
  // Withdrawal ("Ambil Tabungan") draws from any saving OR investment bucket.
  const cats = useMemo(() => {
    if (type === "withdrawal") return categories.filter((c) => c.kind === "saving" || c.kind === "investment");
    return kind ? categories.filter((c) => c.kind === kind) : [];
  }, [categories, kind, type]);
  const showCategory = kind !== null || type === "withdrawal";
  const usesDestWallet = type === "income" || type === "withdrawal";

  const grouped = amount ? formatNumber(parseInt(amount, 10)) : "";
  const walletLabel =
    type === "expense" ? "Paid from" : usesDestWallet ? "Received in" : "From wallet";

  // Shrink the hero amount as it gets longer so big numbers never crop.
  const amtLen = grouped.length || 1;
  const amtPx = amtLen <= 7 ? 42 : amtLen <= 9 ? 36 : amtLen <= 11 ? 30 : amtLen <= 13 ? 25 : 21;

  return (
    <div className="space-y-6">
      {/* Type switcher */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TXN_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setType(t.value);
              setCategoryId(null);
            }}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
              type === t.value ? ACCENT[t.value] : "border border-line/50 bg-ink-3 text-paper-dim"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Amount — hero */}
      <div className="card relative overflow-hidden p-6 text-center shadow-[0_18px_40px_-24px_rgba(63,185,80,0.45)]">
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(63,185,80,0.16),transparent)]" />
        <div className="label mb-3">Amount</div>
        {/* Fixed-height slot so the card never changes size as the font scales */}
        <div className="flex h-14 items-center justify-center">
          <div className="flex items-baseline justify-center gap-2" style={{ fontSize: `${amtPx}px` }}>
            <span className="font-display text-green" style={{ fontSize: "0.58em" }}>
              Rp
            </span>
            <input
              inputMode="numeric"
              value={grouped}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              style={{ width: `${amtLen}ch` }}
              className="bg-transparent text-center font-display text-[1em] font-medium leading-none tabular-nums text-paper outline-none placeholder:text-paper-faint"
            />
          </div>
        </div>
      </div>

      {/* Category */}
      {showCategory && (
        <div>
          <div className="label mb-2.5">
            {type === "withdrawal" ? "Take from" : type === "saving" || type === "investment" ? "Goes to" : "Category"}
          </div>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <Chip key={c.id} label={c.name} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Wallet(s) */}
      {type !== "transfer" ? (
        <div>
          <div className="label mb-2.5">{walletLabel}</div>
          <div className="flex flex-wrap gap-2">
            {wallets.map((w) => (
              <Chip
                key={w.id}
                label={w.name}
                selected={(usesDestWallet ? destWalletId : sourceWalletId) === w.id}
                onClick={() => (usesDestWallet ? setDestWalletId(w.id) : setSourceWalletId(w.id))}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="label mb-2.5">From</div>
            <div className="flex flex-wrap gap-2">
              {wallets.map((w) => (
                <Chip key={w.id} label={w.name} selected={sourceWalletId === w.id} onClick={() => setSourceWalletId(w.id)} />
              ))}
            </div>
          </div>
          <div>
            <div className="label mb-2.5">To</div>
            <div className="flex flex-wrap gap-2">
              {wallets.map((w) => (
                <Chip key={w.id} label={w.name} selected={destWalletId === w.id} onClick={() => setDestWalletId(w.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <div className="label mb-2.5">
          {type === "saving" || type === "investment" || type === "withdrawal" ? "Note" : "Description"}
        </div>
        <input
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Order Food"
          className="field"
        />
      </div>

      {/* Date */}
      <div>
        <div className="label mb-2.5">Date</div>
        <input
          type="date"
          name="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="field [color-scheme:dark]"
        />
      </div>

      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="source_wallet_id" value={sourceWalletId ?? ""} />
      <input type="hidden" name="dest_wallet_id" value={destWalletId ?? ""} />
    </div>
  );
}

import Link from "next/link";
import { categoryMap, listTransactions, walletMap } from "@/lib/data";
import { formatRupiah, formatDateShort, todayISO } from "@/lib/format";
import { TXN_TYPES, type Transaction, type TxnType } from "@/lib/types";
import MonthSwitcher from "@/components/MonthSwitcher";
import RefreshOnFocus from "@/components/RefreshOnFocus";

export const dynamic = "force-dynamic";

const SIGN: Record<TxnType, { color: string; prefix: string }> = {
  expense: { color: "text-clay", prefix: "−" },
  income: { color: "text-jade", prefix: "+" },
  saving: { color: "text-sky", prefix: "→" },
  investment: { color: "text-plum", prefix: "→" },
  transfer: { color: "text-paper-dim", prefix: "" },
  withdrawal: { color: "text-sky", prefix: "←" },
};

function meta(t: Transaction, cats: Map<number, { name: string }>, ws: Map<number, string>): string {
  const cat = t.category_id ? cats.get(t.category_id)?.name : undefined;
  const src = t.source_wallet_id ? ws.get(t.source_wallet_id) : undefined;
  const dst = t.dest_wallet_id ? ws.get(t.dest_wallet_id) : undefined;
  if (t.type === "transfer") return `${src ?? "?"} → ${dst ?? "?"}`;
  if (t.type === "withdrawal") return `${cat ?? "?"} → ${dst ?? "?"}`;
  if (t.type === "income") return [cat, dst].filter(Boolean).join(" · ");
  return [cat, src].filter(Boolean).join(" · ");
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const monthKey = sp.m ?? `${todayISO().slice(0, 7)}-01`;
  const type = (sp.type as TxnType | undefined) || undefined;

  const [txns, cats, ws] = await Promise.all([
    listTransactions({ monthKey, type }),
    categoryMap(),
    walletMap(),
  ]);

  const groups = new Map<string, Transaction[]>();
  for (const t of txns) {
    const key = t.occurred_on.slice(0, 10);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(t);
  }

  const params = type ? { type } : undefined;

  return (
    <div className="space-y-4 pt-4">
      <RefreshOnFocus />
      <header className="mb-1">
        <p className="label">Ledger</p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-paper">History</h1>
      </header>

      <MonthSwitcher monthKey={monthKey} basePath="/history" params={params} />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip label="All" href={`/history?m=${monthKey}`} active={!type} />
        {TXN_TYPES.map((t) => (
          <FilterChip key={t.value} label={t.label} href={`/history?m=${monthKey}&type=${t.value}`} active={type === t.value} />
        ))}
      </div>

      {txns.length === 0 ? (
        <p className="pt-10 text-center text-sm text-paper-faint">No transactions for this filter.</p>
      ) : (
        <div className="stagger space-y-5">
          {[...groups.entries()].map(([date, rows]) => (
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
                          {t.description || cats.get(t.category_id ?? -1)?.name || t.type}
                        </div>
                        <div className="truncate text-xs text-paper-dim">{meta(t, cats, ws)}</div>
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

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-gold text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"
      }`}
    >
      {label}
    </Link>
  );
}

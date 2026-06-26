import Link from "next/link";
import { formatMonth, formatRupiah, formatRupiahShort } from "@/lib/format";

type Item = { id: number; item: string; amount: number; paid: boolean };
type Group = { key: string; name: string; total: number; paid: number; owed: number; items: Item[] };

// Installments tab on the stats page: this month's installments grouped by provider, each
// tracked under its own installment expense category. Read-only — pay them on My Paylater.
export default function InstallmentsTab({
  month,
  total,
  paid,
  groups,
}: {
  month: string;
  total: number;
  paid: number;
  groups: Group[];
}) {
  const owed = total - paid;
  const pct = total > 0 ? (paid / total) * 100 : 0;

  if (groups.length === 0) {
    return (
      <div className="space-y-4">
        <p className="pt-8 text-center text-sm text-paper-faint">
          No installments due in {formatMonth(month)}.
        </p>
        <p className="text-center text-xs text-paper-faint">
          Add some on{" "}
          <Link href="/more/paylater" className="text-green underline">My Paylater</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <span className="label">Installments · {formatMonth(month)}</span>
          <Link href="/more/paylater" className="text-[11px] text-paper-dim active:text-paper">Manage ›</Link>
        </div>
        <div className="mt-1.5 font-display text-2xl font-bold tabular-nums text-sand">{formatRupiah(total)}</div>
        <div className="mt-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/40">
            <div className="h-full rounded-full bg-green" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-green">{formatRupiah(paid)} paid</span>
            <span className="text-sand">{formatRupiah(owed)} owed</span>
          </div>
        </div>
      </div>

      {/* Per-provider breakdown */}
      {groups.map((g) => {
        const gpct = g.total > 0 ? (g.paid / g.total) * 100 : 0;
        return (
          <section key={g.key} className="card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[15px] font-medium text-paper">{g.name}</h3>
              <span className="font-display text-sm font-semibold tabular-nums text-sand">{formatRupiah(g.total)}</span>
            </div>
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/40">
                <div className="h-full rounded-full bg-green" style={{ width: `${Math.min(100, gpct)}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-paper-faint">
                <span>{g.items.length} item{g.items.length > 1 ? "s" : ""}</span>
                <span>
                  <span className="text-green">{formatRupiahShort(g.paid)}</span> paid ·{" "}
                  <span className="text-sand">{formatRupiahShort(g.owed)}</span> owed
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 border-l border-line/70 pl-3">
              {g.items.map((it) => (
                <div key={it.id} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-paper-dim">{it.item}</span>
                  <span className="shrink-0 tabular-nums text-paper">{formatRupiah(it.amount)}</span>
                  <span
                    className={`w-12 shrink-0 text-right text-[10px] font-medium uppercase tracking-wide ${
                      it.paid ? "text-green" : "text-amber"
                    }`}
                  >
                    {it.paid ? "Paid" : "Owed"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

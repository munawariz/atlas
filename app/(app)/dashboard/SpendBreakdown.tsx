"use client";

import { useMemo, useState } from "react";
import { formatNumber, formatRupiah, formatRupiahShort } from "@/lib/format";

type Item = { desc: string; wallet: string; amt: number };
type Row = { id: number; name: string; amt: number; items: Item[] };

const PALETTE = ["#f85149", "#e3b341", "#58a6ff", "#a371f7", "#3fb950", "#db61a2", "#f0883e", "#39d3c6"];
const OTHER = "#586069";
const TOP = 8;

// Spend-by-category donut + legend. Tap a slice or a row to isolate that category — its slice
// stays lit (others dim), the centre shows it, and its transactions expand. Same idea as the
// Charts page drilldown.
export default function SpendBreakdown({ rows, total }: { rows: Row[]; total: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const colorFor = (idx: number) => (idx < TOP ? PALETTE[idx] : OTHER);

  // Donut slices: the top categories individually, the rest folded into one "Other" (id -1).
  const slices = useMemo(() => {
    const top = rows.slice(0, TOP).map((r, i) => ({ id: r.id, amt: r.amt, color: PALETTE[i] }));
    if (rows.length > TOP) top.push({ id: -1, amt: rows.slice(TOP).reduce((s, r) => s + r.amt, 0), color: OTHER });
    return top;
  }, [rows]);

  const selIdx = selected == null ? -1 : rows.findIndex((r) => r.id === selected);
  const selRow = selIdx >= 0 ? rows[selIdx] : null;
  // The slice lit for the selection: its own slice if in the top set, else the "Other" slice.
  const litSlice = selRow ? (selIdx < TOP ? selRow.id : -1) : null;

  const size = 172;
  const sw = Math.round(size * 0.13);
  const r = (size - sw) / 2;
  const c = size / 2;
  const CIRC = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div>
      <div className="relative mx-auto my-1" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-line)" strokeWidth={sw} opacity={0.5} />
          {total > 0 &&
            slices.map((s) => {
              const frac = s.amt / total;
              const dash = frac * CIRC;
              const off = -acc * CIRC;
              acc += frac;
              const dim = litSlice != null && litSlice !== s.id;
              const clickable = s.id !== -1;
              return (
                <circle
                  key={s.id}
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={sw}
                  strokeDasharray={`${Math.max(0, dash - 1.5)} ${CIRC - dash + 1.5}`}
                  strokeDashoffset={off}
                  opacity={dim ? 0.2 : 1}
                  onClick={clickable ? () => setSelected((cur) => (cur === s.id ? null : s.id)) : undefined}
                  style={{ cursor: clickable ? "pointer" : "default", transition: "opacity .15s" }}
                />
              );
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {selRow ? (
            <>
              <span className="max-w-full truncate text-[11px] text-paper-dim">{selRow.name}</span>
              <span className="priv-center font-display text-lg font-bold tabular-nums text-paper">{formatRupiahShort(selRow.amt)}</span>
              <span className="text-[10px] text-paper-faint">{total ? Math.round((selRow.amt / total) * 100) : 0}% of spend</span>
            </>
          ) : (
            <>
              <span className="priv-center font-display text-lg font-bold tabular-nums text-paper">{formatRupiah(total)}</span>
              <span className="text-[10px] uppercase tracking-wider text-paper-faint">spent</span>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-0.5">
        {rows.map((row, idx) => {
          const open = selected === row.id;
          const pct = total ? (row.amt / total) * 100 : 0;
          return (
            <div key={row.id}>
              <button
                type="button"
                onClick={() => setSelected(open ? null : row.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-xs transition-colors active:bg-ink-3 ${open ? "bg-ink-3" : ""}`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorFor(idx), opacity: selected != null && !open ? 0.3 : 1 }}
                />
                <span className="min-w-0 flex-1 truncate text-paper">{row.name}</span>
                <span className="shrink-0 tabular-nums text-paper-dim">{formatRupiahShort(row.amt)}</span>
                <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-paper-faint">{Math.round(pct)}%</span>
              </button>
              {open && row.items.length > 0 && (
                <div className="mb-1 ml-[1.1rem] space-y-1 border-l border-line/70 pl-3">
                  {row.items.map((it, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="min-w-0 flex-1 truncate text-paper-dim">{it.desc}</span>
                      <span className="shrink-0 text-paper-faint">{it.wallet}</span>
                      <span className="shrink-0 tabular-nums text-paper-faint">{formatNumber(it.amt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

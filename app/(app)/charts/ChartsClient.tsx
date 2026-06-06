"use client";

import { useMemo, useState } from "react";
import type { ChartData } from "@/lib/data";
import { formatRupiah, formatRupiahShort, monthName } from "@/lib/format";

type Cat = { id: number; name: string; kind: string };
type Kind = "expense" | "income" | "saving" | "investment";

const C = {
  green: "#3fb950",
  red: "#f85149",
  amber: "#e3b341",
  sky: "#58a6ff",
  plum: "#a371f7",
  line: "#232c3a",
  dim: "#8b949e",
};
const KIND_COLOR: Record<Kind, string> = { expense: C.red, income: C.green, saving: C.sky, investment: C.plum };
const PALETTE = [C.red, C.amber, C.sky, C.plum, C.green, "#db61a2", "#f0883e", "#56d364", "#79c0ff", "#d2a8ff"];

const RANGES = [
  { label: "3M", n: 3 },
  { label: "6M", n: 6 },
  { label: "12M", n: 12 },
  { label: "All", n: Infinity },
];

const mShort = (mk: string) => monthName(Number(mk.slice(5, 7))).slice(0, 3);
const mLong = (mk: string) => `${monthName(Number(mk.slice(5, 7)))} ${mk.slice(0, 4)}`;

export default function ChartsClient({ data, categories }: { data: ChartData; categories: Cat[] }) {
  const [rangeN, setRangeN] = useState(6);
  const [selMonth, setSelMonth] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("expense");
  const [selCat, setSelCat] = useState<number | null>(null);

  const catName = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c.name]));
    return (id: number) => (id === 0 ? "Uncategorized" : m.get(id) ?? "—");
  }, [categories]);

  const flows = useMemo(() => (rangeN === Infinity ? data.flows : data.flows.slice(-rangeN)), [data.flows, rangeN]);
  const visMonths = useMemo(() => new Set(flows.map((f) => f.month)), [flows]);
  const nw = useMemo(() => {
    const pts = data.networth;
    return rangeN === Infinity ? pts : pts.slice(-(rangeN + 1));
  }, [data.networth, rangeN]);

  // keep selected month valid for the current range
  const activeMonth = selMonth && visMonths.has(selMonth) ? selMonth : null;

  // ----- scope totals -----
  const scope = useMemo(() => {
    const src = activeMonth ? flows.filter((f) => f.month === activeMonth) : flows;
    const t = src.reduce(
      (a, f) => ({
        income: a.income + f.income,
        expense: a.expense + f.expense,
        saving: a.saving + f.saving,
        investment: a.investment + f.investment,
      }),
      { income: 0, expense: 0, saving: 0, investment: 0 }
    );
    return { ...t, net: t.income - t.expense - t.saving - t.investment };
  }, [flows, activeMonth]);

  // ----- breakdown by category for the chosen kind + scope -----
  const breakdown = useMemo(() => {
    const sums = new Map<number, number>();
    for (const c of data.catTotals) {
      if (c.kind !== kind) continue;
      if (activeMonth ? c.month !== activeMonth : !visMonths.has(c.month)) continue;
      sums.set(c.categoryId, (sums.get(c.categoryId) ?? 0) + c.total);
    }
    const rows = [...sums.entries()].map(([id, total]) => ({ id, total })).sort((a, b) => b.total - a.total);
    const max = rows.reduce((m, r) => Math.max(m, r.total), 0);
    const sum = rows.reduce((s, r) => s + r.total, 0);
    return { rows, max, sum };
  }, [data.catTotals, kind, activeMonth, visMonths]);

  // ----- drilldown: selected category's monthly trend across the range -----
  const drill = useMemo(() => {
    if (selCat === null) return null;
    const byMonth = new Map<string, number>();
    for (const c of data.catTotals) {
      if (c.kind !== kind || c.categoryId !== selCat || !visMonths.has(c.month)) continue;
      byMonth.set(c.month, (byMonth.get(c.month) ?? 0) + c.total);
    }
    const series = flows.map((f) => ({ month: f.month, total: byMonth.get(f.month) ?? 0 }));
    const total = series.reduce((s, p) => s + p.total, 0);
    const active = series.filter((p) => p.total > 0).length;
    const max = series.reduce((m, p) => Math.max(m, p.total), 0);
    return { series, total, avg: active ? total / active : 0, max };
  }, [selCat, kind, data.catTotals, flows, visMonths]);

  const nwLatest = nw.length ? nw[nw.length - 1].total : 0;
  const nwFirst = nw.length ? nw[0].total : 0;
  const nwDelta = nwLatest - nwFirst;

  return (
    <div className="space-y-4">
      {/* range selector */}
      <div className="flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRangeN(r.n)}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${
              rangeN === r.n ? "bg-gold text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ---------- Net worth ---------- */}
      <section className="card p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="label">Net worth</p>
            <p className="font-display text-2xl font-semibold text-paper">{formatRupiah(nwLatest)}</p>
          </div>
          <div className="text-right">
            <p className={`font-display text-sm font-medium ${nwDelta >= 0 ? "text-green" : "text-red"}`}>
              {nwDelta >= 0 ? "▲" : "▼"} {formatRupiahShort(Math.abs(nwDelta))}
            </p>
            <p className="text-[11px] text-paper-faint">over {nw.length - 1} mo</p>
          </div>
        </div>
        <AreaChart points={nw} />
      </section>

      {/* ---------- Cash flow ---------- */}
      <section className="card p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="label">Income vs expense</p>
          {activeMonth && (
            <button
              type="button"
              onClick={() => setSelMonth(null)}
              className="rounded-full bg-ink-3 px-2 py-0.5 text-[11px] text-paper-dim active:text-paper"
            >
              {mShort(activeMonth)} ✕
            </button>
          )}
        </div>
        <GroupedBars flows={flows} selected={activeMonth} onSelect={(m) => setSelMonth((cur) => (cur === m ? null : m))} />
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Income" value={scope.income} color="text-green" />
          <Stat label="Expense" value={scope.expense} color="text-red" />
          <Stat label="Net" value={scope.net} color={scope.net >= 0 ? "text-green" : "text-red"} signed />
        </div>
        <p className="mt-2 text-center text-[11px] text-paper-faint">
          {activeMonth ? mLong(activeMonth) : `${flows.length} months`} · saved + invested{" "}
          <span className="text-sky">{formatRupiahShort(scope.saving + scope.investment)}</span>
          {scope.income > 0 && (
            <> · rate <span className="text-paper-dim">{Math.round(((scope.saving + scope.investment) / scope.income) * 100)}%</span></>
          )}
        </p>
      </section>

      {/* ---------- Breakdown + drilldown ---------- */}
      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {(["expense", "income", "saving", "investment"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k);
                setSelCat(null);
              }}
              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                kind === k ? "text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"
              }`}
              style={kind === k ? { backgroundColor: KIND_COLOR[k] } : undefined}
            >
              {k}
            </button>
          ))}
        </div>

        <p className="mb-2 text-[11px] text-paper-faint">
          {activeMonth ? mLong(activeMonth) : `${flows.length} months`} ·{" "}
          <span className="text-paper-dim">{formatRupiah(breakdown.sum)}</span> total · tap a row to drill in
        </p>

        {breakdown.rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-paper-faint">Nothing here for this scope.</p>
        ) : (
          <div className="space-y-1.5">
            {breakdown.rows.map((r, i) => {
              const color = PALETTE[i % PALETTE.length];
              const pct = breakdown.sum ? (r.total / breakdown.sum) * 100 : 0;
              const open = selCat === r.id;
              return (
                <div key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelCat(open ? null : r.id)}
                    className="w-full rounded-lg px-1 py-1 text-left active:bg-ink-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm text-paper">{catName(r.id)}</span>
                      <span className="shrink-0 font-display text-sm tabular-nums text-paper-dim">
                        {formatRupiahShort(r.total)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/40">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${breakdown.max ? (r.total / breakdown.max) * 100 : 0}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-paper-faint">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </button>

                  {open && drill && (
                    <div className="mb-1 mt-1 rounded-xl bg-ink-3/70 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-paper-dim">
                          avg <span className="text-paper">{formatRupiahShort(drill.avg)}</span>/mo
                        </span>
                        <span className="text-paper-dim">
                          total <span className="text-paper">{formatRupiah(drill.total)}</span>
                        </span>
                      </div>
                      <div className="mt-2 flex h-16 items-end gap-1">
                        {drill.series.map((p) => (
                          <div key={p.month} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${mShort(p.month)} · ${formatRupiah(p.total)}`}>
                            <div
                              className="w-full rounded-sm"
                              style={{
                                height: `${drill.max ? Math.max(3, (p.total / drill.max) * 100) : 3}%`,
                                backgroundColor: color,
                                opacity: p.total ? 1 : 0.25,
                              }}
                            />
                            <span className="text-[8px] text-paper-faint">{mShort(p.month)[0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, color, signed }: { label: string; value: number; color: string; signed?: boolean }) {
  return (
    <div className="rounded-xl bg-ink-3/60 py-2">
      <p className="text-[10px] uppercase tracking-wider text-paper-faint">{label}</p>
      <p className={`font-display text-sm font-semibold tabular-nums ${color}`}>
        {signed && value >= 0 ? "+" : ""}
        {formatRupiahShort(value)}
      </p>
    </div>
  );
}

// ---- Net worth area (SVG, scales to width) ----
function AreaChart({ points }: { points: { month: string; total: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const W = 700;
  const H = 200;
  const pad = 14;
  const n = points.length;
  if (n < 2) return <p className="py-6 text-center text-xs text-paper-faint">Need more months to chart.</p>;

  const vals = points.map((p) => p.total);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - 2 * pad);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const cur = active ?? n - 1;
  const p = points[cur];

  return (
    <div className="mt-3">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
          <defs>
            <linearGradient id="nwfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.green} stopOpacity="0.28" />
              <stop offset="100%" stopColor={C.green} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#nwfill)" />
          <path d={line} fill="none" stroke={C.green} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <line x1={x(cur)} y1={pad} x2={x(cur)} y2={H} stroke={C.line} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <circle cx={x(cur)} cy={y(p.total)} r="4.5" fill={C.green} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="absolute inset-0 flex">
          {points.map((pt, i) => (
            <button key={pt.month} type="button" aria-label={pt.month} className="flex-1" onClick={() => setActive(i)} />
          ))}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-paper-faint">
        <span>{mShort(points[0].month)}</span>
        <span className="text-paper-dim">
          {mLong(p.month)}: <span className="text-paper">{formatRupiah(p.total)}</span>
        </span>
        <span>{mShort(points[n - 1].month)}</span>
      </div>
    </div>
  );
}

// ---- Income vs expense grouped bars (SVG) ----
function GroupedBars({
  flows,
  selected,
  onSelect,
}: {
  flows: ChartData["flows"];
  selected: string | null;
  onSelect: (month: string) => void;
}) {
  const W = 700;
  const H = 190;
  const pad = 10;
  const n = flows.length;
  const max = flows.reduce((m, f) => Math.max(m, f.income, f.expense), 0) || 1;
  const groupW = (W - 2 * pad) / n;
  const barW = Math.min(groupW * 0.32, 26);
  const baseline = H - pad;
  const h = (v: number) => (v / max) * (H - 2 * pad);

  return (
    <div className="mt-1">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
          {flows.map((f, i) => {
            const cx = pad + groupW * i + groupW / 2;
            const inH = h(f.income);
            const exH = h(f.expense);
            return (
              <g key={f.month}>
                {selected === f.month && (
                  <rect x={pad + groupW * i} y={pad} width={groupW} height={H - 2 * pad} fill={C.line} opacity="0.4" rx="4" />
                )}
                <rect x={cx - barW - 1} y={baseline - inH} width={barW} height={inH} rx="2" fill={C.green} />
                <rect x={cx + 1} y={baseline - exH} width={barW} height={exH} rx="2" fill={C.red} />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex">
          {flows.map((f) => (
            <button key={f.month} type="button" aria-label={f.month} className="flex-1" onClick={() => onSelect(f.month)} />
          ))}
        </div>
      </div>
      <div className="flex">
        {flows.map((f) => (
          <span key={f.month} className="flex-1 text-center text-[9px] text-paper-faint">
            {mShort(f.month)}
          </span>
        ))}
      </div>
    </div>
  );
}

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
const KIND_TEXT: Record<Kind, string> = { expense: "text-red", income: "text-green", saving: "text-sky", investment: "text-plum" };
const PALETTE = [C.red, C.amber, C.sky, C.plum, C.green, "#db61a2", "#f0883e", "#56d364", "#79c0ff", "#d2a8ff"];

const RANGES = [
  { label: "1M", n: 1 },
  { label: "3M", n: 3 },
  { label: "6M", n: 6 },
  { label: "12M", n: 12 },
  { label: "All", n: Infinity },
];

const mShort = (mk: string) => monthName(Number(mk.slice(5, 7))).slice(0, 3);
const mLong = (mk: string) => `${monthName(Number(mk.slice(5, 7)))} ${mk.slice(0, 4)}`;
// Shift a YYYY-MM-01 month key by `delta` months.
const addMonths = (mk: string, delta: number) => {
  const [y, mo] = mk.split("-").map(Number);
  const idx = y * 12 + (mo - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}-01`;
};

export default function ChartsClient({ data, categories }: { data: ChartData; categories: Cat[] }) {
  const months = data.months; // ascending "YYYY-MM-01"
  const [rangeN, setRangeN] = useState(6);
  const [custom, setCustom] = useState(false);
  const [anchor, setAnchor] = useState(() => months[months.length - 1] ?? ""); // end month for presets
  const [customFrom, setCustomFrom] = useState(() => months[Math.max(0, months.length - 6)] ?? months[0] ?? "");
  const [customTo, setCustomTo] = useState(() => months[months.length - 1] ?? "");
  const [selMonth, setSelMonth] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Kind | null>(null); // a cash-flow line to isolate
  const [kind, setKind] = useState<Kind>("expense");
  const [selCat, setSelCat] = useState<number | null>(null);
  const [trendCat, setTrendCat] = useState<number | null>(null); // a category to trace month-by-month

  const catName = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c.name]));
    return (id: number) => (id === 0 ? "Uncategorized" : m.get(id) ?? "—");
  }, [categories]);

  // Custom = an explicit [from..to] window; presets = the N months ENDING at `anchor`
  // (1M = just that month). lo/hi keep custom valid even if From is set after To.
  const lo = customFrom <= customTo ? customFrom : customTo;
  const hi = customFrom <= customTo ? customTo : customFrom;
  const presetLo = rangeN === Infinity ? months[0] ?? "" : addMonths(anchor, -(rangeN - 1));
  const presetHi = anchor;
  const visMonths = useMemo(() => {
    if (custom) return new Set(months.filter((m) => m >= lo && m <= hi));
    if (rangeN === Infinity) return new Set(months);
    return new Set(months.filter((m) => m >= presetLo && m <= presetHi));
  }, [custom, lo, hi, rangeN, presetLo, presetHi, months]);
  const flows = useMemo(() => data.flows.filter((f) => visMonths.has(f.month)), [data.flows, visMonths]);
  const nw = useMemo(() => {
    const pts = data.networth;
    if (!custom && rangeN === Infinity) return pts;
    const wlo = custom ? lo : presetLo;
    const whi = custom ? hi : presetHi;
    const inRange = pts.filter((p) => p.month >= wlo && p.month <= whi);
    const before = [...pts].reverse().find((p) => p.month < wlo); // leading baseline for the area
    return before ? [before, ...inRange] : inRange;
  }, [data.networth, custom, lo, hi, rangeN, presetLo, presetHi]);

  // keep selected month valid for the current range
  const activeMonth = selMonth && visMonths.has(selMonth) ? selMonth : null;

  // Cash-flow line points. In 1-month mode, zoom to per-DAY points across the anchor month
  // (all days, zero-filled); otherwise one point per visible month.
  const isDaily = !custom && rangeN === 1 && !!anchor;
  const seriesPoints = useMemo(() => {
    if (isDaily) {
      const [yy, mm] = anchor.split("-").map(Number);
      const daysInMonth = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
      const byDate = new Map(data.dailyFlows.map((d) => [d.date, d]));
      return Array.from({ length: daysInMonth }, (_, i) => {
        const date = `${yy}-${String(mm).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
        const v = byDate.get(date);
        return { label: date, income: v?.income ?? 0, expense: v?.expense ?? 0, saving: v?.saving ?? 0, investment: v?.investment ?? 0 };
      });
    }
    return flows.map((f) => ({ label: f.month, income: f.income, expense: f.expense, saving: f.saving, investment: f.investment }));
  }, [isDaily, anchor, data.dailyFlows, flows]);

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

  // ----- drilldown: selected category's composition by entry (pie) + insights, across the range -----
  const drill = useMemo(() => {
    if (selCat === null) return null;

    // monthly totals → avg/mo + total (header)
    const byMonth = new Map<string, number>();
    for (const c of data.catTotals) {
      if (c.kind !== kind || c.categoryId !== selCat || !visMonths.has(c.month)) continue;
      byMonth.set(c.month, (byMonth.get(c.month) ?? 0) + c.total);
    }
    const total = [...byMonth.values()].reduce((s, v) => s + v, 0);
    const activeMonths = [...byMonth.values()].filter((v) => v > 0).length;

    // composition by description: pie slices + biggest single + most routine entry
    let biggest: { description: string; amount: number; month: string } | null = null;
    const byDesc = new Map<string, { label: string; count: number; total: number; blank: boolean }>();
    for (const e of data.catEntries) {
      if (e.kind !== kind || e.categoryId !== selCat || !visMonths.has(e.month)) continue;
      if (!biggest || e.max > biggest.amount) biggest = { description: e.description, amount: e.max, month: e.month };
      const raw = e.description.trim();
      const norm = raw.toLowerCase();
      const key = norm || "";
      const g = byDesc.get(key) ?? { label: raw || "(no note)", count: 0, total: 0, blank: !norm };
      g.count += e.count;
      g.total += e.total;
      byDesc.set(key, g);
    }
    const groups = [...byDesc.values()].sort((a, b) => b.total - a.total);
    const entryCount = groups.reduce((s, g) => s + g.count, 0);

    // pie: the biggest entries individually, the rest folded into "Other"
    const TOP = 7;
    const pie = groups.slice(0, TOP).map((g) => ({ label: g.label, value: g.total }));
    const rest = groups.slice(TOP);
    if (rest.length) pie.push({ label: `Other · ${rest.length}`, value: rest.reduce((s, g) => s + g.total, 0) });
    const pieTotal = pie.reduce((s, p) => s + p.value, 0);

    let mostOften: { label: string; count: number; total: number } | null = null;
    for (const g of groups) {
      if (g.blank) continue;
      if (!mostOften || g.count > mostOften.count || (g.count === mostOften.count && g.total > mostOften.total))
        mostOften = { label: g.label, count: g.count, total: g.total };
    }

    return { total, avg: activeMonths ? total / activeMonths : 0, pie, pieTotal, entryCount, biggest, mostOften };
  }, [selCat, kind, data.catTotals, data.catEntries, visMonths]);

  // ----- category-over-time: one category's total per visible month -----
  // Dropdown lists only categories that have activity, grouped by kind (skip uncategorized,
  // whose id 0 spans kinds).
  const trendOptions = useMemo(() => {
    const ids = new Set(data.catTotals.filter((c) => c.categoryId !== 0).map((c) => c.categoryId));
    const order: Kind[] = ["expense", "income", "saving", "investment"];
    return order
      .map((k) => ({
        kind: k,
        items: categories.filter((c) => c.kind === k && ids.has(c.id)).sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((g) => g.items.length > 0);
  }, [data.catTotals, categories]);

  const trend = useMemo(() => {
    if (trendCat === null) return null;
    const cat = categories.find((c) => c.id === trendCat) ?? null;
    const kindOf = (cat?.kind ?? "expense") as Kind;
    const byMonth = new Map<string, number>();
    for (const c of data.catTotals) {
      if (c.categoryId !== trendCat || !visMonths.has(c.month)) continue;
      byMonth.set(c.month, (byMonth.get(c.month) ?? 0) + c.total);
    }
    // Zero-fill every visible month so lean months show as empty bars.
    const pts = [...visMonths].sort().map((m) => ({ month: m, value: byMonth.get(m) ?? 0 }));
    const total = pts.reduce((s, p) => s + p.value, 0);
    const activeMonths = pts.filter((p) => p.value > 0).length;
    const avg = activeMonths ? total / activeMonths : 0;
    const max = pts.reduce((a, p) => (p.value > a.value ? p : a), { month: "", value: -1 });
    return { cat, kind: kindOf, pts, total, avg, activeMonths, max };
  }, [trendCat, data.catTotals, visMonths, categories]);

  const selRow = selCat !== null ? breakdown.rows.find((r) => r.id === selCat) ?? null : null;
  const selPct = selRow && breakdown.sum ? (selRow.total / breakdown.sum) * 100 : 0;

  const nwLatest = nw.length ? nw[nw.length - 1].total : 0;
  const nwFirst = nw.length ? nw[0].total : 0;
  const nwDelta = nwLatest - nwFirst;

  return (
    <div className="space-y-4">
      {/* range selector — pinned just below the app header while scrolling. Solid bg (no
          backdrop-blur): two overlapping backdrop-filter sticky layers break sticking in Chromium. */}
      <div
        className="sticky z-20 -mx-4 space-y-2 border-b border-line/60 bg-ink px-4 py-2.5"
        style={{ top: "calc(env(safe-area-inset-top) + 3.25rem)" }}
      >
      <div className="flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => {
              setCustom(false);
              setRangeN(r.n);
            }}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${
              !custom && rangeN === r.n ? "bg-gold text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"
            }`}
          >
            {r.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(true)}
          className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${
            custom ? "bg-gold text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"
          }`}
        >
          Custom
        </button>
      </div>
      {!custom && rangeN !== Infinity && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-paper-faint">{rangeN === 1 ? "Month" : `${rangeN}M ending`}</span>
          <select
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
            className="field min-w-0 flex-1 py-1.5 text-xs [color-scheme:dark]"
            aria-label="Anchor month"
          >
            {months.map((m) => (
              <option key={m} value={m} className="bg-ink-2">{mLong(m)}</option>
            ))}
          </select>
        </div>
      )}
      {custom && (
        <div className="flex items-center gap-2">
          <select
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="field min-w-0 flex-1 py-1.5 text-xs [color-scheme:dark]"
            aria-label="From month"
          >
            {months.map((m) => (
              <option key={m} value={m} className="bg-ink-2">{mLong(m)}</option>
            ))}
          </select>
          <span className="shrink-0 text-xs text-paper-faint">→</span>
          <select
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="field min-w-0 flex-1 py-1.5 text-xs [color-scheme:dark]"
            aria-label="To month"
          >
            {months.map((m) => (
              <option key={m} value={m} className="bg-ink-2">{mLong(m)}</option>
            ))}
          </select>
        </div>
      )}
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
        <div className="mb-2 flex items-center justify-between">
          <p className="label">Cash flow{isDaily ? " · daily" : ""}</p>
          {activeMonth && !isDaily && (
            <button
              type="button"
              onClick={() => setSelMonth(null)}
              className="rounded-full bg-ink-3 px-2 py-0.5 text-[11px] text-paper-dim active:text-paper"
            >
              {mShort(activeMonth)} ✕
            </button>
          )}
        </div>

        {/* Legend — tap a series to isolate its line */}
        <div className="mb-1 flex flex-wrap gap-1.5">
          {(["income", "expense", "saving", "investment"] as Kind[]).map((k) => {
            const on = highlight === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setHighlight((cur) => (cur === k ? null : k))}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-opacity ${
                  highlight && !on ? "opacity-40" : ""
                } ${on ? "text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"}`}
                style={on ? { backgroundColor: KIND_COLOR[k] } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: KIND_COLOR[k] }} />
                {k}
              </button>
            );
          })}
        </div>

        <MultiLineChart
          points={seriesPoints}
          highlight={highlight}
          daily={isDaily}
          selected={isDaily ? null : activeMonth}
          onSelect={isDaily ? undefined : (label) => setSelMonth((cur) => (cur === label ? null : label))}
        />

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Income" value={scope.income} color="text-green" />
          <Stat label="Expense" value={scope.expense} color="text-red" />
          <Stat label="Net" value={scope.net} color={scope.net >= 0 ? "text-green" : "text-red"} signed />
        </div>
        <p className="mt-2 text-center text-[11px] text-paper-faint">
          {isDaily ? mLong(anchor) : activeMonth ? mLong(activeMonth) : `${flows.length} months`} · saved + invested{" "}
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
          <span className="text-paper-dim">{formatRupiah(breakdown.sum)}</span> total · tap a slice or row to drill in
        </p>

        {breakdown.rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-paper-faint">Nothing here for this scope.</p>
        ) : (
          <>
            <Donut
              slices={breakdown.rows.map((r, i) => ({ id: r.id, value: Math.max(0, r.total), color: PALETTE[i % PALETTE.length] }))}
              selectedId={selCat}
              onSelect={(id) => setSelCat((cur) => (cur === id ? null : id))}
            >
              {selRow ? (
                <>
                  <span className="max-w-full truncate text-[11px] text-paper-dim">{catName(selRow.id)}</span>
                  <span className="font-display text-xl font-semibold tabular-nums text-paper">{formatRupiahShort(selRow.total)}</span>
                  <span className="text-[10px] text-paper-faint">{selPct.toFixed(0)}% of {kind}</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] uppercase tracking-wider text-paper-faint">total {kind}</span>
                  <span className="font-display text-xl font-semibold tabular-nums text-paper">{formatRupiahShort(breakdown.sum)}</span>
                  <span className="text-[10px] text-paper-faint">{breakdown.rows.length} categories</span>
                </>
              )}
            </Donut>

            <div className="mt-3 space-y-0.5">
              {breakdown.rows.map((r, i) => {
                const color = PALETTE[i % PALETTE.length];
                const pct = breakdown.sum ? (r.total / breakdown.sum) * 100 : 0;
                const open = selCat === r.id;
                return (
                  <div key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelCat(open ? null : r.id)}
                      className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors active:bg-ink-3 ${open ? "bg-ink-3" : ""}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color, opacity: selCat !== null && !open ? 0.3 : 1 }}
                        />
                        <span className="flex-1 truncate text-sm text-paper">{catName(r.id)}</span>
                        <span className="shrink-0 font-display text-sm tabular-nums text-paper-dim">{formatRupiahShort(r.total)}</span>
                        <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-paper-faint">{pct.toFixed(0)}%</span>
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
                      {drill.pie.length > 0 && (
                        <div className="mt-2 flex items-center gap-3">
                          <Donut
                            slices={drill.pie.map((s, j) => ({ id: j, value: s.value, color: PALETTE[j % PALETTE.length] }))}
                            selectedId={null}
                            onSelect={() => {}}
                            size={108}
                          >
                            <span className="text-[9px] uppercase tracking-wider text-paper-faint">entries</span>
                            <span className="font-display text-base font-semibold tabular-nums text-paper">{drill.entryCount}</span>
                          </Donut>
                          <div className="min-w-0 flex-1 space-y-1">
                            {drill.pie.map((s, j) => (
                              <div key={j} className="flex items-center gap-1.5 text-[11px]">
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[j % PALETTE.length] }} />
                                <span className="min-w-0 flex-1 truncate text-paper-dim">{s.label}</span>
                                <span className="shrink-0 tabular-nums text-paper">{formatRupiahShort(s.value)}</span>
                                <span className="w-8 shrink-0 text-right tabular-nums text-paper-faint">
                                  {drill.pieTotal ? Math.round((s.value / drill.pieTotal) * 100) : 0}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {drill.biggest && (
                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line/40 pt-2.5">
                          <div className="min-w-0">
                            <div className="label">Biggest single</div>
                            <div className="mt-0.5 truncate text-xs text-paper">{drill.biggest.description || "(no note)"}</div>
                            <div className="font-display text-sm tabular-nums" style={{ color }}>
                              {formatRupiahShort(drill.biggest.amount)}
                              <span className="ml-1 text-[10px] text-paper-faint">· {mShort(drill.biggest.month)}</span>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="label">Most often</div>
                            {drill.mostOften && drill.mostOften.count >= 2 ? (
                              <>
                                <div className="mt-0.5 truncate text-xs text-paper">{drill.mostOften.label}</div>
                                <div className="font-display text-sm tabular-nums text-paper-dim">
                                  {drill.mostOften.count}×
                                  <span className="ml-1 text-[10px] text-paper-faint">· {formatRupiahShort(drill.mostOften.total)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="mt-0.5 text-xs text-paper-faint">No repeated entries.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          </>
        )}
      </section>

      {/* ---------- Category over time ---------- */}
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="label">Category over time</p>
          {trend?.cat && (
            <span className="flex items-center gap-1.5 text-[11px] capitalize text-paper-dim">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: KIND_COLOR[trend.kind] }} />
              {trend.kind}
            </span>
          )}
        </div>

        <select
          value={trendCat ?? ""}
          onChange={(e) => setTrendCat(e.target.value ? Number(e.target.value) : null)}
          className="field w-full py-1.5 text-xs [color-scheme:dark]"
          aria-label="Category to compare across months"
        >
          <option value="" className="bg-ink-2">Pick a category…</option>
          {trendOptions.map((g) => (
            <optgroup key={g.kind} label={g.kind[0].toUpperCase() + g.kind.slice(1)}>
              {g.items.map((c) => (
                <option key={c.id} value={c.id} className="bg-ink-2">{c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {!trend ? (
          <p className="py-6 text-center text-sm text-paper-faint">Pick a category to see its month-by-month trend.</p>
        ) : trend.activeMonths === 0 ? (
          <p className="py-6 text-center text-sm text-paper-faint">No {trend.cat?.name} activity in this range.</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Total" value={trend.total} color={KIND_TEXT[trend.kind]} />
              <Stat label="Avg / mo" value={trend.avg} color="text-paper" />
              <Stat label="Peak" value={trend.max.value} color="text-paper" />
            </div>
            <div className="mt-3">
              <CategoryTrend key={`${trendCat}-${trend.pts.length}`} points={trend.pts} color={KIND_COLOR[trend.kind]} />
            </div>
            <p className="mt-1 text-center text-[11px] text-paper-faint">
              peak {mShort(trend.max.month)} · active {trend.activeMonths} of {trend.pts.length} months
            </p>
          </>
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

// ---- Category donut (SVG ring; slices via stroke-dasharray) ----
function Donut({
  slices,
  selectedId,
  onSelect,
  children,
  size = 168,
}: {
  slices: { id: number; value: number; color: string }[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  children: React.ReactNode;
  size?: number;
}) {
  const sw = Math.round(size * 0.13);
  const r = (size - sw) / 2;
  const c = size / 2;
  const CIRC = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  let acc = 0;

  return (
    <div className="relative mx-auto my-1" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke={C.line} strokeWidth={sw} opacity={0.5} />
        {total > 0 &&
          slices.map((s) => {
            const frac = s.value / total;
            const dash = frac * CIRC;
            const off = -acc * CIRC;
            acc += frac;
            const dim = selectedId !== null && selectedId !== s.id;
            return (
              <circle
                key={s.id}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={sw}
                strokeDasharray={`${dash} ${CIRC - dash}`}
                strokeDashoffset={off}
                opacity={dim ? 0.2 : 1}
                onClick={() => onSelect(s.id)}
                style={{ cursor: "pointer", transition: "opacity .15s" }}
              />
            );
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
        {children}
      </div>
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

// ---- Cash-flow multi-line (SVG): income / expense / saving / investment ----
function MultiLineChart({
  points,
  highlight,
  daily,
  selected,
  onSelect,
}: {
  points: { label: string; income: number; expense: number; saving: number; investment: number }[];
  highlight: Kind | null;
  daily: boolean;
  selected: string | null;
  onSelect?: (label: string) => void;
}) {
  const W = 700;
  const H = 190;
  const pad = 10;
  const n = points.length;
  if (n < 2) return <p className="py-6 text-center text-xs text-paper-faint">Need more points to chart.</p>;

  const SERIES: { key: Kind; color: string }[] = [
    { key: "saving", color: C.sky },
    { key: "investment", color: C.plum },
    { key: "income", color: C.green },
    { key: "expense", color: C.red },
  ];
  const max = points.reduce((m, p) => Math.max(m, p.income, p.expense, p.saving, p.investment), 0) || 1;
  const x = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad);
  const y = (v: number) => pad + (1 - v / max) * (H - 2 * pad);
  const labelOf = (lbl: string) => (daily ? String(Number(lbl.slice(8, 10))) : mShort(lbl));
  const step = Math.max(1, Math.ceil(n / 6));
  const selIdx = selected ? points.findIndex((p) => p.label === selected) : -1;

  return (
    <div className="mt-1">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
          {selIdx >= 0 && (
            <line x1={x(selIdx)} y1={pad} x2={x(selIdx)} y2={H - pad} stroke={C.line} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          )}
          {SERIES.map((s) => {
            const dim = highlight !== null && highlight !== s.key;
            const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[s.key]).toFixed(1)}`).join(" ");
            return (
              <path
                key={s.key}
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={dim ? 1.2 : 2.4}
                opacity={dim ? 0.18 : 1}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        {onSelect && (
          <div className="absolute inset-0 flex">
            {points.map((p) => (
              <button key={p.label} type="button" aria-label={p.label} className="flex-1" onClick={() => onSelect(p.label)} />
            ))}
          </div>
        )}
      </div>
      <div className="flex">
        {points.map((p, i) => (
          <span key={p.label} className="flex-1 text-center text-[9px] text-paper-faint">
            {i % step === 0 || i === n - 1 ? labelOf(p.label) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---- One category's monthly bars (tap a bar to read its month/value) ----
function CategoryTrend({ points, color }: { points: { month: string; value: number }[]; color: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const n = points.length;
  if (n === 0) return null;
  const max = points.reduce((m, p) => Math.max(m, p.value), 0) || 1;
  const cur = sel !== null && sel < n ? sel : n - 1;
  const step = Math.max(1, Math.ceil(n / 8));

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 132 }}>
        {points.map((p, i) => (
          <button
            key={p.month}
            type="button"
            onClick={() => setSel(i)}
            aria-label={`${mLong(p.month)}: ${p.value}`}
            className="flex h-full flex-1 flex-col justify-end"
          >
            <div
              className="w-full rounded-t transition-opacity"
              style={{
                height: `${(p.value / max) * 100}%`,
                minHeight: p.value > 0 ? 3 : 0,
                backgroundColor: color,
                opacity: i === cur ? 1 : 0.45,
              }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex">
        {points.map((p, i) => (
          <span key={p.month} className="flex-1 text-center text-[9px] text-paper-faint">
            {i % step === 0 || i === n - 1 ? mShort(p.month) : ""}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-paper-dim">
        {mLong(points[cur].month)}: <span className="tabular-nums text-paper">{formatRupiah(points[cur].value)}</span>
      </p>
    </div>
  );
}

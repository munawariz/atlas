"use client";

import { useMemo, useState } from "react";
import {
  formatMonthShort,
  formatRupiah,
  formatRupiahShort,
} from "@/lib/format";
import type { ChartData, MonthFlow } from "@/lib/data";
import type { Category, CategoryKind } from "@/lib/types";

/**
 * Every chart here is hand-rolled SVG. A charting library would be ~40kB of JavaScript to draw
 * five simple shapes, and none of them match the design system's flat, axis-free style.
 */

/**
 * Bar fills, from the design system's STRONG tokens only. The full series ramp includes
 * lime-500, sage-300 and forest-300, which all wash out against white/cream at a few
 * pixels tall — so those pale entries are deliberately absent here.
 */
const PALETTE = [
  "#003511", // forest-800
  "#2f6bd8", // info-500
  "#e8a33d", // warning-500
  "#2f6a44", // forest-500
  "#c8452f", // negative-500
  "#a8d21f", // lime-700
  "#159a4a", // positive-500
  "#24509f", // info-600
  "#8a5b12", // warning-600
  "#1a5230", // forest-600
];

const FLOW_SERIES: { key: keyof MonthFlow; label: string; color: string }[] = [
  { key: "income", label: "Income", color: "var(--color-positive-500)" },
  { key: "expense", label: "Expense", color: "var(--color-negative-500)" },
  { key: "saving", label: "Saving", color: "var(--color-info-500)" },
  { key: "investment", label: "Invest", color: "var(--color-forest-800)" },
];

const PRESETS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "12M", months: 12 },
  { label: "All", months: 0 },
];

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "saving", label: "Saving" },
  { value: "investment", label: "Invest" },
];

const W = 320;
const H = 140;
const PAD = 6;

function scaleX(i: number, n: number): number {
  return n <= 1 ? W / 2 : PAD + (i / (n - 1)) * (W - PAD * 2);
}

function scaleY(value: number, lo: number, hi: number): number {
  if (hi === lo) return H / 2;
  return H - PAD - ((value - lo) / (hi - lo)) * (H - PAD * 2);
}

function stepMonth(monthKey: string, delta: number): string {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Every day of a month as YYYY-MM-DD. Used by the 1M daily zoom. */
function daysOf(monthKey: string): string[] {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from(
    { length: count },
    (_, i) => `${monthKey.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`
  );
}

export default function ChartsClient({
  data,
  categories,
}: {
  data: ChartData;
  categories: Category[];
}) {
  const months = data.months;
  const anchorDefault = months[months.length - 1] ?? "";

  const [preset, setPreset] = useState(6);
  const [anchor, setAnchor] = useState(anchorDefault);
  const [customFrom, setCustomFrom] = useState(months[0] ?? "");
  const [customTo, setCustomTo] = useState(anchorDefault);
  const [custom, setCustom] = useState(false);

  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [breakdownKind, setBreakdownKind] = useState<CategoryKind>("expense");
  const [drilldown, setDrilldown] = useState<number | null>(null);
  const [overTimeCategory, setOverTimeCategory] = useState<number | null>(null);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // --- Window ---------------------------------------------------------------
  // lo/hi are normalized so a From after a To still produces a valid range.
  const [lo, hi] = useMemo(() => {
    if (custom) {
      return customFrom <= customTo
        ? [customFrom, customTo]
        : [customTo, customFrom];
    }
    if (preset === 0) return [months[0] ?? "", anchor];
    const start = stepMonth(anchor, -(preset - 1));
    return [start, anchor];
  }, [custom, customFrom, customTo, preset, anchor, months]);

  const windowMonths = useMemo(
    () => months.filter((m) => m >= lo && m <= hi),
    [months, lo, hi]
  );

  const dailyMode = !custom && preset === 1;

  if (months.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] bg-white px-5 py-10 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
        No data yet. Add a few transactions and the charts will fill in.
      </p>
    );
  }

  // --- Net worth ------------------------------------------------------------
  // One leading point before the window gives the area a baseline to start from, so a rising
  // line does not appear to begin at zero.
  const nwIndexLo = months.indexOf(windowMonths[0] ?? lo);
  const nwMonths = months.slice(Math.max(0, nwIndexLo - 1), months.indexOf(windowMonths[windowMonths.length - 1] ?? hi) + 1);
  const nwPoints = nwMonths.map((m) => data.networth[m] ?? 0);
  const nwLo = Math.min(...nwPoints, 0);
  const nwHi = Math.max(...nwPoints, 1);
  const nwDelta =
    (nwPoints[nwPoints.length - 1] ?? 0) - (nwPoints[0] ?? 0);

  // --- Cash flow ------------------------------------------------------------
  const flowLabels = dailyMode ? daysOf(hi) : windowMonths;
  const flowValues = (key: keyof MonthFlow): number[] =>
    dailyMode
      ? flowLabels.map((day) => data.dailyFlows[day]?.[key] ?? 0)
      : flowLabels.map((month) => data.flows[month]?.[key] ?? 0);

  const visibleSeries = FLOW_SERIES.filter((s) => !hiddenSeries.has(s.key));
  const allFlowValues = visibleSeries.flatMap((s) => flowValues(s.key));
  const flowHi = Math.max(1, ...allFlowValues);
  const flowLo = Math.min(0, ...allFlowValues);

  // --- Category breakdown ---------------------------------------------------
  const breakdown = useMemo(() => {
    const totals = new Map<number, number>();
    for (const month of windowMonths) {
      const perCategory = data.catTotals[month];
      if (!perCategory) continue;
      for (const [id, entry] of Object.entries(perCategory)) {
        if (entry.kind !== breakdownKind) continue;
        const key = Number(id);
        totals.set(key, (totals.get(key) ?? 0) + entry.total);
      }
    }
    return [...totals.entries()]
      .map(([id, total]) => ({ id, total, name: catById.get(id)?.name ?? "Unknown" }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [windowMonths, data.catTotals, breakdownKind, catById]);

  const breakdownTotal = breakdown.reduce((sum, r) => sum + r.total, 0);

  // --- Drilldown ------------------------------------------------------------
  const drill = useMemo(() => {
    if (drilldown == null) return null;

    const entries = new Map<string, { total: number; count: number; max: number }>();
    let total = 0;
    let count = 0;
    let biggest = 0;
    let activeMonths = 0;

    for (const month of windowMonths) {
      const perCategory = data.catEntries[month]?.[drilldown];
      if (!perCategory) continue;
      activeMonths += 1;
      for (const [note, entry] of Object.entries(perCategory)) {
        const bucket = entries.get(note) ?? { total: 0, count: 0, max: 0 };
        bucket.total += entry.total;
        bucket.count += entry.count;
        bucket.max = Math.max(bucket.max, entry.max);
        entries.set(note, bucket);
        total += entry.total;
        count += entry.count;
        biggest = Math.max(biggest, entry.max);
      }
    }

    const ranked = [...entries.entries()]
      .map(([note, entry]) => ({ note, ...entry }))
      .sort((a, b) => b.total - a.total);

    // Skip blank notes when reporting the most frequent entry — "" is not an answer.
    const frequent = [...ranked]
      .filter((r) => r.note)
      .sort((a, b) => b.count - a.count)[0];

    const top = ranked.slice(0, 7);
    const rest = ranked.slice(7);
    const slices =
      rest.length > 0
        ? [
            ...top,
            {
              note: `Other (${rest.length})`,
              total: rest.reduce((sum, r) => sum + r.total, 0),
              count: rest.reduce((sum, r) => sum + r.count, 0),
              max: 0,
            },
          ]
        : top;

    return {
      name: catById.get(drilldown)?.name ?? "Unknown",
      slices,
      total,
      count,
      biggest,
      average: activeMonths > 0 ? Math.round(total / activeMonths) : 0,
      frequent,
    };
  }, [drilldown, windowMonths, data.catEntries, catById]);

  // --- Category over time ---------------------------------------------------
  const overTime = useMemo(() => {
    if (overTimeCategory == null) return null;
    const values = windowMonths.map(
      (month) => data.catTotals[month]?.[overTimeCategory]?.total ?? 0
    );
    const total = values.reduce((sum, v) => sum + v, 0);
    const peakIndex = values.indexOf(Math.max(...values, 0));
    return {
      name: catById.get(overTimeCategory)?.name ?? "Unknown",
      values,
      total,
      average: values.length > 0 ? Math.round(total / values.length) : 0,
      peakMonth: windowMonths[peakIndex],
      peakValue: values[peakIndex] ?? 0,
    };
  }, [overTimeCategory, windowMonths, data.catTotals, catById]);

  /** Every category that has any activity at all, grouped by kind for the picker. */
  const activeCategories = useMemo(() => {
    const seen = new Set<number>();
    for (const month of months) {
      for (const id of Object.keys(data.catTotals[month] ?? {})) seen.add(Number(id));
    }
    return KINDS.map((kind) => ({
      kind,
      options: [...seen]
        .map((id) => catById.get(id))
        .filter((c): c is Category => Boolean(c) && c!.kind === kind.value)
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((group) => group.options.length > 0);
  }, [months, data.catTotals, catById]);

  return (
    <div className="space-y-5 privacy-scope">
      {/* --- Range bar. Sticky below the app header, solid ground, no blur. --- */}
      <div
        className="sticky z-20 -mx-4 bg-cream-100 px-4 py-2"
        style={{ top: "calc(env(safe-area-inset-top) + 3.25rem)" }}
      >
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {PRESETS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                setCustom(false);
                setPreset(option.months);
              }}
              aria-pressed={!custom && preset === option.months}
              className={`chip h-8 shrink-0 px-3 text-[13px] ${
                !custom && preset === option.months ? "chip-on" : ""
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustom(true)}
            aria-pressed={custom}
            className={`chip h-8 shrink-0 px-3 text-[13px] ${custom ? "chip-on" : ""}`}
          >
            Custom
          </button>

          {!custom && (
            <select
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              aria-label="Ending month"
              className="field h-8 w-auto shrink-0 py-0 text-[13px]"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {formatMonthShort(month)}
                </option>
              ))}
            </select>
          )}
        </div>

        {custom && (
          <div className="mt-2 flex items-center gap-2">
            <select
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              aria-label="From month"
              className="field h-9 flex-1 py-0 text-[13px]"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {formatMonthShort(month)}
                </option>
              ))}
            </select>
            <span className="text-ink-300">→</span>
            <select
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              aria-label="To month"
              className="field h-9 flex-1 py-0 text-[13px]"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {formatMonthShort(month)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* --- Net worth ------------------------------------------------------ */}
      <section className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="label">Net worth</h2>
          <span
            className={`text-[13px] font-semibold tabular-nums ${
              nwDelta >= 0 ? "text-positive-600" : "text-negative-600"
            }`}
          >
            {nwDelta >= 0 ? "▲" : "▼"} {formatRupiah(Math.abs(nwDelta))}
          </span>
        </div>
        <div className="mt-1 font-display text-[24px] font-extrabold tracking-[-0.03em] text-ink-900 tabular-nums">
          {formatRupiah(nwPoints[nwPoints.length - 1] ?? 0)}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-3 w-full"
          role="img"
          aria-label="Net worth over time"
        >
          <path
            d={`${nwPoints
              .map(
                (v, i) =>
                  `${i === 0 ? "M" : "L"} ${scaleX(i, nwPoints.length)} ${scaleY(v, nwLo, nwHi)}`
              )
              .join(" ")} L ${scaleX(nwPoints.length - 1, nwPoints.length)} ${H} L ${scaleX(0, nwPoints.length)} ${H} Z`}
            fill="var(--color-forest-800)"
            opacity="0.1"
          />
          <path
            d={nwPoints
              .map(
                (v, i) =>
                  `${i === 0 ? "M" : "L"} ${scaleX(i, nwPoints.length)} ${scaleY(v, nwLo, nwHi)}`
              )
              .join(" ")}
            fill="none"
            stroke="var(--color-forest-800)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <div className="mt-1 flex justify-between text-[11px] text-ink-300">
          <span>{formatMonthShort(nwMonths[0] ?? lo)}</span>
          <span>{formatMonthShort(nwMonths[nwMonths.length - 1] ?? hi)}</span>
        </div>
      </section>

      {/* --- Cash flow ------------------------------------------------------- */}
      <section className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
        <h2 className="label">
          Cash flow{dailyMode && " · daily"}
        </h2>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-3 w-full"
          role="img"
          aria-label="Cash flow over time"
        >
          {visibleSeries.map((series) => {
            const values = flowValues(series.key);
            return (
              <path
                key={series.key}
                d={values
                  .map(
                    (v, i) =>
                      `${i === 0 ? "M" : "L"} ${scaleX(i, values.length)} ${scaleY(v, flowLo, flowHi)}`
                  )
                  .join(" ")}
                fill="none"
                stroke={series.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        <div className="mt-2 flex flex-wrap gap-2">
          {FLOW_SERIES.map((series) => {
            const off = hiddenSeries.has(series.key);
            return (
              <button
                key={series.key}
                type="button"
                onClick={() =>
                  setHiddenSeries((prev) => {
                    const next = new Set(prev);
                    if (next.has(series.key)) next.delete(series.key);
                    else next.add(series.key);
                    return next;
                  })
                }
                aria-pressed={!off}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-opacity ${
                  off ? "opacity-35" : ""
                }`}
                style={{ background: "var(--color-cream-100)" }}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ background: series.color }}
                />
                {series.label}
              </button>
            );
          })}
        </div>

        <div className="mt-1 flex justify-between text-[11px] text-ink-300">
          <span>
            {dailyMode ? "1" : formatMonthShort(flowLabels[0] ?? lo)}
          </span>
          <span>
            {dailyMode
              ? flowLabels.length
              : formatMonthShort(flowLabels[flowLabels.length - 1] ?? hi)}
          </span>
        </div>
      </section>

      {/* --- Category breakdown ---------------------------------------------- */}
      <section className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
        <h2 className="label mb-3">Category breakdown</h2>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {KINDS.map((kind) => (
            <button
              key={kind.value}
              type="button"
              onClick={() => {
                setBreakdownKind(kind.value);
                setDrilldown(null);
              }}
              aria-pressed={breakdownKind === kind.value}
              className={`chip h-8 shrink-0 px-3 text-[13px] ${
                breakdownKind === kind.value ? "chip-on" : ""
              }`}
            >
              {kind.label}
            </button>
          ))}
        </div>

        {breakdown.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-500">
            Nothing in this range.
          </p>
        ) : (
          <div className="mt-3 space-y-1">
            {breakdown.map((row, i) => (
              <button
                key={row.id}
                type="button"
                onClick={() =>
                  setDrilldown((prev) => (prev === row.id ? null : row.id))
                }
                aria-expanded={drilldown === row.id}
                className="w-full text-left"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink-900">
                    {row.name}
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold text-ink-900 tabular-nums">
                    {formatRupiahShort(row.total)}
                  </span>
                </div>
                <div className="mt-1 mb-2 h-1.5 overflow-hidden rounded-full bg-cream-200">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${breakdownTotal > 0 ? (row.total / breakdownTotal) * 100 : 0}%`,
                      background: PALETTE[i % PALETTE.length],
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        {drill && (
          <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
            <div className="text-[15px] font-bold text-ink-900">{drill.name}</div>

            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
              {[
                ["Total", formatRupiah(drill.total)],
                ["Avg / month", formatRupiah(drill.average)],
                ["Entries", String(drill.count)],
                ["Biggest", formatRupiah(drill.biggest)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-ink-500">{label}</dt>
                  <dd className="font-semibold text-ink-900 tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {drill.frequent && (
              <p className="mt-2 text-[13px] text-ink-500">
                Most often:{" "}
                <strong className="text-ink-900">{drill.frequent.note}</strong> ×{" "}
                {drill.frequent.count}
              </p>
            )}

            <div className="mt-3 space-y-1">
              {drill.slices.map((slice, i) => (
                <div key={slice.note || `blank-${i}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-700">
                      {slice.note || "— no note —"}
                      <span className="ml-1.5 text-ink-300">×{slice.count}</span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-ink-900 tabular-nums">
                      {formatRupiahShort(slice.total)}
                    </span>
                  </div>
                  <div className="mt-0.5 mb-1.5 h-1 overflow-hidden rounded-full bg-cream-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${drill.total > 0 ? (slice.total / drill.total) * 100 : 0}%`,
                        background: PALETTE[i % PALETTE.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* --- Category over time ---------------------------------------------- */}
      <section className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
        <h2 className="label mb-3">Category over time</h2>

        <select
          value={overTimeCategory ?? ""}
          onChange={(e) =>
            setOverTimeCategory(e.target.value ? parseInt(e.target.value, 10) : null)
          }
          aria-label="Category to trace"
          className="field"
        >
          <option value="">Pick a category</option>
          {activeCategories.map((group) => (
            <optgroup key={group.kind.value} label={group.kind.label}>
              {group.options.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {overTime && (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="mt-3 w-full"
              role="img"
              aria-label={`${overTime.name} over time`}
            >
              {overTime.values.map((value, i) => {
                const max = Math.max(1, ...overTime.values);
                const barWidth = Math.max(
                  2,
                  (W - PAD * 2) / Math.max(1, overTime.values.length) - 3
                );
                const height = (value / max) * (H - PAD * 2);
                return (
                  <rect
                    key={i}
                    x={scaleX(i, overTime.values.length) - barWidth / 2}
                    y={H - PAD - height}
                    width={barWidth}
                    height={height}
                    rx={Math.min(4, barWidth / 2)}
                    fill={
                      i % 2 === 0
                        ? "var(--color-forest-800)"
                        : "var(--color-forest-500)"
                    }
                  />
                );
              })}
            </svg>

            <dl className="mt-2 grid grid-cols-3 gap-2 text-[13px]">
              {[
                ["Total", formatRupiahShort(overTime.total)],
                ["Average", formatRupiahShort(overTime.average)],
                [
                  "Peak",
                  overTime.peakMonth
                    ? `${formatMonthShort(overTime.peakMonth)}`
                    : "—",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="label">{label}</dt>
                  <dd className="font-semibold text-ink-900 tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>
    </div>
  );
}

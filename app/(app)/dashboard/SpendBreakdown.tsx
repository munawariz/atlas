"use client";

import { useState } from "react";
import { formatDateShort, formatRupiah } from "@/lib/format";

export interface BreakdownSlice {
  categoryId: number | null;
  name: string;
  total: number;
  transactions: { id: number; description: string | null; amount: number; occurred_on: string }[];
}

const SERIES = [
  "var(--color-series-1)",
  "var(--color-series-2)",
  "var(--color-series-3)",
  "var(--color-series-4)",
  "var(--color-series-5)",
  "var(--color-series-6)",
  "var(--color-series-7)",
  "var(--color-series-8)",
  "var(--color-series-9)",
];

const RADIUS = 62;
const THICKNESS = 20;
const SIZE = 150;

/** Polar to cartesian, with 0° at twelve o'clock. */
function point(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number): string {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const outer = RADIUS;
  const inner = RADIUS - THICKNESS;

  // A full circle cannot be drawn as one arc — 360° start and end are the same point.
  const sweep = Math.min(endDeg - startDeg, 359.999);
  const end = startDeg + sweep;
  const large = sweep > 180 ? 1 : 0;

  const o1 = point(cx, cy, outer, startDeg);
  const o2 = point(cx, cy, outer, end);
  const i2 = point(cx, cy, inner, end);
  const i1 = point(cx, cy, inner, startDeg);

  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${i1.x} ${i1.y}`,
    "Z",
  ].join(" ");
}

/**
 * A donut of the month's expenses by category, over a legend.
 *
 * Tapping a slice or a legend row isolates it: its slice stays lit, the rest dim, the centre
 * swaps to that category's figures, and its transactions expand inline.
 */
export default function SpendBreakdown({
  slices,
  total,
}: {
  slices: BreakdownSlice[];
  total: number;
}) {
  const [isolated, setIsolated] = useState<number | null>(null);

  if (slices.length === 0 || total <= 0) {
    return (
      <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
        No spending recorded this month.
      </p>
    );
  }

  let cursor = 0;
  const arcs = slices.map((slice, i) => {
    const sweep = (slice.total / total) * 360;
    const path = arcPath(cursor, cursor + sweep);
    cursor += sweep;
    return { path, color: SERIES[i % SERIES.length], index: i };
  });

  const active = isolated == null ? null : slices[isolated];
  const activeColor = isolated == null ? null : SERIES[isolated % SERIES.length];

  return (
    <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
      <div className="flex justify-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Spending by category"
        >
          {arcs.map((arc) => (
            <path
              key={arc.index}
              d={arc.path}
              fill={arc.color}
              opacity={isolated == null || isolated === arc.index ? 1 : 0.2}
              onClick={() =>
                setIsolated((prev) => (prev === arc.index ? null : arc.index))
              }
              style={{ cursor: "pointer", transition: "opacity 220ms cubic-bezier(.2,.8,.2,1)" }}
            />
          ))}

          <text
            x="50%"
            y="44%"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="var(--color-ink-500)"
          >
            {active ? truncate(active.name) : "Total"}
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            fontSize="14"
            fontWeight="800"
            fill="var(--color-ink-900)"
          >
            {shortMoney(active ? active.total : total)}
          </text>
          {active && (
            <text
              x="50%"
              y="70%"
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-ink-500)"
            >
              {Math.round((active.total / total) * 100)}%
            </text>
          )}
        </svg>
      </div>

      <div className="mt-4 space-y-1">
        {slices.map((slice, i) => {
          const isActive = isolated === i;
          return (
            <div key={`${slice.categoryId ?? "other"}-${i}`}>
              <button
                type="button"
                onClick={() => setIsolated((prev) => (prev === i ? null : i))}
                aria-expanded={isActive}
                className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left transition-opacity ${
                  isolated == null || isActive ? "" : "opacity-40"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: SERIES[i % SERIES.length] }}
                />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink-900">
                  {slice.name}
                </span>
                <span className="shrink-0 text-[13px] text-ink-500 tabular-nums">
                  {Math.round((slice.total / total) * 100)}%
                </span>
                <span className="shrink-0 text-[14px] font-semibold text-ink-900 tabular-nums">
                  {formatRupiah(slice.total)}
                </span>
              </button>

              {isActive && slice.transactions.length > 0 && (
                <ul className="mb-2 ml-5 space-y-1 border-l-2 pl-3" style={{ borderColor: activeColor ?? undefined }}>
                  {slice.transactions.map((txn) => (
                    <li
                      key={txn.id}
                      className="flex items-baseline justify-between gap-2 text-[13px]"
                    >
                      <span className="min-w-0 flex-1 truncate text-ink-700">
                        {txn.description || "—"}
                        <span className="ml-1.5 text-ink-300">
                          {formatDateShort(txn.occurred_on)}
                        </span>
                      </span>
                      <span className="shrink-0 text-ink-900 tabular-nums">
                        {formatRupiah(txn.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function truncate(text: string): string {
  return text.length > 14 ? `${text.slice(0, 13)}…` : text;
}

/** Compact enough to fit inside the donut hole at 14px. */
function shortMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 999.5e6) return `${(n / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (abs >= 999.5e3) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 999.5) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(n));
}

"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { formatDayLabel, monthName } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "./icons";

/**
 * Day scrubber for the dashboard: big arrows step the MONTH, a smaller row below steps ±1 day.
 *
 * All arithmetic runs in Date.UTC (ATLAS.md §14.7). Using local-time Date math here drifts by a
 * day around DST boundaries and in any timezone behind UTC.
 */

function parse(iso: string): { y: number; m: number; d: number } {
  return {
    y: parseInt(iso.slice(0, 4), 10),
    m: parseInt(iso.slice(5, 7), 10),
    d: parseInt(iso.slice(8, 10), 10),
  };
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function stepDay(iso: string, delta: number): string {
  const { y, m, d } = parse(iso);
  return toISO(new Date(Date.UTC(y, m - 1, d + delta)));
}

/** Stepping the month always lands on day 1 — the alternative is silently clamping Jan 31. */
function stepMonth(iso: string, delta: number): string {
  const { y, m } = parse(iso);
  return toISO(new Date(Date.UTC(y, m - 1 + delta, 1)));
}

export default function DaySwitcher({ day }: { day: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const { m, y } = parse(day);

  function go(next: string) {
    startTransition(() => router.push(`${pathname}?d=${next}`));
  }

  return (
    <div className={`transition-opacity ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-white px-2 py-2 shadow-[var(--shadow-xs)]">
        <button
          type="button"
          onClick={() => go(stepMonth(day, -1))}
          aria-label="Previous month"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-forest-800 transition-colors hover:bg-forest-50"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center leading-tight">
          <div className="font-display text-[17px] font-bold text-ink-900">
            {monthName(m)}
          </div>
          <div className="label">{y}</div>
        </div>

        <button
          type="button"
          onClick={() => go(stepMonth(day, 1))}
          aria-label="Next month"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-forest-800 transition-colors hover:bg-forest-50"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => go(stepDay(day, -1))}
          aria-label="Previous day"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-forest-50 hover:text-forest-800"
        >
          <ChevronLeft size={16} />
        </button>

        {/*
          The visible label is a real label; the date input is stretched invisibly over it so a
          tap opens the native picker. `opacity-0` rather than `hidden` — a hidden input has no
          hit area and will not open the picker on iOS.
        */}
        <label className="relative inline-flex h-8 min-w-[110px] items-center justify-center rounded-full bg-cream-200 px-4 text-[13px] font-semibold text-ink-800">
          {formatDayLabel(day)}
          <input
            type="date"
            value={day}
            onChange={(e) => e.target.value && go(e.target.value)}
            aria-label="Pick a date"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        <button
          type="button"
          onClick={() => go(stepDay(day, 1))}
          aria-label="Next day"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-forest-50 hover:text-forest-800"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

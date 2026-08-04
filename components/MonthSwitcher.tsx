"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { monthName } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "./icons";

interface MonthSwitcherProps {
  /** The month currently in view, as YYYY-MM-01. */
  monthKey: string;
  /** Extra search params to preserve while stepping months. */
  params?: Record<string, string | undefined>;
}

function step(monthKey: string, delta: number): string {
  const y = parseInt(monthKey.slice(0, 4), 10);
  const m = parseInt(monthKey.slice(5, 7), 10);
  // Date.UTC normalizes month 0 and 13 into the neighbouring year for us.
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** ‹ Month / Year › — pushes `?m=YYYY-MM-01`, dimming while the new page streams in. */
export default function MonthSwitcher({
  monthKey,
  params = {},
}: MonthSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const year = monthKey.slice(0, 4);
  const month = monthName(parseInt(monthKey.slice(5, 7), 10));

  function go(delta: number) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    search.set("m", step(monthKey, delta));
    startTransition(() => router.push(`${pathname}?${search.toString()}`));
  }

  return (
    <div
      className={`flex items-center justify-between rounded-[var(--radius-card)] bg-white px-2 py-2 shadow-[var(--shadow-xs)] transition-opacity ${
        pending ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous month"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-forest-800 transition-colors hover:bg-forest-50"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="text-center leading-tight">
        <div className="font-display text-[17px] font-bold text-ink-900">
          {month}
        </div>
        <div className="label">{year}</div>
      </div>

      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next month"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-forest-800 transition-colors hover:bg-forest-50"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

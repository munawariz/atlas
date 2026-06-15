"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { monthName } from "@/lib/format";

// `day` is YYYY-MM-DD. Big arrows switch the month (jumping to day 1); the smaller arrows
// below step ±1 day, and tapping the date opens a native picker to jump anywhere. All date
// math is done in UTC so it never drifts across timezones.
export default function DaySwitcher({ day, basePath = "/dashboard" }: { day: string; basePath?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [y, m, d] = day.split("-").map(Number);

  const goto = (next: string) => startTransition(() => router.push(`${basePath}?d=${next}`));
  const goMonth = (delta: number) => {
    let ny = y;
    let nm = m + delta;
    if (nm < 1) {
      nm = 12;
      ny -= 1;
    } else if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    goto(`${ny}-${String(nm).padStart(2, "0")}-01`); // switching month → first of the month
  };
  const shiftDay = (delta: number) => goto(new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10));

  const weekday = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

  const arrow =
    "flex items-center justify-center rounded-full border border-line/60 bg-ink-2 text-paper-dim transition-transform active:scale-90 disabled:active:scale-100";

  return (
    <div className={`space-y-2 transition-opacity ${pending ? "opacity-50" : ""}`}>
      {/* Month — main control */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => goMonth(-1)} disabled={pending} aria-label="Previous month" className={`h-10 w-10 ${arrow}`}>
          ‹
        </button>
        <div className="font-display text-xl font-medium tracking-tight text-paper">
          {monthName(m)} {y}
        </div>
        <button type="button" onClick={() => goMonth(1)} disabled={pending} aria-label="Next month" className={`h-10 w-10 ${arrow}`}>
          ›
        </button>
      </div>

      {/* Day — smaller stepper + tap-to-pick */}
      <div className="flex items-center justify-center gap-2.5">
        <button type="button" onClick={() => shiftDay(-1)} disabled={pending} aria-label="Previous day" className={`h-7 w-7 text-sm ${arrow}`}>
          ‹
        </button>
        <div className="relative px-2 py-1">
          <span className="text-[13px] font-medium text-paper-dim underline decoration-line decoration-dotted underline-offset-4">
            {`${weekday}, ${d}`}
          </span>
          <input
            type="date"
            value={day}
            onChange={(e) => e.target.value && goto(e.target.value)}
            aria-label="Pick a date"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [color-scheme:dark]"
          />
        </div>
        <button type="button" onClick={() => shiftDay(1)} disabled={pending} aria-label="Next day" className={`h-7 w-7 text-sm ${arrow}`}>
          ›
        </button>
      </div>
    </div>
  );
}

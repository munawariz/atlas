"use client";

import { useRouter } from "next/navigation";
import { monthName } from "@/lib/format";

export default function MonthSwitcher({
  monthKey,
  basePath = "/dashboard",
  params,
}: {
  monthKey: string;
  basePath?: string;
  params?: Record<string, string>;
}) {
  const router = useRouter();
  const [y, m] = monthKey.split("-").map(Number);

  const go = (delta: number) => {
    let ny = y;
    let nm = m + delta;
    if (nm < 1) {
      nm = 12;
      ny -= 1;
    } else if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    const qs = new URLSearchParams({ ...params, m: `${ny}-${String(nm).padStart(2, "0")}-01` });
    router.push(`${basePath}?${qs.toString()}`);
  };

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => go(-1)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line/60 bg-ink-2 text-paper-dim transition-transform active:scale-95"
        aria-label="Previous month"
      >
        ‹
      </button>
      <div className="text-center">
        <div className="font-display text-xl font-medium tracking-tight text-paper">{monthName(m)}</div>
        <div className="label -mt-0.5">{y}</div>
      </div>
      <button
        type="button"
        onClick={() => go(1)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line/60 bg-ink-2 text-paper-dim transition-transform active:scale-95"
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}

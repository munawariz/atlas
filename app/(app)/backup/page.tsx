import Link from "next/link";
import { getDataYears } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const years = await getDataYears();

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Backup</h1>
        <span className="w-12" />
      </div>

      <p className="px-1 text-sm text-paper-dim">
        Download an Excel snapshot of a year — that year&apos;s transactions plus your status (wallets, savings, stocks,
        bonds, forex, loans, paylater) as of year-end. Save it somewhere safe.
      </p>

      <div className="space-y-2">
        {years.map((y) => (
          <a
            key={y}
            href={`/snapshot?year=${y}`}
            className="card flex items-center justify-between px-4 py-4 transition-colors active:bg-ink-3"
          >
            <div>
              <div className="text-[15px] font-medium text-paper">{y} snapshot</div>
              <div className="text-xs text-paper-dim">finance-snapshot-{y}.xlsx · all {y} transactions + year-end status</div>
            </div>
            <span className="text-gold/70">⬇</span>
          </a>
        ))}
      </div>
    </div>
  );
}

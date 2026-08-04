import { getDataYears } from "@/lib/data";
import { Download } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Backup · Atlas" };

export default async function BackupPage() {
  const years = await getDataYears();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink-900">
          Backup
        </h1>
        <p className="mt-1 text-[14px] text-ink-500">
          Download a year as an Excel workbook — a summary plus every
          transaction, wallet, bucket, holding, loan and installment. Nine
          sheets, and the Summary totals reconcile with what the app shows.
        </p>
      </header>

      <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
        {years.map((year, i) => (
          <a
            key={year}
            href={`/snapshot?year=${year}`}
            className={`flex items-center gap-3 px-4 py-3.5 no-underline ${
              i > 0 ? "border-t border-[var(--border-subtle)]" : ""
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-cream-100 text-forest-800">
              <Download size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink-900">
                {year}
              </span>
              <span className="block text-[13px] text-ink-500">
                finance-snapshot-{year}.xlsx
              </span>
            </span>
          </a>
        ))}
      </div>

      <p className="rounded-[var(--radius-card)] bg-sage-100 p-4 text-[13px] text-ink-700">
        Holdings are valued <strong>as of that year&rsquo;s end</strong>, not today.
        Only the current year uses live stock prices — a past year would be wrong
        if it did.
      </p>
    </div>
  );
}

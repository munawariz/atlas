import Link from "next/link";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { ChevronLeft, Trash } from "@/components/icons";
import {
  currentMonthKey,
  getLoanPayments,
  getLoans,
  getWallets,
} from "@/lib/data";
import { formatRupiah } from "@/lib/format";
import PaymentGrid from "./PaymentGrid";
import { addLoan, deleteLoan } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Loans · Atlas" };

const TABS = [
  { key: "unfinished", label: "Unfinished" },
  { key: "finished", label: "Finished" },
  { key: "all", label: "All" },
] as const;

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const tab = (TABS.some((x) => x.key === t) ? t : "unfinished") as
    | "unfinished"
    | "finished"
    | "all";

  const [loans, payments, wallets] = await Promise.all([
    getLoans(),
    getLoanPayments(),
    getWallets(),
  ]);

  const byLoan = new Map<number, typeof payments>();
  for (const payment of payments) {
    const list = byLoan.get(payment.loan_id) ?? [];
    list.push(payment);
    byLoan.set(payment.loan_id, list);
  }

  const rows = loans.map((loan) => {
    const schedule = byLoan.get(loan.id) ?? [];
    const expected = schedule.reduce(
      (sum, p) => sum + (p.amount ?? loan.installment),
      0
    );
    const collected = schedule
      .filter((p) => p.paid)
      .reduce((sum, p) => sum + (p.amount ?? loan.installment), 0);

    /**
     * Finished means every scheduled month is FULLY collected — a partial collection leaves
     * the loan open, which is the whole point of tracking partials separately.
     */
    const finished =
      schedule.length > 0 &&
      schedule.every(
        (p) => p.paid && (p.amount ?? loan.installment) >= loan.installment
      );

    return {
      loan,
      schedule,
      expected,
      collected,
      outstanding: expected - collected,
      pct: expected > 0 ? (collected / expected) * 100 : 0,
      finished,
    };
  });

  const visible = rows.filter((row) =>
    tab === "all" ? true : tab === "finished" ? row.finished : !row.finished
  );

  const totalOutstanding = rows
    .filter((r) => !r.finished)
    .reduce((sum, r) => sum + r.outstanding, 0);

  const defaultWalletId = wallets[0]?.id ?? null;

  return (
    <div className="space-y-4 privacy-scope">
      <header className="flex items-center gap-1">
        <Link
          href="/more"
          aria-label="Back to more"
          className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 no-underline"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-ink-900">
          Loans
        </h1>
      </header>

      <section className="rounded-[var(--radius-card)] bg-forest-800 p-5 on-forest">
        <div className="label" style={{ color: "var(--color-forest-300)" }}>
          Still owed to you
        </div>
        <div className="mt-1 font-display text-[32px] font-extrabold tracking-[-0.03em] text-white tabular-nums">
          {formatRupiah(totalOutstanding)}
        </div>
        <p className="mt-1 text-[13px]" style={{ color: "var(--color-forest-200)" }}>
          Money other people owe you, collected month by month.
        </p>
      </section>

      <nav className="flex gap-2">
        {TABS.map((x) => (
          <Link
            key={x.key}
            href={`/more/loans?t=${x.key}`}
            aria-current={x.key === tab ? "page" : undefined}
            className={`chip no-underline ${x.key === tab ? "chip-on" : ""}`}
          >
            {x.label}
          </Link>
        ))}
      </nav>

      <details className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
        <summary className="px-4 py-3.5 text-[15px] font-semibold text-ink-900">
          Add a loan
        </summary>
        <form
          action={addLoan}
          className="space-y-2 border-t border-[var(--border-subtle)] p-4"
        >
          <input
            name="person"
            placeholder="Who owes you"
            aria-label="Person"
            required
            className="field"
          />
          <input
            name="lender"
            placeholder="Via / lender (optional)"
            aria-label="Lender"
            className="field"
          />
          <MoneyInput
            name="installment"
            placeholder="Monthly amount"
            ariaLabel="Monthly installment"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="label mb-1 block">Start month</span>
              <input
                type="month"
                name="start_month"
                defaultValue={currentMonthKey().slice(0, 7)}
                className="field"
              />
            </label>
            <label className="block">
              <span className="label mb-1 block"># months</span>
              <input
                type="number"
                name="months"
                min={1}
                max={60}
                defaultValue={1}
                aria-label="Number of months"
                className="field"
              />
            </label>
          </div>
          <input
            name="note"
            placeholder="Note (optional)"
            aria-label="Note"
            className="field"
          />
          <SubmitButton className="btn btn-primary w-full">Add loan</SubmitButton>
        </form>
      </details>

      {visible.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
          {loans.length === 0
            ? "Nobody owes you anything yet."
            : `No ${tab} loans.`}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => (
            <article
              key={row.loan.id}
              className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-ink-900">
                    {row.loan.person}
                    {row.finished && <span className="badge ml-2">settled</span>}
                  </div>
                  <div className="text-[13px] text-ink-500 tabular-nums">
                    {formatRupiah(row.loan.installment)}/mo
                    {row.loan.lender && ` · via ${row.loan.lender}`}
                  </div>
                  {row.loan.note && (
                    <div className="mt-0.5 truncate text-[13px] text-ink-300">
                      {row.loan.note}
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-display text-[17px] font-bold text-ink-900 tabular-nums">
                    {formatRupiah(row.outstanding)}
                  </div>
                  <div className="text-[11px] text-ink-500">outstanding</div>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream-200">
                <div
                  className="h-full rounded-full bg-forest-800"
                  style={{ width: `${Math.min(100, row.pct)}%` }}
                />
              </div>
              <div className="mt-1 text-[12px] text-ink-500 tabular-nums">
                {Math.round(row.pct)}% collected · {formatRupiah(row.collected)} of{" "}
                {formatRupiah(row.expected)}
              </div>

              <PaymentGrid
                loan={row.loan}
                payments={row.schedule}
                wallets={wallets}
                defaultWalletId={defaultWalletId}
              />

              <form action={deleteLoan.bind(null, row.loan.id)} className="mt-3">
                <SubmitButton className="btn btn-sm btn-ghost text-negative-600">
                  <Trash size={16} />
                  Delete loan
                </SubmitButton>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

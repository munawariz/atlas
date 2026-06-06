import Link from "next/link";
import { getLoanPayments, getLoans, getWallets } from "@/lib/data";
import { formatRupiah, formatRupiahShort, todayISO } from "@/lib/format";
import { addLoan, deleteLoan } from "../actions";
import SubmitButton from "@/components/SubmitButton";
import { TrashIcon } from "@/components/icons";
import PaymentGrid, { type Cell } from "./PaymentGrid";

export const dynamic = "force-dynamic";

type Status = "all" | "unfinished" | "finished";

export default async function LoansPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status: Status = sp.status === "finished" ? "finished" : sp.status === "all" ? "all" : "unfinished";

  const [loans, payments, wallets] = await Promise.all([getLoans(), getLoanPayments(), getWallets()]);

  const forLoan = (loanId: number) =>
    payments.filter((p) => p.loan_id === loanId).sort((a, b) => a.period_month.localeCompare(b.period_month));
  const scheduleOf = (loanId: number): Cell[] =>
    forLoan(loanId).map((p) => ({
      month: p.period_month,
      state: p.paid ? "paid" : "unpaid",
      hasIncome: p.income_txn_id != null,
    }));
  const outstanding = (loanId: number, installment: number) =>
    forLoan(loanId).filter((p) => !p.paid).length * installment;
  const loanStatus = (loanId: number): "finished" | "unfinished" | "empty" => {
    const sched = forLoan(loanId);
    if (sched.length === 0) return "empty";
    return sched.some((p) => !p.paid) ? "unfinished" : "finished";
  };

  const totalOutstanding = loans.reduce((a, l) => a + outstanding(l.id, l.installment), 0);
  const shownLoans = loans.filter((l) => (status === "all" ? true : loanStatus(l.id) === status));

  const tabs: { key: Status; label: string }[] = [
    { key: "unfinished", label: "Unfinished" },
    { key: "finished", label: "Finished" },
    { key: "all", label: "All" },
  ];
  const currentYM = todayISO().slice(0, 7);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Loans</h1>
        <span className="w-12" />
      </div>

      <div className="card p-4">
        <div className="text-sm text-paper-dim">
          {loans.length} people · <span className="font-display text-green">{formatRupiah(totalOutstanding)}</span> to collect
        </div>
        <div className="mt-1 text-xs text-paper-faint">Money you expect to collect from people each month.</div>
      </div>

      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "unfinished" ? "/more/loans" : `/more/loans?status=${t.key}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              status === t.key ? "bg-green text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form action={addLoan} className="card space-y-2 p-4">
        <div className="flex gap-2">
          <input name="person" placeholder="Who owes you" className="field" />
          <input name="lender" placeholder="Via (e.g. Spinjam)" className="field" />
        </div>
        <div className="flex gap-2">
          <input name="installment" inputMode="numeric" placeholder="Monthly Rp" className="field" />
          <input name="note" placeholder="Note" className="field" />
        </div>
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-paper-dim">
            Starts
            <input type="month" name="start_month" defaultValue={currentYM} className="field mt-1 [color-scheme:dark]" />
          </label>
          <label className="flex-1 text-xs text-paper-dim">
            # months
            <input name="months" inputMode="numeric" placeholder="e.g. 6" className="field mt-1" />
          </label>
        </div>
        <SubmitButton pendingText="Adding…" className="w-full rounded-2xl bg-green py-2.5 font-semibold text-ink">
          Add person
        </SubmitButton>
      </form>

      <div className="space-y-3">
        {shownLoans.length === 0 ? (
          <p className="pt-6 text-center text-sm text-paper-faint">No {status === "all" ? "" : status} loans.</p>
        ) : (
          shownLoans.map((l) => {
            const done = loanStatus(l.id) === "finished";
            return (
              <div key={l.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-medium text-paper">{l.person}</span>
                      {done && (
                        <span className="rounded bg-green/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-green">
                          ✓ finished
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-paper-dim">
                      {[l.lender, l.note].filter(Boolean).join(" · ")} · {formatRupiahShort(l.installment)}/mo
                    </div>
                  </div>
                  <form action={deleteLoan.bind(null, l.id)}>
                    <SubmitButton
                      label="Delete"
                      className="ml-3 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-clay active:bg-clay/10"
                    >
                      <TrashIcon className="h-[18px] w-[18px]" />
                    </SubmitButton>
                  </form>
                </div>

                <div className={`mt-2 font-display text-sm ${done ? "text-paper-faint" : "text-green"}`}>
                  {done ? "All collected" : `${formatRupiah(outstanding(l.id, l.installment))} to collect`}
                </div>

                <PaymentGrid
                  loanId={l.id}
                  person={l.person}
                  installment={l.installment}
                  wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
                  schedule={scheduleOf(l.id)}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

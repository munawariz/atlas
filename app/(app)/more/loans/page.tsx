import Link from "next/link";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { ChevronLeft } from "@/components/icons";
import {
  currentMonthKey,
  getLoanCollections,
  getLoanPayments,
  getLoans,
  getWallets,
} from "@/lib/data";
import { formatDateShort, formatRupiah, todayISO } from "@/lib/format";
import AddLoanSheet from "./AddLoanSheet";
import DeadlineEditor from "./DeadlineEditor";
import PaymentGrid from "./PaymentGrid";
import { deleteLoan } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lending · Atlas" };

/*
 * "Open / Settled" rather than "Unfinished / Finished": the card badge on a completed loan
 * already said `settled`, so three words covered two concepts — and both old labels made the
 * reader compute a negation (atlas-ux-plan-manage-pages.md, Lending UX #5).
 *
 * The `?t=` values stay as they were, so an existing bookmark still resolves.
 */
const TABS = [
  { key: "unfinished", label: "Open" },
  { key: "finished", label: "Settled" },
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

  // Deliberately no MonthSwitcher, unlike Installments: a loan shows its whole schedule at
  // once, and a month scope would hide most of it (atlas-ux-plan-manage-pages.md, Lending UX #7).
  const [loans, payments, collections, wallets] = await Promise.all([
    getLoans(),
    getLoanPayments(),
    getLoanCollections(),
    getWallets(),
  ]);

  const byLoan = new Map<number, typeof payments>();
  for (const payment of payments) {
    const list = byLoan.get(payment.loan_id) ?? [];
    list.push(payment);
    byLoan.set(payment.loan_id, list);
  }

  const byPayment = new Map<number, typeof collections>();
  for (const collection of collections) {
    const list = byPayment.get(collection.payment_id) ?? [];
    list.push(collection);
    byPayment.set(collection.payment_id, list);
  }

  const today = todayISO();

  const rows = loans.map((loan) => {
    const schedule = byLoan.get(loan.id) ?? [];
    const received = schedule.flatMap((p) => byPayment.get(p.id) ?? []);

    /*
     * Expected is what the schedule is FOR — every month at its full installment. Deriving it
     * from what has been collected instead is how a Rp 300k collection against a Rp 1m loan
     * used to read as 100% collected: the target shrank to meet the payment.
     */
    const expected = schedule.length * loan.installment;
    const collected = schedule.reduce(
      (sum, p) => sum + (p.amount ?? (p.paid ? loan.installment : 0)),
      0
    );

    /**
     * Finished means every scheduled month is FULLY collected — a partial collection leaves
     * the loan open, which is the whole point of tracking partials separately. `paid` already
     * carries that meaning; the amount is re-checked so a month collected before partials
     * were totalled up is still read the strict way.
     */
    const finished =
      schedule.length > 0 &&
      schedule.every(
        (p) => p.paid && (p.amount ?? loan.installment) >= loan.installment
      );

    /*
     * One slot in the schedule means a one-payment loan — the shape addLoan lays out when
     * `months` is 1, and the shape a loan returns to if its other months are unscheduled.
     * That is the shape `deadline` exists for; a monthly loan is paced by its schedule.
     */
    const once = schedule.length === 1;
    const { deadline } = loan;
    const overdue = deadline !== null && !finished && deadline < today;

    return {
      loan,
      schedule,
      expected,
      collected,
      received,
      // How many ledger rows a delete would take with it — the confirm panel names the number.
      // One per collection, not per month: a month collected in two goes booked two. A
      // database still on the old shape has no collection rows, so months stand in for them.
      collectedCount: Math.max(
        received.length,
        schedule.filter((p) => p.paid).length
      ),
      // Over-collecting a month is money in hand, not a negative debt.
      outstanding: Math.max(0, expected - collected),
      pct: expected > 0 ? (collected / expected) * 100 : 0,
      finished,
      once,
      overdue,
      // The year is only worth the space when it is not this one.
      deadlineLabel:
        deadline === null
          ? null
          : deadline.slice(0, 4) === today.slice(0, 4)
            ? formatDateShort(deadline)
            : `${formatDateShort(deadline)} ${deadline.slice(0, 4)}`,
    };
  });

  const visible = rows.filter((row) =>
    tab === "all" ? true : tab === "finished" ? row.finished : !row.finished
  );

  const openRows = rows.filter((r) => !r.finished);
  const totalOutstanding = openRows.reduce((sum, r) => sum + r.outstanding, 0);

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
          Lending
        </h1>
      </header>

      <section className="rounded-[var(--radius-card)] bg-forest-800 p-5 on-forest">
        <div className="label" style={{ color: "var(--color-forest-300)" }}>
          Still owed to you
        </div>
        <div className="mt-1 font-display text-[32px] font-extrabold tracking-[-0.03em] text-white tabular-nums">
          {formatRupiah(totalOutstanding)}
        </div>
        {/* The hero sums only OPEN loans, while the All tab shows settled ones too — naming the
            scope is what stops the two numbers reading as a contradiction (Lending UX #6). */}
        <p className="mt-1 text-[13px]" style={{ color: "var(--color-forest-200)" }}>
          Money other people owe you, collected month by month
          {openRows.length > 0 && (
            <>
              {" "}
              · across {openRows.length} open{" "}
              {openRows.length === 1 ? "loan" : "loans"}
            </>
          )}
          .
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

      <AddLoanSheet defaultMonth={currentMonthKey().slice(0, 7)} />

      {visible.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
          {loans.length === 0 ? (
            <>
              <p>Nobody owes you anything yet.</p>
              <p className="mt-1 text-[13px]">
                Add a loan to start tracking one.
              </p>
            </>
          ) : tab === "finished" ? (
            <p>Nothing settled yet.</p>
          ) : (
            <p>Nothing open — everything&rsquo;s been collected.</p>
          )}
        </div>
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
                    {formatRupiah(row.loan.installment)}
                    {row.once ? " · one payment" : "/mo"}
                    {row.loan.lender && ` · via ${row.loan.lender}`}
                  </div>
                  {/*
                    A deadline belongs to a one-payment loan only — a monthly one is paced by
                    its schedule. Overdue is the single state worth colouring: it is the
                    reason to look. Unset reads as an invitation rather than a blank.
                  */}
                  {row.once && (
                    <DeadlineEditor
                      loanId={row.loan.id}
                      deadline={row.loan.deadline}
                      label={row.deadlineLabel}
                      overdue={row.overdue}
                    />
                  )}
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
                  {/* "still owed" matches the hero; "outstanding" appeared nowhere else. */}
                  <div className="text-[11px] text-ink-500">still owed</div>
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
                collections={row.received}
                wallets={wallets}
                defaultWalletId={defaultWalletId}
              />

              {/*
                Deleting a loan also deletes every income row it ever booked — a fully collected
                24-month loan is 24 ledger rows gone. It was a bare submit button sitting directly
                under a schedule strip you were just tapping (atlas-ux-plan-manage-pages.md C6).
              */}
              <div className="mt-3">
                <ConfirmDeleteButton
                  action={deleteLoan.bind(null, row.loan.id)}
                  triggerLabel="Delete loan"
                  variant="block"
                  className="btn btn-sm btn-ghost text-negative-600"
                  message={
                    <>
                      Delete this loan?{" "}
                      {row.collectedCount > 0 ? (
                        <>
                          The <strong>{row.collectedCount}</strong>{" "}
                          {row.collectedCount === 1
                            ? "collection"
                            : "collections"}{" "}
                          recorded against it{" "}
                          {row.collectedCount === 1 ? "is" : "are"} deleted from
                          your history too.
                        </>
                      ) : (
                        "Nothing has been collected against it yet."
                      )}{" "}
                      This can&rsquo;t be undone.
                    </>
                  }
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

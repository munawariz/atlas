import Link from "next/link";
import type { ReactNode } from "react";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import RefreshOnFocus from "@/components/RefreshOnFocus";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import {
  daysBetween,
  getCardBook,
  getCreditCards,
  type BillStatus,
  type CardBill,
  type CardBook,
} from "@/lib/creditCards";
import { itemActiveIn } from "@/lib/autoBudget";
import {
  getCategories,
  getPaylaterItems,
  getPaylaterPayments,
  getPaylaterProviders,
  getWallets,
  monthKeyOf,
} from "@/lib/data";
import { getSettings, mappedCategoryId } from "@/lib/settings";
import { formatDateShort, formatRupiah, todayISO } from "@/lib/format";
import type { Category, CreditCard, Wallet } from "@/lib/types";
import {
  AddCardSheet,
  ChargeCardSheet,
  EditCardForm,
  PayCardSheet,
  type PayPreset,
} from "./CardForms";
import { removeCreditCard } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Credit cards · Atlas" };

const STATUS: Record<BillStatus, { label: string; className: string }> = {
  clear: { label: "Nothing due", className: "bg-cream-200 text-ink-700" },
  full: { label: "Paid in full", className: "bg-positive-100 text-positive-600" },
  minimum: { label: "Minimum paid", className: "bg-warning-100 text-warning-600" },
  due: { label: "To pay", className: "bg-cream-200 text-ink-700" },
  missed: { label: "Minimum missed", className: "bg-negative-100 text-negative-600" },
};

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** "in 5 days" · "today" · "3 days ago" */
function relative(today: string, iso: string): string {
  const days = daysBetween(today, iso);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** Months as "8 months" or "2 years 3 months". */
function duration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "";
  const m = rest > 0 ? `${rest} month${rest === 1 ? "" : "s"}` : "";
  return [y, m].filter(Boolean).join(" ");
}

export default async function CreditCardsPage() {
  const today = todayISO();
  const [cards, wallets, providers, settings, categories, installments, installmentPayments] =
    await Promise.all([
      getCreditCards(),
      getWallets(true),
      getPaylaterProviders(),
      getSettings(),
      getCategories(true),
      getPaylaterItems(),
      getPaylaterPayments(),
    ]);

  const walletById = new Map(wallets.map((w) => [w.id, w]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const cardWalletIds = new Set(cards.map((c) => c.wallet_id));
  const chargeCats = {
    interest: mappedCategoryId(settings, categories, "cat_card_interest"),
    fee: mappedCategoryId(settings, categories, "cat_card_fee"),
  };

  // An archived wallet retires its card with it.
  const active = cards.filter((c) => walletById.get(c.wallet_id)?.archived === false);
  const books = await Promise.all(active.map((card) => getCardBook(card, today, chargeCats)));

  const cashWallets = wallets
    .filter((w) => !w.archived && !cardWalletIds.has(w.id))
    .map((w) => ({ id: w.id, name: w.name }));
  const providerOptions = providers.map((p) => ({ id: p.id, name: p.name }));

  /** Installments billed on a card this bill's month — shown, never paid, here. */
  function billInstallments(card: CreditCard, bill: CardBill | null) {
    if (card.provider_id == null || !bill) return null;
    const month = monthKeyOf(bill.due);
    const items = installments.filter(
      (i) => i.provider_id === card.provider_id && itemActiveIn(i, month)
    );
    if (items.length === 0) return null;
    const paid = items.filter((i) =>
      installmentPayments.some((p) => p.item_id === i.id && p.month === month)
    ).length;
    return {
      total: items.reduce((sum, i) => sum + i.monthly_amount, 0),
      count: items.length,
      paid,
    };
  }

  return (
    <div className="space-y-5 privacy-scope">
      <RefreshOnFocus />

      <header className="flex items-center gap-1">
        <Link
          href="/more"
          aria-label="Back to more"
          className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 no-underline"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-ink-900">
          Credit cards
        </h1>
      </header>

      {books.length === 0 ? (
        <section className="space-y-3 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-xs)]">
          <p className="text-[14px] text-ink-700">
            A card is a wallet you owe on. Log a purchase from it like any other expense —
            it counts as spending <strong>the day you swipe</strong>, and the card&apos;s
            balance goes negative by what you owe. Paying the bill moves money from a cash
            wallet into the card.
          </p>
          <p className="text-[14px] text-ink-700">
            Installments stay on My Installment, exactly as they are.
          </p>
          <AddCardSheet wallets={cashWallets} providers={providerOptions} />
        </section>
      ) : (
        books.map((book) => (
          <CardSection
            key={book.card.id}
            book={book}
            wallet={walletById.get(book.card.wallet_id) as Wallet}
            today={today}
            cashWallets={cashWallets}
            providers={providerOptions}
            catById={catById}
            walletById={walletById}
            installments={billInstallments(book.card, book.bill)}
          />
        ))
      )}

      {books.length > 0 && <AddCardSheet wallets={cashWallets} providers={providerOptions} />}

      <HowItWorks />
    </div>
  );
}

function CardSection({
  book,
  wallet,
  today,
  cashWallets,
  providers,
  catById,
  walletById,
  installments,
}: {
  book: CardBook;
  wallet: Wallet;
  today: string;
  cashWallets: { id: number; name: string }[];
  providers: { id: number; name: string }[];
  catById: Map<number, Category>;
  walletById: Map<number, Wallet>;
  installments: { total: number; count: number; paid: number } | null;
}) {
  const { card, bill } = book;
  const left = bill ? Math.max(0, bill.balance - bill.paid) : 0;
  const minimumLeft = bill ? Math.max(0, bill.minimum - bill.paidByDue) : 0;
  const beforeDue = bill ? today <= bill.due : false;
  const usedPct =
    card.credit_limit > 0
      ? Math.min(100, Math.max(0, (book.owedNow / card.credit_limit) * 100))
      : 0;

  const presets: PayPreset[] = [];
  if (bill && left > 0 && minimumLeft > 0 && minimumLeft < left) {
    presets.push({ label: "Minimum", amount: minimumLeft });
  }
  if (left > 0) presets.push({ label: "Full bill", amount: left });
  if (book.owedNow > left) presets.push({ label: "Everything", amount: book.owedNow });

  // What the app estimated onto the bill and the user should replace with the bank's figure.
  // A refundable admin fee only becomes a cost once the bill missed being paid in full on time.
  const adminSticks = bill ? today > bill.due && bill.status !== "full" : false;
  const suggestedInterest = bill?.interestEstimated ? bill.interest : 0;
  const suggestedFee = bill?.feesEstimated
    ? bill.fees - (adminSticks ? 0 : bill.adminFee)
    : 0;
  const adminPending =
    bill && bill.feesEstimated && bill.adminFee > 0 && !adminSticks ? bill.adminFee : 0;

  return (
    <section className="space-y-3">
      {/* --- What is owed ------------------------------------------------------ */}
      <div className="rounded-[var(--radius-card)] bg-forest-800 p-5 on-forest">
        <div className="label" style={{ color: "var(--color-forest-300)" }}>
          {wallet.name} · owed now
        </div>
        <div className="font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] text-white tabular-nums">
          {formatRupiah(Math.max(0, book.owedNow))}
        </div>
        {book.owedNow < 0 && (
          <div className="mt-1 text-[13px] tabular-nums" style={{ color: "var(--color-forest-200)" }}>
            {formatRupiah(-book.owedNow)} in credit on the card
          </div>
        )}

        {book.available !== null && (
          <>
            <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: "rgb(255 255 255 / 0.12)" }}>
              <div className="h-full rounded-full bg-lime-500" style={{ width: `${usedPct}%` }} />
            </div>
            <div className="mt-1.5 text-[13px] tabular-nums" style={{ color: "var(--color-forest-200)" }}>
              {formatRupiah(book.available)} available of {formatRupiah(card.credit_limit)}
            </div>
          </>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: "Last bill", value: bill ? formatRupiah(bill.balance) : "—" },
            { label: "Since the bill", value: formatRupiah(book.unbilled) },
          ].map((cell) => (
            <div key={cell.label} className="rounded-[14px] p-3" style={{ background: "rgb(255 255 255 / 0.08)" }}>
              <div className="label" style={{ color: "var(--color-forest-300)" }}>
                {cell.label}
              </div>
              <div className="font-display text-[16px] font-bold text-white tabular-nums">
                {cell.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- The bill ---------------------------------------------------------- */}
      <div className="space-y-3 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
        {bill ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-bold text-ink-900">
                Bill of {formatDateShort(bill.closing)}
              </h2>
              <span className={`badge ${STATUS[bill.status].className}`}>
                {STATUS[bill.status].label}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
              {[
                ["Bill", formatRupiah(bill.balance)],
                ["Minimum", formatRupiah(bill.minimum)],
                ["Paid", formatRupiah(bill.paid)],
                ["Left to clear", formatRupiah(left)],
                ...(bill.interest > 0
                  ? [[bill.interestEstimated ? "Interest (est.)" : "Interest", formatRupiah(bill.interest)]]
                  : []),
                ...(bill.fees > 0
                  ? [[
                      bill.feesEstimated
                        ? bill.adminFee > 0 && bill.fees === bill.adminFee
                          ? "Admin fee (est.)"
                          : "Fees (est.)"
                        : "Fees",
                      formatRupiah(bill.fees),
                    ]]
                  : []),
                ...(bill.pastDue > 0 ? [["Past due", formatRupiah(bill.pastDue)]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-ink-500">{label}</dt>
                  <dd className="font-semibold text-ink-900 tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>

            {bill.balance > 0 && (
              <p className="text-[13px] text-ink-700">
                Due <strong>{formatDateShort(bill.due)}</strong> · {relative(today, bill.due)}
              </p>
            )}

            {installments && (
              <p className="text-[13px] text-ink-500 tabular-nums">
                The bank adds {formatRupiah(installments.total)} of installments to this bill,
                in full and on top of the minimum. You pay those on{" "}
                <Link href="/more/paylater" className="font-semibold text-forest-800">
                  My Installment
                </Link>{" "}
                — {installments.paid} of {installments.count} marked paid.
              </p>
            )}

            <BillAdvice book={book} left={left} minimumLeft={minimumLeft} beforeDue={beforeDue} />
          </>
        ) : (
          <p className="text-[14px] text-ink-700">
            No bill yet. The first one prints on{" "}
            <strong>{formatDateShort(book.nextClosing)}</strong>.
          </p>
        )}

        {adminPending > 0 && bill && (
          <p className="text-[13px] text-ink-500 tabular-nums">
            Includes a {formatRupiah(adminPending)} admin fee — refunded the day after you pay
            the whole bill by {formatDateShort(bill.due)}.
          </p>
        )}

        {(suggestedInterest > 0 || suggestedFee > 0) && bill && (
          <p className="rounded-[var(--radius-input)] bg-warning-100 px-3 py-2 text-[13px] text-ink-700 tabular-nums">
            The {formatDateShort(bill.closing)} bill should carry about{" "}
            {[
              suggestedInterest > 0 && `${formatRupiah(suggestedInterest)} of interest`,
              suggestedFee > 0 && `${formatRupiah(suggestedFee)} in fees`,
            ]
              .filter(Boolean)
              .join(" and ")}
            , counted in above as an estimate. Record the bank&apos;s figures from the statement
            so what you owe here matches.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <PayCardSheet cardId={card.id} wallets={cashWallets} presets={presets} />
          <ChargeCardSheet
            cardId={card.id}
            defaultDate={bill?.closing ?? today}
            suggestedInterest={suggestedInterest}
            suggestedFee={suggestedFee}
          />
        </div>
      </div>

      {/* --- Past bills -------------------------------------------------------- */}
      {book.history.length > 0 && (
        <details className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
          <summary className="flex items-center gap-3 px-4 py-3">
            <span className="flex-1 text-[15px] font-semibold text-ink-900">Past bills</span>
            <span className="chevron shrink-0 text-ink-300">
              <ChevronRight size={18} />
            </span>
          </summary>
          <div className="border-t border-[var(--border-subtle)]">
            {book.history.map((h, i) => (
              <div
                key={h.closing}
                className={`flex items-center gap-2 px-4 py-2.5 ${i > 0 ? "border-t border-[var(--border-subtle)]" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink-900">
                    {formatDateShort(h.closing)}
                    {h.closing.slice(0, 4) !== today.slice(0, 4) && ` ${h.closing.slice(0, 4)}`}
                  </span>
                  <span className="block text-[12px] text-ink-500 tabular-nums">
                    paid {formatRupiah(h.paid)} · min {formatRupiah(h.minimum)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[14px] font-semibold text-ink-900 tabular-nums">
                    {formatRupiah(h.balance)}
                  </span>
                  <span className={`badge ${STATUS[h.status].className}`}>
                    {h.status === "due" ? "Unpaid" : STATUS[h.status].label}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* --- Activity ---------------------------------------------------------- */}
      {book.recent.length > 0 && (
        <details className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
          <summary className="flex items-center gap-3 px-4 py-3">
            <span className="flex-1 text-[15px] font-semibold text-ink-900">Recent activity</span>
            <span className="chevron shrink-0 text-ink-300">
              <ChevronRight size={18} />
            </span>
          </summary>
          <div className="border-t border-[var(--border-subtle)]">
            {book.recent.map((txn, i) => {
              const paysDown = txn.dest_wallet_id === card.wallet_id;
              const category = txn.category_id != null ? catById.get(txn.category_id)?.name : null;
              const from =
                txn.type === "transfer" && paysDown && txn.source_wallet_id != null
                  ? walletById.get(txn.source_wallet_id)?.name
                  : null;
              return (
                <Link
                  key={txn.id}
                  href={`/history/${txn.id}`}
                  className={`flex items-center gap-2 px-4 py-2.5 no-underline ${i > 0 ? "border-t border-[var(--border-subtle)]" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink-900">
                      {txn.description || category || (paysDown ? "Payment" : "Charge")}
                    </span>
                    <span className="block text-[12px] text-ink-500">
                      {formatDateShort(txn.occurred_on)}
                      {category && txn.description ? ` · ${category}` : ""}
                      {from ? ` · from ${from}` : ""}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[14px] font-semibold tabular-nums ${paysDown ? "text-positive-600" : "text-ink-900"}`}
                  >
                    {paysDown ? "−" : ""}
                    {formatRupiah(txn.amount)}
                  </span>
                </Link>
              );
            })}
          </div>
        </details>
      )}

      {/* --- Terms ------------------------------------------------------------- */}
      <details className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
        <summary className="flex items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink-900">Card terms</span>
            <span className="block text-[13px] text-ink-500 tabular-nums">
              Statement {ordinal(card.statement_day)} · due {ordinal(card.due_day)} ·{" "}
              {card.interest_rate}%/mo · min {card.min_pct}%
              {card.admin_fee_pct > 0 && <> · admin {card.admin_fee_pct}%</>}
            </span>
          </span>
          <span className="chevron shrink-0 text-ink-300">
            <ChevronRight size={18} />
          </span>
        </summary>
        <div className="space-y-3 border-t border-[var(--border-subtle)] p-4">
          <EditCardForm card={card} providers={providers} />
          <p className="text-[13px] text-ink-500">
            Rename or archive the card on{" "}
            <Link href="/more/wallets" className="font-semibold text-forest-800">
              Wallets
            </Link>
            .
          </p>
          <ConfirmDeleteButton
            action={removeCreditCard.bind(null, card.id)}
            message={`Stop treating ${wallet.name} as a credit card? Only its terms and bills go — the wallet and every purchase and payment on it stay.`}
            variant="block"
            triggerLabel={`Stop tracking ${wallet.name} as a card`}
            className="btn btn-ghost w-full text-[13px] text-negative-600"
          />
        </div>
      </details>
    </section>
  );
}

/** What this bill costs if it isn't cleared, in the words of the situation it is in. */
function BillAdvice({
  book,
  left,
  minimumLeft,
  beforeDue,
}: {
  book: CardBook;
  left: number;
  minimumLeft: number;
  beforeDue: boolean;
}) {
  const bill = book.bill;
  if (!bill || bill.status === "clear" || bill.status === "full" || left <= 0) return null;

  const card = book.card;
  const due = formatDateShort(bill.due);
  const next = formatDateShort(book.nextClosing);
  const interest = formatRupiah(book.interestNext);
  // A refundable admin fee is the other half of what not paying in full costs.
  const admin = bill.adminFee > 0 ? formatRupiah(bill.adminFee) : null;

  let lead: ReactNode;
  if (bill.status === "due" || (bill.status === "minimum" && beforeDue)) {
    lead = (
      <>
        {bill.status === "minimum" ? "The minimum is in. " : ""}
        Pay {bill.status === "minimum" ? "the other" : "the full"} {formatRupiah(left)} by{" "}
        {due} and there&apos;s no interest{admin && <>, and the {admin} admin fee comes back</>}.{" "}
        {bill.status === "due" ? (
          <>Pay only the minimum ({formatRupiah(minimumLeft)}) and</>
        ) : (
          <>Leave it and</>
        )}{" "}
        the {next} bill adds about <strong>{interest}</strong> in interest
        {admin && <> — and the admin fee stays</>}.
      </>
    );
  } else if (bill.status === "minimum") {
    lead = (
      <>
        Not paid in full by {due}, so interest runs from each purchase date: the {next} bill
        adds about <strong>{interest}</strong>
        {admin && <>, and the {admin} admin fee is no longer refunded</>}. Paying the rest
        sooner stops it growing.
      </>
    );
  } else {
    lead = (
      <>
        The minimum wasn&apos;t paid by {due}. The {next} bill adds about{" "}
        <strong>{interest}</strong> in interest
        {card.late_fee ? (
          <>
            {" "}
            and a late fee of up to <strong>{formatRupiah(book.lateFee)}</strong>
          </>
        ) : (
          <> (this card charges no late fee)</>
        )}
        , and the unpaid {formatRupiah(minimumLeft)} is added to its minimum.
      </>
    );
  }

  const charges = card.admin_fee_pct > 0 ? "interest and admin fees" : "interest";

  return (
    <div className="space-y-1.5 rounded-[var(--radius-input)] bg-cream-100 px-3 py-2.5 text-[13px] text-ink-700 tabular-nums">
      <p>{lead}</p>
      <p className="text-ink-500">
        {book.payoff
          ? `Paying only the minimum from here, with no new spending, clears it in about ${duration(book.payoff.months)} and costs about ${formatRupiah(book.payoff.cost)} in ${charges}.`
          : `At these terms, paying only the minimum never realistically clears it: each month's ${charges} eat all or nearly all of the minimum, so the balance barely goes down.`}
      </p>
    </div>
  );
}

function HowItWorks() {
  return (
    <details className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
      <summary className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 text-[15px] font-semibold text-ink-900">
          How the minimum payment works
        </span>
        <span className="chevron shrink-0 text-ink-300">
          <ChevronRight size={18} />
        </span>
      </summary>
      <div className="space-y-2 border-t border-[var(--border-subtle)] p-4 text-[13px] text-ink-700">
        <p>
          <strong>The bill</strong> is what you owed on the statement date. Pay all of it by
          the due date and there is no interest at all.
        </p>
        <p>
          <strong>The minimum</strong> is a percent of the bill (5% under Bank
          Indonesia&apos;s current rules), but never less than a floor (usually Rp 50,000) —
          a smaller bill is due in full. Paying it keeps the card in good standing. It does
          not stop interest.
        </p>
        <p>
          <strong>Interest</strong> starts the moment you pay less than the full bill. It is
          charged daily at the monthly rate × 12 ÷ 365 (1.75% a month is about 0.0575% a day),
          on every purchase from the day it posted, and then on whatever is still owed after
          each payment, through the next statement date. So paying 95% of a bill saves
          surprisingly little over paying 5%: the days before your payment are charged on the
          full amount either way.
        </p>
        <p>
          <strong>Missing the minimum</strong> adds a late fee of 1% of the bill, at most
          Rp 100,000, at most banks — and the unpaid minimum is added to the next one.
        </p>
        <p>
          <strong>Honest works differently in three ways.</strong> Every statement carries an
          admin fee (0–6.49% a month of what you spent, set per customer), refunded the day
          after you pay that bill in full on time. The minimum is whichever is highest of 5%
          of the bill, the bill&apos;s interest plus admin fee, or Rp 20,000. And there is no
          late fee. Together, not paying in full costs 1.75% interest <em>plus</em> the admin
          fee each month. With an admin fee above about 3.5%, the minimum only covers those
          charges and never pays the balance down; at 3% it still takes decades.
        </p>
        <p>
          <strong>Installments</strong> on the card are billed in full every month on top of
          the minimum. Keep paying them on My Installment.
        </p>
      </div>
    </details>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategories,
  getTransaction,
  getWallets,
  monthKeyOf,
} from "@/lib/data";
import { getForexAccounts, getForexTxnByTxnId } from "@/lib/forex";
import { ChevronLeft } from "@/components/icons";
import EditForm from "./EditForm";
import ForexEditForm from "./ForexEditForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit · Atlas" };

export default async function EditTransactionPage({
  params,
}: {
  // Next 16: params is a Promise and must be awaited.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const txnId = parseInt(id, 10);
  if (!Number.isFinite(txnId)) notFound();

  const transaction = await getTransaction(txnId);
  if (!transaction) notFound();

  // A row booked by the forex module is one of two or three the conversion produced, so it
  // gets the conversion editor rather than the plain transaction editor.
  const [wallets, categories, forexTxn] = await Promise.all([
    getWallets(true),
    getCategories(true),
    getForexTxnByTxnId(txnId),
  ]);

  const forexAccounts = forexTxn ? await getForexAccounts() : [];
  const monthKey = monthKeyOf(transaction.occurred_on);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-1">
        <Link
          href={`/history?m=${monthKey}`}
          aria-label="Back to history"
          className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 no-underline"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-ink-900">
          {forexTxn ? "Edit conversion" : "Edit transaction"}
        </h1>
      </header>

      {forexTxn ? (
        <ForexEditForm
          forexTxn={forexTxn}
          accounts={forexAccounts}
          wallets={wallets}
        />
      ) : (
        <EditForm
          transaction={transaction}
          wallets={wallets}
          categories={categories}
          monthKey={monthKey}
        />
      )}
    </div>
  );
}

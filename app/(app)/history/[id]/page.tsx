import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategories, getTransaction, getWallets } from "@/lib/data";
import EditForm from "./EditForm";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const txnId = parseInt(id, 10);
  const [txn, wallets, categories] = await Promise.all([
    getTransaction(txnId),
    getWallets(true),
    getCategories(true),
  ]);
  if (!txn) notFound();

  return (
    <div className="pt-3">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/history" className="text-sm text-paper-dim active:text-paper">
          ‹ Back
        </Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Edit entry</h1>
        <span className="w-10" />
      </div>
      <EditForm txn={txn} wallets={wallets} categories={categories} />
    </div>
  );
}

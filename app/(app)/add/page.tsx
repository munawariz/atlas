import { getCategories, getWallets } from "@/lib/data";
import AddForm from "./AddForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Add · Atlas" };

export default async function AddPage() {
  const [wallets, categories] = await Promise.all([
    getWallets(),
    getCategories(),
  ]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink-900">
          Add a transaction
        </h1>
        <p className="mt-1 text-[14px] text-ink-500">
          Every movement of your money, in one place.
        </p>
      </header>

      <AddForm wallets={wallets} categories={categories} />
    </div>
  );
}

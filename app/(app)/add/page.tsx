import { getCategories, getWallets } from "@/lib/data";
import { todayISO } from "@/lib/format";
import AddForm from "./AddForm";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const [wallets, categories] = await Promise.all([getWallets(), getCategories()]);
  return <AddForm wallets={wallets} categories={categories} initialToday={todayISO()} />;
}

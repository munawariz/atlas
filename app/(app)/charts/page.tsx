import Link from "next/link";
import { getCategories, getChartData } from "@/lib/data";
import ChartsClient from "./ChartsClient";

export const dynamic = "force-dynamic";

export default async function ChartsPage() {
  const [data, cats] = await Promise.all([getChartData(), getCategories(true)]);
  const categories = cats.map((c) => ({ id: c.id, name: c.name, kind: c.kind }));

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Charts</h1>
        <span className="w-12" />
      </div>

      {data.flows.length === 0 ? (
        <p className="pt-10 text-center text-sm text-paper-faint">No data to chart yet.</p>
      ) : (
        <ChartsClient data={data} categories={categories} />
      )}
    </div>
  );
}

import { getCategories, getChartData } from "@/lib/data";
import ChartsClient from "./ChartsClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Charts · Atlas" };

export default async function ChartsPage() {
  // One pass over the whole ledger, on the server. Everything the client needs ships with it,
  // so changing the range never costs a round trip.
  const [data, categories] = await Promise.all([
    getChartData(),
    getCategories(true),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink-900">
          Charts
        </h1>
      </header>

      <ChartsClient data={data} categories={categories} />
    </div>
  );
}

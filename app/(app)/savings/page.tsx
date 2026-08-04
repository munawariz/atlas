import PrivacyToggle from "@/components/PrivacyToggle";
import { getSavingsBuckets } from "@/lib/data";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Savings · Atlas" };

export default async function SavingsPage() {
  const buckets = (await getSavingsBuckets()).filter(
    (b) => b.contributed > 0 || b.withdrawn > 0
  );

  const saved = buckets
    .filter((b) => b.kind === "saving")
    .reduce((sum, b) => sum + b.balance, 0);
  const invested = buckets
    .filter((b) => b.kind === "investment")
    .reduce((sum, b) => sum + b.balance, 0);
  const total = saved + invested;

  const largest = buckets.reduce((max, b) => Math.max(max, b.balance), 0);

  const sorted = [...buckets].sort((a, b) => b.balance - a.balance);

  return (
    <div className="space-y-5 privacy-scope">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink-900">
            Savings
          </h1>
          <p className="mt-1 text-[14px] text-ink-500">
            Money you have set aside. It is held outside your wallet net worth —
            moving money into a bucket takes it out of net worth, and withdrawing
            puts it back.
          </p>
        </div>
        <PrivacyToggle className="text-forest-800 hover:bg-forest-50" />
      </header>

      <section className="rounded-[var(--radius-card)] bg-forest-800 p-5 on-forest">
        <div className="label" style={{ color: "var(--color-forest-300)" }}>
          Set aside · all time
        </div>
        <div className="mt-1 font-display text-[36px] font-extrabold leading-none tracking-[-0.03em] text-white tabular-nums">
          {formatRupiah(total)}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { label: "Saved", value: saved },
            { label: "Invested", value: invested },
          ].map((cell) => (
            <div
              key={cell.label}
              className="rounded-[16px] p-3"
              style={{ background: "rgb(255 255 255 / 0.08)" }}
            >
              <div className="label" style={{ color: "var(--color-forest-300)" }}>
                {cell.label}
              </div>
              <div className="mt-0.5 font-display text-[18px] font-bold text-white tabular-nums">
                {formatRupiah(cell.value)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {sorted.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
          Nothing set aside yet. Add a <strong>Saving</strong> or{" "}
          <strong>Invest</strong> transaction to start a bucket.
        </p>
      ) : (
        <section className="space-y-3">
          <h2 className="label">Buckets</h2>
          {sorted.map((bucket) => (
            <article
              key={bucket.category_id}
              className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[15px] font-semibold text-ink-900">
                  {bucket.name}
                </span>
                <span className="shrink-0 font-display text-[17px] font-bold text-ink-900 tabular-nums">
                  {formatRupiah(bucket.balance)}
                </span>
              </div>

              {/* Bar is relative to the largest bucket, so the set reads comparatively. */}
              <div
                className="mt-2.5 h-2 overflow-hidden rounded-full bg-cream-200"
                role="presentation"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${largest > 0 ? Math.max(0, (bucket.balance / largest) * 100) : 0}%`,
                    background:
                      bucket.kind === "saving"
                        ? "var(--color-info-500)"
                        : "var(--color-forest-800)",
                  }}
                />
              </div>

              <div className="mt-2.5 flex gap-4 text-[13px] text-ink-500">
                <span className="tabular-nums">
                  in {formatRupiah(bucket.contributed)}
                </span>
                <span className="tabular-nums">
                  out {formatRupiah(bucket.withdrawn)}
                </span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

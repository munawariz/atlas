import Link from "next/link";
import { getSavingsBuckets, type SavingsBucket } from "@/lib/data";
import { formatRupiah, formatRupiahShort } from "@/lib/format";

export const dynamic = "force-dynamic";

function Bar({ pct, kind }: { pct: number; kind: "saving" | "investment" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/40">
      <div
        className={`h-full rounded-full ${kind === "saving" ? "bg-sky/85" : "bg-plum/85"}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function BucketCard({ b, max }: { b: SavingsBucket; max: number }) {
  const color = b.kind === "saving" ? "text-sky" : "text-plum";
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-paper">{b.name}</span>
        <span className={`font-display text-base font-bold tabular-nums ${color}`}>{formatRupiah(b.balance)}</span>
      </div>
      <div className="mt-2">
        <Bar pct={(Math.abs(b.balance) / max) * 100} kind={b.kind} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-paper-faint">
        <span>in <span className="text-paper-dim">{formatRupiahShort(b.contributed)}</span></span>
        {b.withdrawn > 0 && (
          <span>out <span className="text-amber">{formatRupiahShort(b.withdrawn)}</span></span>
        )}
      </div>
    </div>
  );
}

export default async function SavingsPage() {
  const all = await getSavingsBuckets();
  const buckets = all.filter((b) => b.contributed > 0 || b.withdrawn > 0);
  const saving = buckets.filter((b) => b.kind === "saving").sort((a, b) => b.balance - a.balance);
  const investment = buckets.filter((b) => b.kind === "investment").sort((a, b) => b.balance - a.balance);
  const savingTotal = saving.reduce((s, b) => s + b.balance, 0);
  const investTotal = investment.reduce((s, b) => s + b.balance, 0);
  const total = savingTotal + investTotal;
  const max = Math.max(1, ...buckets.map((b) => Math.abs(b.balance)));

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Savings</h1>
        <span className="w-12" />
      </div>

      {buckets.length === 0 ? (
        <p className="pt-10 text-center text-sm text-paper-faint">
          Nothing set aside yet. Log a Saving or Invest entry to start a bucket.
        </p>
      ) : (
        <>
          {/* Hero */}
          <div className="card relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(88,166,255,0.16),transparent_70%)]" />
            <div className="label">Set aside · all time</div>
            <div className="mt-1.5 font-display text-3xl font-semibold tabular-nums text-paper">{formatRupiah(total)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div>
                <div className="label">Saved</div>
                <div className="mt-0.5 font-display text-base font-bold tabular-nums text-sky">{formatRupiah(savingTotal)}</div>
              </div>
              <div>
                <div className="label">Invested</div>
                <div className="mt-0.5 font-display text-base font-bold tabular-nums text-plum">{formatRupiah(investTotal)}</div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-paper-faint">
              Held outside wallet net worth. Balance = everything saved/invested minus withdrawals.
            </p>
          </div>

          {saving.length > 0 && (
            <section className="space-y-2">
              <h2 className="label text-sky">Savings</h2>
              {saving.map((b) => (
                <BucketCard key={b.categoryId} b={b} max={max} />
              ))}
            </section>
          )}

          {investment.length > 0 && (
            <section className="space-y-2">
              <h2 className="label text-plum">Investments</h2>
              {investment.map((b) => (
                <BucketCard key={b.categoryId} b={b} max={max} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { getWallets } from "@/lib/data";
import { getBondPortfolio, getBondTrades } from "@/lib/bonds";
import { getSettings, mappedWalletId } from "@/lib/settings";
import { formatRupiah, formatRupiahShort, formatDateShort } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import { TrashIcon } from "@/components/icons";
import BondTradeForm from "./BondTradeForm";
import { deleteBondTrade } from "./actions";

export const dynamic = "force-dynamic";

const SIDE = {
  buy: { label: "Buy", color: "text-plum" },
  sell: { label: "Sell", color: "text-sky" },
  coupon: { label: "Coupon", color: "text-green" },
} as const;

const fmtUnits = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);

export default async function BondsPage() {
  const [{ holdings, totalInvested, totalCoupons }, wallets, trades, settings] = await Promise.all([
    getBondPortfolio(),
    getWallets(),
    getBondTrades(),
    getSettings(),
  ]);
  const walletOpts = wallets.map((w) => ({ id: w.id, name: w.name }));
  const defaultWalletId = mappedWalletId(settings, walletOpts, "wallet_bond", "");

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Bonds</h1>
        <span className="w-12" />
      </div>

      {/* Hero */}
      <div className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(163,113,247,0.18),transparent_70%)]" />
        <div className="label">Principal held</div>
        <div className="mt-1.5 font-display text-3xl font-semibold tabular-nums text-paper">{formatRupiah(totalInvested)}</div>
        <div className="mt-2 text-sm">
          <span className="text-paper-faint">coupons earned </span>
          <span className="font-display font-medium text-green">{formatRupiah(totalCoupons)}</span>
        </div>
      </div>

      <BondTradeForm wallets={walletOpts} defaultWalletId={defaultWalletId} />

      {/* Holdings */}
      {holdings.length === 0 ? (
        <p className="pt-4 text-center text-sm text-paper-faint">No bonds yet. Log a buy above.</p>
      ) : (
        <section className="space-y-2">
          <h2 className="label text-plum">Holdings</h2>
          {holdings.map((h) => (
            <div key={h.name} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-display text-base font-semibold text-paper">{h.name}</span>
                  {h.units > 0 && <span className="ml-2 text-xs text-paper-dim">{fmtUnits(h.units)} unit</span>}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-sm font-bold tabular-nums text-paper">{formatRupiah(h.invested)}</div>
                  {h.coupons > 0 && (
                    <div className="text-xs text-green">+{formatRupiahShort(h.coupons)} coupons</div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <p className="px-1 text-[11px] text-paper-faint">
            Principal = bought − sold. Coupons are booked as Kupon income and don&apos;t change principal.
          </p>
        </section>
      )}

      {/* Trades */}
      {trades.length > 0 && (
        <section className="space-y-2">
          <h2 className="label">Activity</h2>
          <div className="card overflow-hidden">
            {trades.slice(0, 40).map((t, i) => (
              <div key={t.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? "hr-dash border-t" : ""}`}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-paper">
                    <span className={SIDE[t.side].color}>{SIDE[t.side].label}</span> {t.name}
                  </div>
                  <div className="text-xs text-paper-faint">
                    {formatDateShort(t.occurred_on)} · {formatRupiah(t.idr)}
                    {t.side !== "coupon" && t.units > 0 && ` · ${fmtUnits(t.units)} unit`}
                  </div>
                </div>
                <form action={deleteBondTrade.bind(null, t.id)}>
                  <SubmitButton label="Delete" className="grid h-8 w-8 place-items-center rounded-lg text-clay active:bg-clay/10">
                    <TrashIcon className="h-[18px] w-[18px]" />
                  </SubmitButton>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

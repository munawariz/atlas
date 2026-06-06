import "server-only";
import { supabaseServer } from "./supabaseServer";

export interface BondTrade {
  id: number;
  name: string;
  side: "buy" | "sell" | "coupon";
  units: number;
  idr: number;
  occurred_on: string;
  wallet_id: number | null;
  txn_id: number | null;
}

export async function getBondTrades(): Promise<BondTrade[]> {
  const { data, error } = await supabaseServer()
    .from("bond_trades")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false });
  if (error && error.code !== "42P01") throw error; // tolerate table not migrated yet
  return (data ?? []).map((r) => ({ ...(r as BondTrade), units: Number((r as BondTrade).units) }));
}

export interface BondHolding {
  name: string;
  units: number; // bought − sold (units still held)
  invested: number; // Σbuy − Σsell (principal still held)
  coupons: number; // Σcoupon (interest received, all time)
}

export interface BondPortfolio {
  holdings: BondHolding[];
  totalInvested: number;
  totalCoupons: number;
}

/** Per-bond principal held + coupons received, from the trade log. */
export async function getBondPortfolio(): Promise<BondPortfolio> {
  const trades = await getBondTrades();
  const agg = new Map<string, { buy: number; sell: number; coupon: number; buyU: number; sellU: number }>();
  for (const t of trades) {
    const a = agg.get(t.name) ?? { buy: 0, sell: 0, coupon: 0, buyU: 0, sellU: 0 };
    a[t.side] += t.idr;
    if (t.side === "buy") a.buyU += t.units;
    else if (t.side === "sell") a.sellU += t.units;
    agg.set(t.name, a);
  }
  const holdings: BondHolding[] = [...agg.entries()]
    .map(([name, a]) => ({ name, units: a.buyU - a.sellU, invested: a.buy - a.sell, coupons: a.coupon }))
    .filter((h) => h.invested !== 0 || h.coupons !== 0 || h.units !== 0)
    .sort((x, y) => y.invested - x.invested || y.coupons - x.coupons);
  const totalInvested = holdings.reduce((s, h) => s + h.invested, 0);
  const totalCoupons = holdings.reduce((s, h) => s + h.coupons, 0);
  return { holdings, totalInvested, totalCoupons };
}

"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";
import { convertForex } from "../actions";

export default function ForexConvert({
  accountId,
  currency,
  wallets,
}: {
  accountId: number;
  currency: string;
  wallets: { id: number; name: string }[];
}) {
  const [idr, setIdr] = useState(""); // raw digits
  const [units, setUnits] = useState(""); // digits + optional decimal

  const idrNum = parseInt(idr || "0", 10);
  const unitsNum = parseFloat(units || "0") || 0;
  const rate = unitsNum > 0 ? idrNum / unitsNum : 0;

  return (
    <form action={convertForex} className="card space-y-2 p-4">
      <div className="label mb-1">Convert</div>
      <input type="hidden" name="account_id" value={accountId} />

      <select name="direction" className="field">
        <option value="buy" className="bg-ink-2">Buy · IDR → {currency}</option>
        <option value="sell" className="bg-ink-2">Sell · {currency} → IDR</option>
      </select>
      <select name="wallet_id" className="field">
        {wallets.map((w) => (
          <option key={w.id} value={w.id} className="bg-ink-2">{w.name}</option>
        ))}
      </select>

      <div className="flex gap-2">
        <label className="flex-1 text-xs text-paper-dim">
          IDR amount
          <input
            name="idr"
            inputMode="numeric"
            value={idr ? formatNumber(idrNum) : ""}
            onChange={(e) => setIdr(e.target.value.replace(/\D/g, ""))}
            placeholder="Rp"
            className="field mt-1"
          />
        </label>
        <label className="flex-1 text-xs text-paper-dim">
          {currency} amount
          <input
            name="units"
            inputMode="decimal"
            value={units}
            onChange={(e) => setUnits(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder={currency}
            className="field mt-1"
          />
        </label>
      </div>

      <p className="text-[11px] text-paper-faint">
        {rate > 0 ? (
          <>
            Your rate:{" "}
            <span className="text-paper">
              Rp {rate.toLocaleString("id-ID", { maximumFractionDigits: 2 })} / {currency}
            </span>{" "}
            — your exact amounts are recorded, not the live rate.
          </>
        ) : (
          <>Enter both your broker's IDR and {currency} amounts — they're recorded exactly as typed.</>
        )}
      </p>

      <button className="w-full rounded-2xl bg-green py-2.5 font-semibold text-ink">Convert</button>
    </form>
  );
}

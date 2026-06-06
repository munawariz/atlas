import Link from "next/link";
import { logout } from "./actions";

const LINKS = [
  { href: "/charts", label: "Charts", desc: "Trends & drilldown into your money" },
  { href: "/balances", label: "Starting balances", desc: "Opening balance per wallet → live networth" },
  { href: "/savings", label: "Savings", desc: "Balance in each saving & investment bucket" },
  { href: "/stocks", label: "Stocks", desc: "Per-ticker portfolio, live value & avg cost" },
  { href: "/bonds", label: "Bonds", desc: "Bond buys/sells & coupon income" },
  { href: "/more/forex", label: "Forex", desc: "Foreign currency holdings (live rate)" },
  { href: "/more/budgets", label: "Budgets", desc: "Set monthly targets" },
  { href: "/more/paylater", label: "My Paylater", desc: "Installment items" },
  { href: "/more/loans", label: "Loans", desc: "Money people owe you each month" },
  { href: "/more/wallets", label: "Wallets", desc: "Add / archive wallets" },
  { href: "/more/categories", label: "Categories", desc: "Add / archive categories" },
];

export default function MorePage() {
  return (
    <div className="space-y-5 pt-4">
      <header>
        <p className="label">Settings</p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-paper">More</h1>
      </header>

      <div className="card overflow-hidden">
        {LINKS.map((l, i) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center justify-between px-4 py-4 transition-colors active:bg-ink-3 ${i > 0 ? "hr-dash border-t" : ""
              }`}
          >
            <div>
              <div className="text-[15px] font-medium text-paper">{l.label}</div>
              <div className="text-xs text-paper-dim">{l.desc}</div>
            </div>
            <span className="text-gold/70">›</span>
          </Link>
        ))}
      </div>

      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-2xl border border-line/60 py-3 text-sm font-medium text-paper-dim transition-colors active:bg-ink-2"
        >
          Log out
        </button>
      </form>

      <p className="pt-1 text-center font-display text-sm italic text-paper-faint">Finance Tracker · 2026</p>
    </div>
  );
}

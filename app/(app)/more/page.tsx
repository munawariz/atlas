import Link from "next/link";
import { logout } from "./actions";

type Item = { href: string; label: string; desc: string };

const TOP: Item[] = [
  { href: "/charts", label: "Charts", desc: "Trends & drilldown into your money" },
  { href: "/balances", label: "Starting balances", desc: "Opening balance per wallet → live networth" },
  { href: "/savings", label: "Savings", desc: "Balance in each saving & investment bucket" },
];

// Grouped under a collapsible "Investment" entry.
const INVESTMENT: Item[] = [
  { href: "/stocks", label: "Stocks", desc: "Per-ticker portfolio, live value & avg cost" },
  { href: "/bonds", label: "Bonds", desc: "Bond buys/sells & coupon income" },
  { href: "/more/forex", label: "Forex", desc: "Foreign currency holdings (live rate)" },
];

const BOTTOM: Item[] = [
  { href: "/more/budgets", label: "Budgets", desc: "Set monthly targets" },
  { href: "/more/paylater", label: "My Installment", desc: "Installment items & providers" },
  { href: "/more/loans", label: "Loans", desc: "Money people owe you each month" },
  { href: "/more/wallets", label: "Wallets", desc: "Add / archive wallets" },
  { href: "/more/categories", label: "Categories", desc: "Add / archive categories" },
  { href: "/more/settings", label: "Settings", desc: "Map auto-transaction categories & default wallets" },
];

function Row({ item, border, indent }: { item: Item; border: boolean; indent?: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center justify-between py-4 pr-4 transition-colors active:bg-ink-3 ${
        indent ? "bg-ink-2/40 pl-8" : "px-4"
      } ${border ? "hr-dash border-t" : ""}`}
    >
      <div>
        <div className="text-[15px] font-medium text-paper">{item.label}</div>
        <div className="text-xs text-paper-dim">{item.desc}</div>
      </div>
      <span className="text-gold/70">›</span>
    </Link>
  );
}

export default function MorePage() {
  return (
    <div className="space-y-5 pt-4">
      <header>
        <p className="label">Settings</p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-paper">More</h1>
      </header>

      <div className="card overflow-hidden">
        {TOP.map((l, i) => (
          <Row key={l.href} item={l} border={i > 0} />
        ))}

        <details className="group hr-dash border-t">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-4 transition-colors active:bg-ink-3">
            <div>
              <div className="text-[15px] font-medium text-paper">Investment</div>
              <div className="text-xs text-paper-dim">Stocks, bonds &amp; forex</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="chevron h-4 w-4 text-gold/70 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
            </svg>
          </summary>
          {INVESTMENT.map((l) => (
            <Row key={l.href} item={l} border indent />
          ))}
        </details>

        {BOTTOM.map((l) => (
          <Row key={l.href} item={l} border />
        ))}
      </div>

      <Link
        href="/backup"
        className="card flex items-center justify-between px-4 py-4 transition-colors active:bg-ink-3"
      >
        <div>
          <div className="text-[15px] font-medium text-paper">Backup snapshot</div>
          <div className="text-xs text-paper-dim">Download a year&apos;s financial status as an Excel file (.xlsx)</div>
        </div>
        <span className="text-gold/70">›</span>
      </Link>

      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-2xl border border-line/60 py-3 text-sm font-medium text-paper-dim transition-colors active:bg-ink-2"
        >
          Log out
        </button>
      </form>

      <p className="pt-1 text-center font-display text-sm italic text-paper-faint">Atlas</p>
    </div>
  );
}

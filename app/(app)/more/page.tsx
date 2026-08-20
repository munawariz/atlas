import Link from "next/link";
import {
  ArrowUpRight,
  Bitcoin,
  ChevronDown,
  Coins,
  CreditCard,
  Download,
  FileText,
  Globe,
  LineChart,
  SlidersHorizontal,
  Star,
  Wallet as WalletIcon,
} from "@/components/icons";
import PendingChevron from "@/components/PendingChevron";
import { missingSettings } from "@/lib/settings";
import { logout } from "./actions";
import type { ComponentType } from "react";
import type { IconProps } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "More · Atlas" };

interface Item {
  href: string;
  label: string;
  hint: string;
  Icon: ComponentType<IconProps>;
}

const PRIMARY: Item[] = [
  { href: "/charts", label: "Charts", hint: "Net worth, cash flow, categories", Icon: LineChart },
  { href: "/more/cashflow", label: "Expected cashflow", hint: "What a month is planned to do", Icon: ArrowUpRight },
  { href: "/balances", label: "Starting balances", hint: "What each wallet opened with", Icon: WalletIcon },
  { href: "/savings", label: "Savings", hint: "Money set aside, per bucket", Icon: Coins },
];

const INVESTMENT: Item[] = [
  { href: "/stocks", label: "Stocks", hint: "Holdings, trades, dividends", Icon: LineChart },
  { href: "/bonds", label: "Bonds", hint: "Principal held and coupons", Icon: FileText },
  { href: "/crypto", label: "Crypto", hint: "Coins held, live value", Icon: Bitcoin },
  { href: "/more/forex", label: "Forex", hint: "Foreign currency, outside net worth", Icon: Globe },
];

const MANAGE: Item[] = [
  { href: "/more/budgets", label: "Budgets", hint: "Limits and targets per category", Icon: SlidersHorizontal },
  { href: "/more/paylater", label: "Installments", hint: "What you owe each month", Icon: CreditCard },
  { href: "/more/loans", label: "Lending", hint: "Money other people owe you", Icon: Coins },
  { href: "/more/wallets", label: "Wallets", hint: "Where your cash lives", Icon: WalletIcon },
  { href: "/more/categories", label: "Categories", hint: "What your transactions get labelled with", Icon: FileText },
  { href: "/more/providers", label: "Installment providers", hint: "Card, paylater, store credit", Icon: CreditCard },
  { href: "/more/settings", label: "Settings", hint: "Categories automated actions book to", Icon: Star },
];

export default async function MorePage() {
  const missing = await missingSettings();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink-900">
          More
        </h1>
      </header>

      {missing.length > 0 && (
        <Link
          href="/more/settings"
          className="block rounded-[var(--radius-card)] border-l-4 border-warning-500 bg-warning-100 p-4 no-underline"
        >
          <div className="text-[15px] font-semibold text-ink-900">
            {missing.length} setting{missing.length === 1 ? "" : "s"} still need a
            category
          </div>
          <p className="mt-1 text-[13px] text-ink-700">
            Automated transactions refuse until they know where to book. Open
            Settings and press Auto-detect.
          </p>
        </Link>
      )}

      <ItemList items={PRIMARY} />

      <details className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
        <summary className="flex items-center gap-3 px-4 py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-cream-100 text-forest-800">
            <LineChart size={20} />
          </span>
          <span className="flex-1 text-[15px] font-semibold text-ink-900">
            Investment
          </span>
          <span className="chevron text-ink-300">
            <ChevronDown size={18} />
          </span>
        </summary>
        <div className="border-t border-[var(--border-subtle)]">
          {INVESTMENT.map((item, i) => (
            <Row key={item.href} item={item} first={i === 0} />
          ))}
        </div>
      </details>

      <ItemList items={MANAGE} />

      <Link
        href="/backup"
        className="flex items-center gap-3 rounded-[var(--radius-card)] bg-forest-800 p-4 no-underline"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-lime-500 text-forest-800">
          <Download size={20} />
        </span>
        <span className="flex-1">
          <span className="block text-[15px] font-semibold text-white">
            Backup snapshot
          </span>
          <span className="block text-[13px]" style={{ color: "var(--color-forest-200)" }}>
            Download a year as an Excel workbook
          </span>
        </span>
        <PendingChevron size={18} className="shrink-0 text-forest-300" />
      </Link>

      <form action={logout}>
        <button type="submit" className="btn btn-outline w-full">
          Log out
        </button>
      </form>
    </div>
  );
}

function ItemList({ items }: { items: Item[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
      {items.map((item, i) => (
        <Row key={item.href} item={item} first={i === 0} />
      ))}
    </div>
  );
}

function Row({ item, first }: { item: Item; first: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-4 py-3.5 no-underline ${
        first ? "" : "border-t border-[var(--border-subtle)]"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-cream-100 text-forest-800">
        <item.Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink-900">
          {item.label}
        </span>
        <span className="block truncate text-[13px] text-ink-500">
          {item.hint}
        </span>
      </span>
      <PendingChevron size={18} className="shrink-0 text-ink-300" />
    </Link>
  );
}

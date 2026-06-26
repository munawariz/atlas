"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  dashboard: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.5 12 4l9 9.5M5 12v7.5a.5.5 0 0 0 .5.5H9v-5h6v5h3.5a.5.5 0 0 0 .5-.5V12"
    />
  ),
  history: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />,
  budget: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12V3.2M12 12l6.4 4" />
    </>
  ),
  more: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z"
    />
  ),
};

function Tab({ href, label, icon, active }: { href: string; label: string; icon: keyof typeof ICONS; active: boolean }) {
  return (
    <Link href={href} className="flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] font-medium">
      <span
        className={`flex h-9 w-12 items-center justify-center rounded-full transition-colors ${
          active ? "bg-green/15 text-green" : "text-paper-faint"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-[22px] w-[22px]">
          {ICONS[icon]}
        </svg>
      </span>
      <span className={active ? "text-green" : "text-paper-faint"}>{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const is = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <nav className="sticky bottom-0 z-20 border-t border-line/60 bg-ink/85 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pb-1.5 pt-1">
        <Tab href="/dashboard" label="Home" icon="dashboard" active={is("/dashboard")} />
        <Tab href="/history" label="History" icon="history" active={is("/history")} />

        {/* Primary action — larger, raised */}
        <Link href="/add" className="flex flex-1 flex-col items-center">
          <span className="-mt-7 flex h-16 w-16 items-center justify-center rounded-full bg-green text-ink shadow-[0_10px_28px_-6px_rgba(63,185,80,0.75)] ring-4 ring-ink transition-transform active:scale-95">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
            </svg>
          </span>
          <span className="mt-1 text-[11px] font-semibold text-green">Add</span>
        </Link>

        <Tab href="/more/budgets" label="Budget" icon="budget" active={is("/more/budgets")} />
        <Tab href="/more" label="More" icon="more" active={pathname === "/more" || (is("/more") && !is("/more/budgets"))} />
      </div>
    </nav>
  );
}

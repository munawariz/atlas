"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  House,
  FileText,
  Plus,
  SlidersHorizontal,
  Grid,
  type IconProps,
} from "./icons";

// The design system's tab bar is a flat white row with a lime underline on the active tab and
// no backdrop blur anywhere. Atlas the ledger needs Add to stay the primary action, so the
// centre slot keeps ATLAS.md's raised circle — recoloured to lime-500 with a forest glyph.

type Slot = {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
  /** Matches this tab when the pathname equals or sits under any of these. */
  match: string[];
};

const SLOTS: Slot[] = [
  { href: "/dashboard", label: "Home", Icon: House, match: ["/dashboard"] },
  { href: "/history", label: "History", Icon: FileText, match: ["/history"] },
  { href: "/add", label: "Add", Icon: Plus, match: ["/add"] },
  {
    href: "/more/budgets",
    label: "Budget",
    Icon: SlidersHorizontal,
    match: ["/more/budgets"],
  },
  { href: "/more", label: "More", Icon: Grid, match: ["/more"] },
];

export default function BottomNav() {
  const pathname = usePathname() || "";

  // Longest match wins, so /more/budgets lights Budget rather than More.
  const activeHref = SLOTS.reduce<string | null>((best, slot) => {
    const hit = slot.match.some(
      (m) => pathname === m || pathname.startsWith(`${m}/`)
    );
    if (!hit) return best;
    if (!best || slot.href.length > best.length) return slot.href;
    return best;
  }, null);

  return (
    <nav className="sticky bottom-0 z-30 mt-auto border-t border-[var(--border-subtle)] bg-white safe-bottom">
      <div className="mx-auto flex max-w-md items-start justify-around px-3 pt-3 pb-2">
        {SLOTS.map((slot) => {
          const active = activeHref === slot.href;

          if (slot.href === "/add") {
            return (
              <Link
                key={slot.href}
                href="/add"
                aria-label="Add a transaction"
                className="-mt-7 flex flex-col items-center gap-1.5 no-underline"
              >
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-500 text-forest-800 ring-4 ring-white transition-colors hover:bg-lime-600"
                  style={{ boxShadow: "0 18px 44px rgb(0 43 15 / 0.18)" }}
                >
                  <slot.Icon size={28} strokeWidth={2.5} />
                </span>
                <span className="text-[11px] font-semibold text-forest-800">
                  {slot.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={slot.href}
              href={slot.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-1.5 px-2.5 py-0.5 no-underline"
            >
              <slot.Icon
                size={22}
                className={active ? "text-forest-800" : "text-ink-300"}
              />
              <span
                className={`text-[11px] font-semibold ${
                  active ? "text-forest-800" : "text-ink-500"
                }`}
              >
                {slot.label}
              </span>
              <span
                className={`h-[3px] w-[18px] rounded-[3px] ${
                  active ? "bg-lime-500" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

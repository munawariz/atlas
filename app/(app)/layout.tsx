import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import PrivacyToggle from "@/components/PrivacyToggle";
import RouteProgress from "@/components/RouteProgress";
import {
  getCategories,
  getCategoryGroups,
  getGroupMembers,
  getRecentCategoryIds,
  getWallets,
} from "@/lib/data";

// The Add sheet lives in the tab bar, so every page needs its options at hand. Fetching
// them here — behind Suspense — rather than in the layout body keeps the shell synchronous:
// header, nav and the page skeleton stream immediately instead of waiting on five queries.
async function NavWithOptions() {
  const [wallets, categories, groups, members, recentCategoryIds] =
    await Promise.all([
      getWallets(),
      getCategories(),
      getCategoryGroups(),
      getGroupMembers(),
      getRecentCategoryIds(),
    ]);

  return (
    <BottomNav
      wallets={wallets}
      categories={categories}
      groups={groups}
      members={members}
      recentCategoryIds={recentCategoryIds}
    />
  );
}

export default function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <RouteProgress />
      {/*
        Solid white header, no backdrop-filter. A sticky element that also has a backdrop
        filter silently stops sticking in Chromium (ATLAS.md §14.1) — and the design system
        forbids frosted glass anywhere regardless.
      */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-white safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-800">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                {/* The four-point sparkle — the system's only decorative mark. */}
                <path
                  d="M12 2c.6 5.2 4.2 8.8 9.4 9.4v1.2C16.2 13.2 12.6 16.8 12 22h-1.2C10.2 16.8 6.6 13.2 1.4 12.6v-1.2C6.6 10.8 10.2 7.2 10.8 2z"
                  fill="var(--color-lime-500)"
                />
              </svg>
            </span>
            <span className="font-display text-[22px] font-extrabold lowercase tracking-[-0.045em] text-ink-900">
              atlas
            </span>
          </Link>

          {/*
            Global control, not a per-page one: the masking it drives (globals.css
            .privacy-scope) is CSS-driven off a class on <html> and already applies to every
            page that opts in. Hoisting the one control here (atlas-ux-review.md #10) means
            all thirteen masked pages get it, not just the five that used to render it inline.
          */}
          <div className="flex items-center gap-1">
            <PrivacyToggle className="text-forest-800 hover:bg-forest-50" />
            <Link
              href="/more"
              className="inline-flex h-9 items-center rounded-full border border-[var(--border-default)] px-4 text-[13px] font-semibold text-forest-800 no-underline transition-colors hover:bg-forest-50"
            >
              Account
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-6">{children}</main>

      <Suspense fallback={<BottomNav loading />}>
        <NavWithOptions />
      </Suspense>
    </div>
  );
}

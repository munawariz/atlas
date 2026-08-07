/**
 * Suspense fallback for More and everything under it — settings, wallets, categories, budgets,
 * cashflow, paylater, loans, forex, providers, backup. These are header + form/list pages, not
 * a hero card, so they get a shape closer to that instead of the data-page skeleton one level
 * up (atlas-ux-review.md #6). Next resolves the nearest `loading.tsx`, so this one covers the
 * whole section without a copy per page.
 */
export default function MoreLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-7 w-40 animate-pulse rounded-full bg-cream-200" />
      <div className="card h-32 animate-pulse" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="card h-14 animate-pulse"
            style={{ animationDelay: `${i * 0.06}s` }}
          />
        ))}
      </div>
    </div>
  );
}

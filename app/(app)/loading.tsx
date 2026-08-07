/**
 * Suspense fallback for the data pages under this route group — dashboard, stocks, bonds,
 * savings, history, charts, balances — none of which look like three stacked cards, which is
 * what this used to render for every route regardless of shape. A hero block + list rows is a
 * closer match to what actually streams in, so the layout jump when real content arrives is
 * smaller (atlas-ux-review.md #6). Settings-style pages under More get their own shape in
 * `more/loading.tsx`.
 */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="card h-[180px] animate-pulse" />
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="card h-16 animate-pulse"
            style={{ animationDelay: `${i * 0.06}s` }}
          />
        ))}
      </div>
    </div>
  );
}

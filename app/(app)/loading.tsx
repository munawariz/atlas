// Shown instantly while a dynamic page in the (app) group is fetched on the server,
// so tapping a tab gives immediate feedback instead of a frozen old screen.
export default function Loading() {
  return (
    <div className="space-y-4 pt-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-ink-3" />
      <div className="h-12 animate-pulse rounded-2xl bg-ink-2" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink-2" />
        ))}
      </div>
    </div>
  );
}

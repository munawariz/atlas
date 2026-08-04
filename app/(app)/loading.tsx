export default function Loading() {
  return (
    <div className="flex flex-col gap-3 pt-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="card h-28 animate-pulse"
          style={{ animationDelay: `${i * 0.06}s` }}
        />
      ))}
    </div>
  );
}

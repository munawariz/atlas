"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card mt-2 p-8">
      <h1 className="text-2xl">This page could not load.</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-700">
        Check your connection and try again. Nothing was written, and your ledger is
        untouched.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-ink-500">Reference: {error.digest}</p>
      )}
      <button type="button" onClick={reset} className="btn btn-primary mt-6 w-full">
        Try again
      </button>
    </div>
  );
}

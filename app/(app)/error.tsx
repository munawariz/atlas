"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

// Catches runtime errors thrown while rendering any (app) page — most often a
// transient database/network hiccup (e.g. a cold Supabase free-tier instance).
// Renders inside the app shell (bottom nav stays), with a retry that re-runs the
// server render of this segment — usually succeeds once the backend is warm.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pb-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber/12 text-2xl">⚠️</div>
      <h1 className="mt-4 font-display text-xl font-medium text-paper">Couldn’t load this</h1>
      <p className="mt-1.5 max-w-xs text-sm text-paper-dim">
        Something hiccuped on the way to the server. This is usually temporary — give it another try.
      </p>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-2xl bg-green px-5 py-2.5 text-sm font-semibold text-ink transition-transform active:scale-[0.98]"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-2xl border border-line/70 px-5 py-2.5 text-sm font-medium text-paper-dim active:text-paper"
        >
          Reload
        </button>
      </div>
      {error.digest && <p className="mt-5 text-[11px] text-paper-faint">ref: {error.digest}</p>}
    </div>
  );
}

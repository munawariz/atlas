"use client";

import { useEffect, useState } from "react";
import { X } from "@/components/icons";

/**
 * A minimal bottom-sheet shell around a self-contained form.
 *
 * Stocks, Bonds and Forex render their entry forms (StockTradeForm, StockDividendForm,
 * BondTradeForm, ForexConvert) permanently inline in the page body, interleaved with
 * read-only portfolio data — the actual source of those pages feeling "heavy" (atlas-ux-review.md,
 * Deep dive). Everywhere else in Atlas, recording something is a deliberate action: tap a
 * button, a sheet rises over the current screen, fill it in, it closes. This gives the
 * investment pages that same shape without touching the forms themselves — they already know
 * how to render and submit; this just keeps them off the page's resting scroll until asked for.
 */
export default function FormSheet({
  triggerLabel,
  title,
  children,
}: {
  triggerLabel: string;
  title: string;
  /**
   * A plain node, or a function given a `close` callback. Forms that report their own success
   * (the typed-return add actions on Installments and Lending) take the callback so a saved
   * entry dismisses the sheet, while a rejected one stays put with its error visible.
   */
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-outline w-full"
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-ink-900/40"
          />

          <div
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] max-w-md flex-col rounded-t-[var(--radius-card-lg)] bg-white safe-bottom"
            style={{
              boxShadow: "var(--shadow-float)",
              animation: "rise 0.34s var(--ease-standard) both",
            }}
          >
            <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4">
              <h2 className="font-display text-[18px] font-bold text-ink-900">
                {title}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-m-2 p-2 text-ink-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
              {typeof children === "function"
                ? children(() => setOpen(false))
                : children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "@/components/icons";

/**
 * Single-select for categories and wallets.
 *
 * Up to CHIP_LIMIT options render as the familiar wrap of pill chips — everything visible,
 * one tap to pick. Past that a wrapped pill cloud stops being scannable, so the control
 * becomes a field-shaped trigger that opens a bottom sheet: a vertical list scans at any
 * length, and it gains search once it is long enough to need one.
 */

const CHIP_LIMIT = 8;
const SEARCH_THRESHOLD = 10;

export interface PickerOption {
  id: number;
  name: string;
}

export default function OptionPicker({
  label,
  options,
  selected,
  onSelect,
  emptyMessage,
}: {
  label: string;
  options: PickerOption[];
  selected: number | null;
  onSelect: (id: number) => void;
  /** Shown when there is nothing to pick — points at the manage page. */
  emptyMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = options.find((o) => o.id === selected) ?? null;
  const searchable = options.length > SEARCH_THRESHOLD;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  // The sheet owns the screen while open: lock the page scroll, close on Escape.
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

  function choose(id: number) {
    onSelect(id);
    setOpen(false);
    setQuery("");
  }

  if (options.length === 0) {
    return (
      <section>
        <div className="label mb-2">{label}</div>
        <p className="text-[14px] text-ink-500">{emptyMessage}</p>
      </section>
    );
  }

  if (options.length <= CHIP_LIMIT) {
    return (
      <section>
        <div className="label mb-2">{label}</div>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              aria-pressed={selected === option.id}
              className={`chip ${selected === option.id ? "chip-on" : ""}`}
            >
              {option.name}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="label mb-2">{label}</div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="field flex items-center justify-between gap-2 text-left"
      >
        <span
          className={`truncate ${selectedOption ? "text-ink-900" : "text-ink-300"}`}
        >
          {selectedOption?.name ?? "Choose…"}
        </span>
        <ChevronDown size={18} className="shrink-0 text-ink-500" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-ink-900/40"
          />

          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[75dvh] flex-col rounded-t-[var(--radius-card-lg)] bg-white safe-bottom"
            style={{
              boxShadow: "var(--shadow-float)",
              animation: "rise 0.34s var(--ease-standard) both",
            }}
          >
            <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-4">
              <h2 className="text-[16px] font-bold text-ink-900">{label}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-m-2 p-2 text-ink-500"
              >
                <X size={20} />
              </button>
            </div>

            {searchable && (
              <div className="px-5 pb-2">
                <div className="relative">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-300"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    aria-label={`Search ${label.toLowerCase()}`}
                    autoComplete="off"
                    className="field h-11 pl-11"
                  />
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {visible.length === 0 ? (
                <p className="px-2 py-6 text-center text-[14px] text-ink-500">
                  No matches.
                </p>
              ) : (
                visible.map((option) => {
                  const active = option.id === selected;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => choose(option.id)}
                      aria-pressed={active}
                      className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius-input)] px-3 py-3 text-left text-[15px] transition-colors ${
                        active
                          ? "bg-forest-50 font-semibold text-forest-800"
                          : "text-ink-700 hover:bg-cream-100"
                      }`}
                    >
                      <span className="truncate">{option.name}</span>
                      {active && (
                        <Check size={18} className="shrink-0 text-forest-800" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

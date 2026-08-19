"use client";

import { useActionState, useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import type { Category, Wallet } from "@/lib/types";
import { saveAppSettings, type SettingsState } from "../actions";

interface Row {
  key: string;
  label: string;
  help: string;
  /** Category rows carry a kind; wallet rows do not. */
  kind?: string;
}

const INITIAL: SettingsState = {};

export default function SettingsForm({
  categoryRows,
  walletRows,
  categories,
  wallets,
  current,
  detected,
}: {
  categoryRows: Row[];
  walletRows: Row[];
  categories: Category[];
  wallets: Wallet[];
  /** key -> currently mapped id, or "" when unmapped. */
  current: Record<string, string>;
  /** Auto-detect proposals computed on the server: key -> id, plus what it could not match. */
  detected: { matched: Record<string, number>; unmatched: string[] };
}) {
  const [state, formAction] = useActionState(saveAppSettings, INITIAL);
  const [values, setValues] = useState<Record<string, string>>(current);
  const [detectNote, setDetectNote] = useState<string | null>(null);

  /**
   * Auto-detect fills the selects and nothing else. It never writes — the user reviews the
   * result and presses Save. This is the only place name-matching happens at all.
   */
  function autoDetect() {
    const next = { ...values };
    for (const [key, id] of Object.entries(detected.matched)) {
      next[key] = String(id);
    }
    setValues(next);

    const total = categoryRows.length;
    const hits = Object.keys(detected.matched).length;
    setDetectNote(
      hits === total
        ? `Matched all ${total}. Review them and press Save.`
        : `Matched ${hits} of ${total}. ${detected.unmatched.join(
            " and "
          )} need a manual pick.`
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-[var(--radius-card)] bg-sage-100 p-4">
        <p className="text-[14px] text-ink-700">
          Automated transactions — stock and crypto trades, dividends, bond coupons, loan
          collections, forex conversions — need to know which of{" "}
          <em>your</em> categories to book under. Nothing is created for you, so
          an unmapped row means that feature politely refuses until you set it.
        </p>
        <button
          type="button"
          onClick={autoDetect}
          className="btn btn-sm btn-outline mt-3"
        >
          Auto-detect
        </button>
        {detectNote && (
          <p role="status" className="mt-2 text-[13px] font-medium text-forest-800">
            {detectNote}
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="label">Automated transaction categories</h2>
        {categoryRows.map((row) => {
          const value = values[row.key] ?? "";
          const choices = categories.filter((c) => c.kind === row.kind);
          return (
            <div
              key={row.key}
              className={`rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)] ${
                value ? "" : "border-l-4 border-warning-500"
              }`}
            >
              <label
                htmlFor={row.key}
                className="mb-1 flex items-center justify-between gap-2"
              >
                <span className="text-[15px] font-semibold text-ink-900">
                  {row.label}
                </span>
                {!value && (
                  <span className="badge bg-warning-100 text-warning-600">
                    Not set
                  </span>
                )}
              </label>
              <p className="mb-2 text-[13px] text-ink-500">{row.help}</p>
              <select
                id={row.key}
                name={row.key}
                value={value}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [row.key]: e.target.value }))
                }
                className="field"
              >
                {/* Blank must be saveable, or a mapping can never be cleared. */}
                <option value="">— not set —</option>
                {choices.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                    {c.archived ? " (archived)" : ""}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="label">Default wallets</h2>
        {walletRows.map((row) => (
          <div
            key={row.key}
            className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
          >
            <label
              htmlFor={row.key}
              className="text-[15px] font-semibold text-ink-900"
            >
              {row.label}
            </label>
            <p className="mb-2 text-[13px] text-ink-500">{row.help}</p>
            <select
              id={row.key}
              name={row.key}
              value={values[row.key] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [row.key]: e.target.value }))
              }
              className="field"
            >
              <option value="">— not set —</option>
              {wallets.map((w) => (
                <option key={w.id} value={String(w.id)}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </section>

      {state.error && (
        <p
          role="alert"
          className="rounded-[var(--radius-input)] bg-negative-100 px-4 py-3 text-[14px] font-medium text-negative-600"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p
          role="status"
          className="rounded-[var(--radius-input)] bg-positive-100 px-4 py-3 text-[14px] font-medium text-positive-600"
        >
          Settings saved.
        </p>
      )}

      <SubmitButton pendingChildren="Saving…">Save settings</SubmitButton>
    </form>
  );
}

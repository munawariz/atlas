"use client";

import { useState, useTransition } from "react";
import { editPaylater } from "../actions";
import { PencilIcon } from "@/components/icons";

export default function PaylaterEdit({
  id,
  item,
  monthlyAmount,
  firstMonth,
  lastMonth,
  providerId,
  note,
  providers,
}: {
  id: number;
  item: string;
  monthlyAmount: number;
  firstMonth: string; // YYYY-MM-DD
  lastMonth: string; // YYYY-MM-DD
  providerId: number | null;
  note: string | null;
  providers: { id: number; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await editPaylater(fd);
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit"
        title="Edit"
        className="grid h-8 w-8 place-items-center rounded-lg text-paper-dim active:bg-ink-3 active:text-paper"
      >
        <PencilIcon className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          onClick={() => !pending && setOpen(false)}
        >
          <form
            onSubmit={onSubmit}
            onClick={(e) => e.stopPropagation()}
            className="card pop w-full max-w-xs space-y-2 bg-ink-2 p-5 shadow-2xl"
          >
            <h3 className="font-display text-lg font-medium text-paper">Edit installment</h3>
            <input type="hidden" name="id" value={id} />
            <input name="item" defaultValue={item} placeholder="Item name" className="field" />
            <input
              name="monthly_amount"
              inputMode="numeric"
              defaultValue={monthlyAmount || ""}
              placeholder="Monthly Rp"
              className="field"
            />
            <div className="flex gap-2">
              <label className="flex-1 text-xs text-paper-dim">
                First month
                <input
                  type="month"
                  name="first_month"
                  defaultValue={firstMonth.slice(0, 7)}
                  className="field mt-1 [color-scheme:dark]"
                />
              </label>
              <label className="flex-1 text-xs text-paper-dim">
                Last month
                <input
                  type="month"
                  name="last_month"
                  defaultValue={lastMonth.slice(0, 7)}
                  className="field mt-1 [color-scheme:dark]"
                />
              </label>
            </div>
            {providers.length > 0 && (
              <label className="block text-xs text-paper-dim">
                Provider
                <select name="provider_id" defaultValue={providerId ?? ""} className="field mt-1 [color-scheme:dark]">
                  <option value="" className="bg-ink-2">No provider</option>
                  {providers.map((pr) => (
                    <option key={pr.id} value={pr.id} className="bg-ink-2">{pr.name}</option>
                  ))}
                </select>
              </label>
            )}
            <input name="note" defaultValue={note ?? ""} placeholder="Note (optional)" className="field" />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-line/70 py-2.5 text-sm font-medium text-paper-dim disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-xl bg-green py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

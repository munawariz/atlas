"use client";

import { useState, useTransition } from "react";
import SubmitButton from "@/components/SubmitButton";
import { PencilIcon, CheckIcon, ChevronUpIcon, ChevronDownIcon } from "@/components/icons";

type Dir = "up" | "down";

// A manageable list row (wallet or category): inline rename, move up/down, archive.
// The server actions are passed in so the same row works for both lists.
export default function ManageRow({
  id,
  name,
  archived,
  isFirst,
  isLast,
  rename,
  move,
  toggleArchive,
}: {
  id: number;
  name: string;
  archived: boolean;
  isFirst: boolean;
  isLast: boolean;
  rename: (id: number, formData: FormData) => Promise<void>;
  move: (id: number, dir: Dir) => Promise<void>;
  toggleArchive: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const onRename = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await rename(id, fd);
      setEditing(false);
    });
  };

  if (editing) {
    return (
      <form onSubmit={onRename} className="flex items-center gap-2 px-4 py-2">
        <input name="name" defaultValue={name} autoFocus disabled={pending} className="field flex-1 py-1.5" />
        <button
          type="submit"
          disabled={pending}
          aria-label="Save"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-green/15 text-green active:bg-green/25 disabled:opacity-50"
        >
          <CheckIcon className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          aria-label="Cancel"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-paper-dim active:bg-ink-3"
        >
          ✕
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2">
      <span className={`min-w-0 flex-1 truncate text-sm ${archived ? "text-paper-faint line-through" : "text-paper"}`}>
        {name}
      </span>
      <div className="flex shrink-0 items-center gap-0.5">
        <form action={move.bind(null, id, "up")}>
          <ArrowBtn disabled={isFirst} label="Move up">
            <ChevronUpIcon className="h-[18px] w-[18px]" />
          </ArrowBtn>
        </form>
        <form action={move.bind(null, id, "down")}>
          <ArrowBtn disabled={isLast} label="Move down">
            <ChevronDownIcon className="h-[18px] w-[18px]" />
          </ArrowBtn>
        </form>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Rename"
          className="grid h-8 w-8 place-items-center rounded-lg text-paper-dim active:bg-ink-3 active:text-paper"
        >
          <PencilIcon className="h-[17px] w-[17px]" />
        </button>
        <form action={toggleArchive.bind(null, id)}>
          <SubmitButton className="ml-1 text-xs text-paper-dim active:text-paper">
            {archived ? "Restore" : "Archive"}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

function ArrowBtn({ disabled, label, children }: { disabled: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-paper-dim active:bg-ink-3 active:text-paper disabled:pointer-events-none disabled:opacity-25"
    >
      {children}
    </button>
  );
}

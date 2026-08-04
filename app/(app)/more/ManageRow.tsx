"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Pencil, Trash, X } from "@/components/icons";

interface ManageRowProps {
  name: string;
  archived: boolean;
  /** Bound server action taking a FormData with a `name` field. */
  onRename: (formData: FormData) => void | Promise<void>;
  onToggleArchive: () => void | Promise<void>;
  /** Omit to hide delete entirely. Only ever offered once archived. */
  onDelete?: () => void | Promise<void>;
  onMoveUp?: () => void | Promise<void>;
  onMoveDown?: () => void | Promise<void>;
  /** Extra controls rendered under the name — period select, installment toggle, etc. */
  children?: React.ReactNode;
}

/** One editable row in the wallets / categories / providers lists. */
export default function ManageRow({
  name,
  archived,
  onRename,
  onToggleArchive,
  onDelete,
  onMoveUp,
  onMoveDown,
  children,
}: ManageRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div
      className={`rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-xs)] ${
        archived ? "opacity-60" : ""
      }`}
    >
      {editing ? (
        <form
          action={async (formData: FormData) => {
            await onRename(formData);
            setEditing(false);
          }}
          className="flex items-center gap-2"
        >
          <input
            name="name"
            defaultValue={name}
            autoFocus
            aria-label="New name"
            className="field h-11 flex-1"
          />
          <button
            type="submit"
            aria-label="Save name"
            title="Save name"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-forest-800 text-white"
          >
            <Check size={18} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Cancel rename"
            title="Cancel rename"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] text-ink-500"
          >
            <X size={18} />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink-900">
            {name}
            {archived && (
              <span className="badge ml-2 bg-cream-200 text-ink-700">
                Archived
              </span>
            )}
          </span>

          {onMoveUp && (
            <IconAction label="Move up" onClick={onMoveUp}>
              <ChevronUp size={16} />
            </IconAction>
          )}
          {onMoveDown && (
            <IconAction label="Move down" onClick={onMoveDown}>
              <ChevronDown size={16} />
            </IconAction>
          )}

          <IconAction label={`Rename ${name}`} onClick={() => setEditing(true)}>
            <Pencil size={16} />
          </IconAction>

          <form action={onToggleArchive} className="contents">
            <button
              type="submit"
              aria-label={archived ? `Restore ${name}` : `Archive ${name}`}
              title={archived ? "Restore" : "Archive"}
              className="inline-flex h-9 shrink-0 items-center rounded-full px-3 text-[12px] font-semibold text-forest-800 transition-colors hover:bg-forest-50"
            >
              {archived ? "Restore" : "Archive"}
            </button>
          </form>

          {/*
            Delete is only offered on an archived row — archiving first is what makes the
            FK cascade a deliberate act rather than an accident.
          */}
          {archived && onDelete && (
            <IconAction
              label={`Delete ${name}`}
              onClick={() => setConfirmingDelete(true)}
              className="text-negative-600"
            >
              <Trash size={16} />
            </IconAction>
          )}
        </div>
      )}

      {children && <div className="mt-3">{children}</div>}

      {confirmingDelete && onDelete && (
        <div className="mt-3 rounded-[var(--radius-input)] bg-negative-100 p-3">
          <p className="text-[13px] text-negative-600">
            Delete <strong>{name}</strong> permanently? Past transactions keep
            their history but lose this label.
          </p>
          <div className="mt-2 flex gap-2">
            <form action={onDelete}>
              <button
                type="submit"
                className="btn btn-sm bg-negative-500 text-white"
              >
                Delete
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="btn btn-sm btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
  className = "text-ink-500",
}: {
  label: string;
  onClick: () => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form action={onClick} className="contents">
      <button
        type="submit"
        aria-label={label}
        title={label}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-forest-50 ${className}`}
      >
        {children}
      </button>
    </form>
  );
}

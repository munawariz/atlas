"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Ellipsis,
  Pencil,
  Trash,
  X,
} from "@/components/icons";

interface ManageRowProps {
  name: string;
  archived: boolean;
  /** Bound server action taking a FormData with a `name` field. */
  onRename: (formData: FormData) => void | Promise<void>;
  onToggleArchive: () => void | Promise<void>;
  /**
   * Omit to hide delete entirely. Only ever offered once archived. May resolve to an
   * `{ error }` the panel renders in place, for the refusals the gate cannot express.
   */
  onDelete?: () => void | Promise<{ error?: string } | void>;
  /**
   * What the delete actually costs, in the row's own terms. A category loses its label on past
   * transactions; a group loses nothing but itself — one hardcoded sentence could never be true
   * of both (atlas-ux-plan-manage-pages.md C6).
   */
  deleteMessage?: React.ReactNode;
  onMoveUp?: () => void | Promise<void>;
  onMoveDown?: () => void | Promise<void>;
  /**
   * Grab affordance for a drag-to-reorder list, rendered at the head of the row. Omit for a
   * list that is not sortable (or a row that is the only one in it).
   */
  dragHandle?: React.ReactNode;
  /** DOM id, so an add form can jump to this row once it exists (`.target-flash`). */
  anchorId?: string;
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
  deleteMessage,
  onMoveUp,
  onMoveDown,
  dragHandle,
  anchorId,
  children,
}: ManageRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Reorder and delete are occasional; rename and archive are the everyday pair. Keeping only
  // the everyday pair inline is what buys every remaining target its 44px, instead of five
  // 36px ones sharing a row (atlas-ux-plan-manage-pages.md, Categories UX #5).
  const canDelete = archived && Boolean(onDelete);
  const hasMenu = Boolean(onMoveUp || onMoveDown || canDelete);

  return (
    <div
      id={anchorId}
      className={`target-flash rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-xs)] ${
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
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-forest-800 text-white"
          >
            <Check size={18} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Cancel rename"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] text-ink-500"
          >
            <X size={18} />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-1">
          {dragHandle}
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink-900">
            {name}
            {archived && (
              <span className="badge ml-2 bg-cream-200 text-ink-700">
                Archived
              </span>
            )}
          </span>

          <IconAction label={`Rename ${name}`} onClick={() => setEditing(true)}>
            <Pencil size={18} />
          </IconAction>

          <form action={onToggleArchive} className="contents">
            <button
              type="submit"
              aria-label={archived ? `Restore ${name}` : `Archive ${name}`}
              className="inline-flex h-11 shrink-0 items-center rounded-full px-3 text-[13px] font-semibold text-forest-800 transition-colors hover:bg-forest-50"
            >
              {archived ? "Restore" : "Archive"}
            </button>
          </form>

          {hasMenu && (
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label={`More actions for ${name}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-forest-50"
            >
              <Ellipsis size={18} />
            </button>
          )}
        </div>
      )}

      {menuOpen && hasMenu && !editing && (
        <div className="mt-2 divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-input)] bg-cream-100">
          {onMoveUp && (
            <MenuAction label="Move up" onClick={onMoveUp}>
              <ChevronUp size={18} />
            </MenuAction>
          )}
          {onMoveDown && (
            <MenuAction label="Move down" onClick={onMoveDown}>
              <ChevronDown size={18} />
            </MenuAction>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirmingDelete(true);
              }}
              className="flex h-11 w-full items-center gap-2 px-3 text-left text-[14px] font-semibold text-negative-600"
            >
              <Trash size={18} />
              Delete
            </button>
          )}
        </div>
      )}

      {children && <div className="mt-3">{children}</div>}

      {confirmingDelete && onDelete && (
        <div className="mt-3 rounded-[var(--radius-input)] bg-negative-100 p-3">
          <p className="text-[13px] text-negative-600">
            {deleteMessage ?? (
              <>
                Delete <strong>{name}</strong> permanently? This can&rsquo;t be
                undone.
              </>
            )}
          </p>
          <div className="mt-2 flex gap-2">
            <form
              action={async () => {
                const result = await onDelete();
                setDeleteError(result?.error ?? null);
              }}
            >
              <button
                type="submit"
                className="btn btn-sm bg-negative-500 text-white"
              >
                Delete
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete(false);
                setDeleteError(null);
              }}
              className="btn btn-sm btn-ghost"
            >
              Cancel
            </button>
          </div>

          {deleteError && (
            <p role="alert" className="mt-2 text-[13px] font-medium text-negative-600">
              {deleteError}
            </p>
          )}
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
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-forest-50 ${className}`}
      >
        {children}
      </button>
    </form>
  );
}

/** One labelled row inside the overflow panel — a real label, not an icon needing a title. */
function MenuAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <form action={onClick}>
      <button
        type="submit"
        className="flex h-11 w-full items-center gap-2 px-3 text-left text-[14px] font-semibold text-ink-700"
      >
        {children}
        {label}
      </button>
    </form>
  );
}

"use client";

import type { PaylaterProvider } from "@/lib/types";
import SortableList from "@/components/SortableList";
import ManageRow from "../ManageRow";
import { GripIcon } from "@/components/icons";
import {
  deletePaylaterProvider,
  renamePaylaterProvider,
  reorderPaylaterProviders,
  togglePaylaterProviderArchived,
} from "../actions";

// Installment providers as a drag-to-reorder list. Their order drives the provider groups
// on My Paylater and the Home installments tab. Rename, archive, and delete still work.
export default function ProviderList({ providers }: { providers: PaylaterProvider[] }) {
  const byId = new Map(providers.map((p) => [p.id, p]));
  return (
    <SortableList
      className="card overflow-hidden"
      ids={providers.map((p) => p.id)}
      onReorder={reorderPaylaterProviders}
      renderItem={(id, { handleProps, dragging, index }) => {
        const p = byId.get(id);
        if (!p) return null;
        return (
          <div className={`${index > 0 ? "hr-dash border-t" : ""} ${dragging ? "bg-ink-2" : ""}`}>
            <ManageRow
              id={p.id}
              name={p.name}
              archived={p.archived}
              isFirst={index === 0}
              isLast={index === providers.length - 1}
              rename={renamePaylaterProvider}
              toggleArchive={togglePaylaterProviderArchived}
              remove={deletePaylaterProvider}
              removeConfirm={`Delete "${p.name}"? Its installments keep their data but lose this grouping (the linked category stays).`}
              dragHandle={
                <span
                  {...handleProps}
                  aria-label="Drag to reorder"
                  className="grid h-8 w-6 shrink-0 place-items-center text-paper-faint active:text-paper-dim"
                >
                  <GripIcon className="h-[18px] w-[18px]" />
                </span>
              }
            />
          </div>
        );
      }}
    />
  );
}

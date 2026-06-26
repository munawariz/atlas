import Link from "next/link";
import { getPaylaterProviders } from "@/lib/data";
import SubmitButton from "@/components/SubmitButton";
import ManageRow from "../ManageRow";
import {
  addPaylaterProvider,
  deletePaylaterProvider,
  movePaylaterProvider,
  renamePaylaterProvider,
  togglePaylaterProviderArchived,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const providers = await getPaylaterProviders(true);
  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more/paylater" className="text-sm text-paper-dim active:text-paper">‹ Paylater</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Installment providers</h1>
        <span className="w-12" />
      </div>

      <p className="px-1 text-sm text-paper-dim">
        Group your installments by provider (ShopeePaylater, GoPayLater, Credit Card, …). Archive one to hide it from
        the picker while keeping existing groupings; delete one to remove it (its items just become ungrouped).
      </p>

      <form action={addPaylaterProvider} className="flex gap-2">
        <input name="name" placeholder="New provider name" className="field flex-1" />
        <SubmitButton pendingText="…" className="rounded-2xl bg-gold px-5 font-semibold text-ink">
          Add
        </SubmitButton>
      </form>

      {providers.length === 0 ? (
        <p className="pt-6 text-center text-sm text-paper-faint">No providers yet — add one above.</p>
      ) : (
        <div className="card overflow-hidden">
          {providers.map((p, i) => (
            <div key={p.id} className={i > 0 ? "hr-dash border-t" : ""}>
              <ManageRow
                id={p.id}
                name={p.name}
                archived={p.archived}
                isFirst={i === 0}
                isLast={i === providers.length - 1}
                rename={renamePaylaterProvider}
                move={movePaylaterProvider}
                toggleArchive={togglePaylaterProviderArchived}
                remove={deletePaylaterProvider}
                removeConfirm={`Delete "${p.name}"? Its installments keep their data but lose this grouping (the linked category stays).`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { getPaylaterProviders } from "@/lib/data";
import { ChevronLeft } from "@/components/icons";
import ManageRow from "../ManageRow";
import {
  addProvider,
  moveProvider,
  renameProvider,
  toggleProviderArchived,
} from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Installment providers · Atlas" };

export default async function ProvidersPage() {
  const providers = await getPaylaterProviders(true);
  const active = providers.filter((p) => !p.archived);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-1">
        <Link
          href="/more"
          aria-label="Back to more"
          className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 no-underline"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-ink-900">
          Installment providers
        </h1>
      </header>

      <p className="text-[14px] text-ink-500">
        Each provider owns one expense category of the same name, so installment
        spend stays separate from ordinary spend. Renaming a provider renames its
        category too.
      </p>

      <form action={addProvider} className="flex gap-2">
        <input
          name="name"
          placeholder="Provider name"
          aria-label="Provider name"
          required
          className="field flex-1"
        />
        <button type="submit" className="btn btn-primary shrink-0 px-5">
          Add
        </button>
      </form>

      <div className="space-y-2">
        {providers.map((provider) => {
          const activeIndex = active.findIndex((p) => p.id === provider.id);
          return (
            <ManageRow
              key={provider.id}
              name={provider.name}
              archived={provider.archived}
              onRename={renameProvider.bind(null, provider.id)}
              onToggleArchive={toggleProviderArchived.bind(
                null,
                provider.id,
                !provider.archived
              )}
              onMoveUp={
                activeIndex > 0
                  ? moveProvider.bind(null, provider.id, -1)
                  : undefined
              }
              onMoveDown={
                activeIndex >= 0 && activeIndex < active.length - 1
                  ? moveProvider.bind(null, provider.id, 1)
                  : undefined
              }
            />
          );
        })}

        {providers.length === 0 && (
          <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
            No providers yet. Add one to start tracking installments.
          </p>
        )}
      </div>
    </div>
  );
}

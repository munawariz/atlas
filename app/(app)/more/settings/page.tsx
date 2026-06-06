import Link from "next/link";
import { getCategories, getWallets } from "@/lib/data";
import { CATEGORY_SETTINGS, WALLET_SETTINGS, getSettings, mappedCategoryId, mappedWalletId } from "@/lib/settings";
import SubmitButton from "@/components/SubmitButton";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [cats, wallets, settings] = await Promise.all([getCategories(false), getWallets(), getSettings()]);
  const walletOpts = wallets.map((w) => ({ id: w.id, name: w.name }));

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Settings</h1>
        <span className="w-12" />
      </div>

      <p className="px-1 text-sm text-paper-dim">
        Map the categories and wallets used by the app&apos;s automated transactions to your own setup. Defaults fall
        back to the seeded names, so this is optional — handy when self-hosting or renaming categories.
      </p>

      <form action={saveSettings} className="space-y-4">
        <section className="space-y-2">
          <h2 className="label text-amber">Automated transaction categories</h2>
          {CATEGORY_SETTINGS.map((s) => {
            const opts = cats.filter((c) => c.kind === s.kind);
            const cur = mappedCategoryId(settings, cats, s.key, s.default, s.kind);
            return (
              <label key={s.key} className="card block p-4">
                <div className="text-sm font-medium text-paper">
                  {s.label}
                  <span className="ml-1.5 text-[10px] uppercase tracking-wider text-paper-faint">{s.kind}</span>
                </div>
                <div className="text-xs text-paper-dim">{s.help}</div>
                <select name={s.key} defaultValue={cur ?? ""} className="field mt-2 [color-scheme:dark]">
                  {opts.length === 0 && <option value="">No {s.kind} categories</option>}
                  {opts.map((c) => (
                    <option key={c.id} value={c.id} className="bg-ink-2">{c.name}</option>
                  ))}
                </select>
              </label>
            );
          })}
        </section>

        <section className="space-y-2">
          <h2 className="label text-amber">Default wallets</h2>
          {WALLET_SETTINGS.map((s) => {
            const cur = mappedWalletId(settings, walletOpts, s.key, s.match);
            return (
              <label key={s.key} className="card block p-4">
                <div className="text-sm font-medium text-paper">{s.label}</div>
                <div className="text-xs text-paper-dim">{s.help}</div>
                <select name={s.key} defaultValue={cur ?? ""} className="field mt-2 [color-scheme:dark]">
                  {walletOpts.map((w) => (
                    <option key={w.id} value={w.id} className="bg-ink-2">{w.name}</option>
                  ))}
                </select>
              </label>
            );
          })}
        </section>

        <SubmitButton pendingText="Saving…" className="w-full rounded-2xl bg-green py-2.5 font-semibold text-ink">
          Save settings
        </SubmitButton>
      </form>
    </div>
  );
}

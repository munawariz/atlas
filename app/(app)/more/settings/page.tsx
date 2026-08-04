import Link from "next/link";
import { getCategories, getWallets } from "@/lib/data";
import {
  CATEGORY_SETTINGS,
  WALLET_SETTINGS,
  autoDetectSettings,
  getSettings,
  mappedCategoryId,
  mappedWalletId,
} from "@/lib/settings";
import { ChevronLeft } from "@/components/icons";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings · Atlas" };

export default async function SettingsPage() {
  const [settings, categories, wallets, detected] = await Promise.all([
    getSettings(),
    getCategories(true),
    getWallets(true),
    autoDetectSettings(),
  ]);

  const current: Record<string, string> = {};
  for (const setting of CATEGORY_SETTINGS) {
    const id = mappedCategoryId(settings, categories, setting.key);
    current[setting.key] = id ? String(id) : "";
  }
  for (const setting of WALLET_SETTINGS) {
    const id = mappedWalletId(settings, wallets, setting.key);
    current[setting.key] = id ? String(id) : "";
  }

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
          Settings
        </h1>
      </header>

      <SettingsForm
        categoryRows={CATEGORY_SETTINGS}
        walletRows={WALLET_SETTINGS.map((w) => ({ ...w }))}
        categories={categories}
        wallets={wallets.filter((w) => !w.archived)}
        current={current}
        detected={detected}
      />
    </div>
  );
}

import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/85 backdrop-blur-xl safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="h-7 w-7 rounded-[8px]" />
            <span className="font-display text-[19px] font-semibold lowercase leading-none tracking-tight text-paper">
              atlas
            </span>
          </Link>
          <Link
            href="/more"
            className="rounded-md border border-line/70 px-2.5 py-1 font-display text-[10px] uppercase tracking-wider text-paper-dim transition-colors active:text-paper"
          >
            Account
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 pb-4">{children}</main>
      <BottomNav />
    </div>
  );
}

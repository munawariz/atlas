"use client";

import {
  useActionState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { X } from "@/components/icons";
import {
  TYPE_ACCENT,
  amountFontSize,
  walletLabel,
} from "@/components/TxnFields";
import { addTransaction, type AddState } from "@/app/(app)/actions";
import { formatNumber, todayISO } from "@/lib/format";
import type {
  Category,
  CategoryGroup,
  CategoryGroupMember,
  CategoryKind,
  TxnType,
  Wallet,
} from "@/lib/types";

/**
 * The staged Add flow, as a bottom sheet over whatever page you are on.
 *
 * Right under the date sits a horizontally scrollable TAB row over the category picker:
 * Recent (the categories of the last few entries — the default, because most spending is
 * habitual) · Favorite (starred categories) · one tab per user group · All. Tapping a
 * category derives the transaction type from its kind (expense/income/saving/investment),
 * which decides whether the next step asks for the paying wallet (money out) or the
 * receiving wallet (income). Then the amount.
 *
 * Transfers and withdrawals are deliberately NOT here — they move money rather than record
 * it, and live as their own feature.
 *
 * This sheet IS the add flow — there is no /add page.
 */

const INITIAL: AddState = {};

const KIND_ORDER: CategoryKind[] = ["expense", "income", "saving", "investment"];

interface PickerTab {
  key: string;
  label: string;
  categories: Category[];
  emptyMessage: string;
}

export default function AddSheet({
  wallets,
  categories,
  groups,
  members,
  recentCategoryIds,
  open,
  onClose,
}: {
  wallets: Wallet[];
  categories: Category[];
  groups: CategoryGroup[];
  members: CategoryGroupMember[];
  recentCategoryIds: number[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(addTransaction, INITIAL);

  const [tabKey, setTabKey] = useState("recent");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sourceWalletId, setSourceWalletId] = useState<number | null>(null);
  const [destWalletId, setDestWalletId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayISO());

  const [toast, setToast] = useState<string | null>(null);
  const lastNonce = useRef<number | undefined>(undefined);
  const bodyRef = useRef<HTMLDivElement>(null);

  // The active-tab pill is one element that GLIDES between tabs: each button registers
  // itself here, and on every tab change the pill is re-measured to the active button's
  // offset/width. `animate` is false only for the first paint after the sheet opens, so
  // the pill starts in place instead of sliding in from the edge.
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const [pill, setPill] = useState<{
    left: number;
    width: number;
    animate: boolean;
  } | null>(null);

  // A fresh flow every time the sheet opens — staged reveal only works from a blank slate.
  useEffect(() => {
    if (!open) return;
    setTabKey("recent");
    setCategoryId(null);
    setSourceWalletId(null);
    setDestWalletId(null);
    setAmount("");
    setDescription("");
    setOccurredOn(todayISO());
  }, [open]);

  // The sheet owns the screen while open: lock the page scroll, close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Each answered step reveals the next below the fold — keep it in view as the sheet grows.
  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() =>
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    );
    return () => cancelAnimationFrame(raf);
  }, [open, categoryId, sourceWalletId, destWalletId]);

  // Success: toast, close, and refresh the page underneath — there is no navigation to
  // re-render the numbers this row just changed.
  useEffect(() => {
    if (!state.ok || !state.nonce || state.nonce === lastNonce.current) return;
    lastNonce.current = state.nonce;
    setToast(state.savedLabel ?? "Saved");
    router.refresh();
    onClose();
    const timer = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(timer);
  }, [state, router, onClose]);

  // --- Step 1's tabs: Recent · Favorite · one per group · All ----------------
  const tabs = useMemo<PickerTab[]>(() => {
    const active = categories.filter((c) => !c.archived);
    const byId = new Map(active.map((c) => [c.id, c]));

    const result: PickerTab[] = [
      {
        key: "recent",
        label: "Recent",
        categories: recentCategoryIds
          .map((id) => byId.get(id))
          .filter((c): c is Category => Boolean(c)),
        emptyMessage: "Nothing yet — your latest entries' categories will show here.",
      },
      {
        key: "favorite",
        label: "Favorite",
        categories: active.filter((c) => c.is_favorite),
        emptyMessage:
          "No favorites yet. Star categories under More → Categories.",
      },
    ];

    for (const group of groups) {
      if (group.archived) continue;
      const children = members
        .filter((m) => m.group_id === group.id)
        .map((m) => byId.get(m.category_id))
        .filter((c): c is Category => Boolean(c));
      if (children.length === 0) continue;
      result.push({
        key: `group-${group.id}`,
        label: group.name,
        categories: children,
        emptyMessage: "This group is empty.",
      });
    }

    // "All" keeps kinds together so a long mixed list still scans.
    const all = [...active].sort(
      (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
    );
    result.push({
      key: "all",
      label: "All",
      categories: all,
      emptyMessage: "No categories yet. Add one under More → Categories.",
    });

    return result;
  }, [categories, groups, members, recentCategoryIds]);

  const activeTab = tabs.find((t) => t.key === tabKey) ?? tabs[0];

  useLayoutEffect(() => {
    if (!open) {
      setPill(null);
      return;
    }
    const el = tabRefs.current.get(tabKey);
    if (!el) return;
    setPill((prev) => ({
      left: el.offsetLeft,
      width: el.offsetWidth,
      animate: prev !== null,
    }));
  }, [open, tabKey, tabs]);

  // --- Steps -----------------------------------------------------------------
  // The category decides everything: its kind IS the transaction type, which decides
  // whether the wallet step asks where the money came from or where it landed.
  const selected = categoryId
    ? categories.find((c) => c.id === categoryId) ?? null
    : null;
  const type: TxnType | null = selected ? selected.kind : null;
  const walletIsDest = type === "income";

  const showWalletStep = selected !== null;
  const detailsReady =
    selected !== null &&
    (walletIsDest ? destWalletId !== null : sourceWalletId !== null);

  function chooseCategory(id: number) {
    setCategoryId(id);
    // A different category may flip the wallet direction — downstream answers are stale.
    setSourceWalletId(null);
    setDestWalletId(null);
  }

  const amountText = amount || "0";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Add a transaction"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-ink-900/40"
          />

          <form
            action={formAction}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] max-w-md flex-col rounded-t-[var(--radius-card-lg)] bg-white safe-bottom"
            style={{
              boxShadow: "var(--shadow-float)",
              animation: "rise 0.34s var(--ease-standard) both",
            }}
          >
            {/* Header + tabs must never shrink — when "All" overfills the sheet, flex would
                otherwise compress these fixed-height rows into the grid below. */}
            <div className="flex shrink-0 items-center gap-2 px-5 pb-2 pt-4">
              <h2 className="min-w-0 flex-1 truncate font-display text-[18px] font-bold text-ink-900">
                Add a transaction
              </h2>
              {/* Date, compact in the top-right corner. Almost always "today". */}
              <input
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                aria-label="Date"
                className="h-9 w-1/3 shrink-0 rounded-[var(--radius-button)] border-0 bg-cream-100 px-2.5 text-[13px] font-semibold text-ink-900"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-m-2 p-2 text-ink-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* --- The picker tabs, right below the date ------------------- */}
            <div
              className="shrink-0 overflow-x-auto px-5 pb-2 no-scrollbar"
              onWheel={(e) => {
                // Desktop mice only wheel vertically; steer it sideways so the row pans
                // without a visible scrollbar. Touch swiping is untouched.
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
            >
              <div
                className="relative flex w-max items-center gap-1"
                role="tablist"
                aria-label="Category lists"
              >
                {/* The one pill, sliding underneath the labels. */}
                {pill && (
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 h-[38px] rounded-full bg-forest-800"
                    style={{
                      width: pill.width,
                      transform: `translateX(${pill.left}px)`,
                      transition: pill.animate
                        ? "transform 0.28s var(--ease-standard), width 0.28s var(--ease-standard)"
                        : "none",
                    }}
                  />
                )}
                {tabs.map((tab) => {
                  const active = tab.key === activeTab.key;
                  return (
                    <button
                      key={tab.key}
                      ref={(el) => {
                        if (el) tabRefs.current.set(tab.key, el);
                        else tabRefs.current.delete(tab.key);
                      }}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTabKey(tab.key)}
                      className={`relative z-10 inline-flex h-[38px] items-center whitespace-nowrap px-4 text-[14px] transition-colors duration-200 ${
                        active
                          ? "font-semibold text-white"
                          : "font-medium text-ink-500 hover:text-forest-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
              {/* --- Step 1: pick the category from the active tab --------- */}
              <section className="mb-4">
                {activeTab.categories.length === 0 ? (
                  <p className="text-[14px] text-ink-500">
                    {activeTab.emptyMessage}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {activeTab.categories.map((category) => {
                      const active = categoryId === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => chooseCategory(category.id)}
                          aria-pressed={active}
                          className={`flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius-input)] border px-3 text-[14px] transition-colors ${
                            active
                              ? `font-semibold ${TYPE_ACCENT[category.kind].on}`
                              : "border-[var(--border-default)] bg-white font-medium text-ink-700 hover:border-forest-800 hover:text-forest-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              active ? "bg-white/70" : TYPE_ACCENT[category.kind].dot
                            }`}
                          />
                          <span className="truncate">{category.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* --- Step 2: the wallet the money left, or landed in ------- */}
              {showWalletStep && (
                <section
                  className="mb-4"
                  style={{ animation: "pop 0.22s var(--ease-standard) both" }}
                >
                  <div className="label mb-2">{walletLabel(type!)}</div>
                  {wallets.length === 0 ? (
                    <p className="text-[14px] text-ink-500">
                      No wallets yet. Add one under More → Wallets.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {wallets.map((wallet) => {
                        const active = walletIsDest
                          ? destWalletId === wallet.id
                          : sourceWalletId === wallet.id;
                        return (
                          <button
                            key={wallet.id}
                            type="button"
                            onClick={() =>
                              walletIsDest
                                ? setDestWalletId(wallet.id)
                                : setSourceWalletId(wallet.id)
                            }
                            aria-pressed={active}
                            className={`flex h-11 items-center justify-center rounded-[var(--radius-input)] border px-3 text-[14px] transition-colors ${
                              active
                                ? "border-forest-800 bg-forest-800 font-semibold text-white"
                                : "border-[var(--border-default)] bg-white font-medium text-ink-700 hover:border-forest-800 hover:text-forest-800"
                            }`}
                          >
                            <span className="truncate">{wallet.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* --- Step 3: the amount, last ------------------------------ */}
              {detailsReady && (
                <div style={{ animation: "pop 0.22s var(--ease-standard) both" }}>
                  <section className="mb-4 rounded-[var(--radius-card)] bg-cream-100 px-5 py-5 text-center">
                    <div className="label mb-2">Amount</div>
                    <div className="flex h-[48px] items-center justify-center gap-2">
                      <span className="font-display text-[18px] font-bold text-ink-300">
                        Rp
                      </span>
                      <input
                        value={amount}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setAmount(raw ? formatNumber(parseInt(raw, 10)) : "");
                        }}
                        inputMode="numeric"
                        autoComplete="off"
                        autoFocus
                        placeholder="0"
                        aria-label="Amount in rupiah"
                        style={{ fontSize: `${amountFontSize(amountText)}px` }}
                        className="w-full max-w-[240px] border-0 bg-transparent p-0 text-center font-display font-extrabold tracking-[-0.03em] text-ink-900 tabular-nums outline-none placeholder:text-ink-200"
                      />
                    </div>
                  </section>

                  <section className="mb-4">
                    <label htmlFor="sheet-description" className="label mb-2 block">
                      {type === "saving" || type === "investment"
                        ? "Note"
                        : "Description"}
                    </label>
                    <input
                      id="sheet-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional"
                      autoComplete="off"
                      className="field"
                    />
                  </section>

                  {state.error && (
                    <p
                      role="alert"
                      className="mb-4 rounded-[var(--radius-input)] bg-negative-100 px-4 py-3 text-[14px] font-medium text-negative-600"
                    >
                      {state.error}
                    </p>
                  )}

                  <SubmitButton pendingChildren="Saving…">Save</SubmitButton>
                </div>
              )}

              {/* --- Hidden inputs: the actual form payload ---------------- */}
              <input type="hidden" name="type" value={type ?? ""} />
              <input type="hidden" name="amount" value={amount} />
              <input type="hidden" name="category_id" value={categoryId ?? ""} />
              <input
                type="hidden"
                name="source_wallet_id"
                value={sourceWalletId ?? ""}
              />
              <input
                type="hidden"
                name="dest_wallet_id"
                value={destWalletId ?? ""}
              />
              <input type="hidden" name="description" value={description} />
              <input type="hidden" name="occurred_on" value={occurredOn} />
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4"
        >
          <span
            className="inline-flex items-center gap-2 rounded-full bg-forest-800 px-5 py-2.5 text-[14px] font-semibold text-white"
            style={{
              animation: "pop 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) both",
              boxShadow: "var(--shadow-float)",
            }}
          >
            {toast}
          </span>
        </div>
      )}
    </>
  );
}

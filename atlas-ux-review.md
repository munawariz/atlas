# Atlas — UX Review & Change Plan

> **Status: Implemented — 2026-08-07.** Every item below has been executed, in the order
> listed under "Suggested order of work." Notable calls made while implementing: the Add/Edit
> model gap (#2) was resolved by adding a confirmation when an edit crosses into
> transfer/withdrawal, rather than making type read-only; the dashboard's `BudgetLine` rows
> link straight into a category-filtered History instead of expanding an inline list, which
> covers both the "default open" and "drop a layer of nesting" asks in #3 at once; and the nav
> slot question (#9) was deliberately left uncoded, as the review itself asked — it needs real
> usage data, not a guess. This document is kept as-is below as the working record of what was
> found and why.

Based on a full read-through of the current implementation (not the original ATLAS.md spec or the design-system mockups, which have already diverged from what's actually built). The app is in good shape overall — thoughtful empty states, real accessibility work (aria-labels, aria-pressed/expanded, focus handling, reduced-motion), and a genuinely well-considered Add-transaction flow. The issues below are the ones worth spending time on, ordered by how much they cost a real user.

## Strengths worth keeping as-is

- The Add sheet's staged flow (category → wallet → amount, with Recent/Favorite/Group tabs and swipe-between-tabs) is a well-reasoned pattern for habitual expense entry — don't rework it without user testing first.
- Empty states are specific and actionable everywhere ("No wallets yet. Add one under More → Wallets.") rather than generic "Nothing here."
- The archive-before-delete pattern for categories/wallets/groups (`ManageRow`) is a genuinely good safety pattern.
- First-run setup (unmapped settings banner → guided Settings page with Auto-detect) is well handled.

---

## Now — safety and consistency issues

### 1. Transaction deletion has no confirmation step
**Where:** History's edit sheet (`EditSheet` → `history/actions.ts`), the single-transaction editor at `/history/[id]`, stock trades/dividends on `/stocks`, bond trades on `/bonds`, forex conversions.

Every one of these wires `Delete` straight to a `SubmitButton` with no "are you sure." Compare that to categories, wallets, groups, and paylater items, which all require archiving first and then a second explicit confirm panel before anything is destroyed. A transaction is exactly the data this app exists to protect, and it's the one thing you can wipe with a single mistap and no undo.

**Fix:** Reuse the `confirmingDelete` pattern already built for `ManageRow`/`PaylaterItemCard` — a small inline "Delete this permanently?" panel with Cancel/Delete — on every transaction-level delete button: `EditSheet`, `history/[id]/EditForm.tsx`, `ForexEditForm.tsx`, the stock trade and dividend rows on `/stocks`, the bond trade rows on `/bonds`, and both `deleteForexAccount` and `deleteForexTransaction` on `/more/forex`. This is a small, mechanical change since the confirm UI already exists as a component pattern; it just needs to be applied consistently.

Deleting a forex *account* deserves the strongest treatment of the set — it takes every conversion recorded against it with it, and unlike the others there's no per-row equivalent to rebuild from. `PaymentGrid` on `/more/loans` is **not** part of this group, for the record: its two destructive-looking buttons are "Undo collection" (reversible by design) and "Remove this month from the schedule" (already gated behind an explicit edit mode). Those are fine as they are.

### 2. Add and Edit are two different mental models, not just two field orders
**Where:** `AddSheet.tsx` vs `TxnFields.tsx` (used by `EditSheet` and `history/[id]/EditForm.tsx`).

Two separate mismatches, and the second is the significant one.

*Order.* Add is a staged wizard: category → wallet → amount last. Edit shows everything at once in the reverse-ish order: type → amount → category → wallet. Add a transaction, immediately tap it to fix a typo, and the form is laid out backwards from the one you just used.

*Model.* Deeper than layout: **Add derives the transaction type from the category you pick** (`type = selected.kind` — pick "Groceries," you've implicitly said expense), and deliberately offers only the four recording types. **Edit exposes type as an explicit six-option pill row**, including transfer and withdrawal. So the editor can turn an expense into a transfer — a transformation the Add flow has no way to express, and which silently invalidates the category you originally chose. Two different theories of what a transaction *is*, one screen apart.

**Fix:** Align the order first (cheap, and it's most of the perceived inconsistency). On the model gap, decide deliberately rather than by drift: either Edit keeps the full type row and gets an explicit confirmation when a change crosses into transfer/withdrawal territory (since it rewrites which fields even apply), or type becomes read-only in Edit and re-typing a transaction means deleting and re-adding it. Either is defensible; the current state isn't a decision, it's two components that grew apart.

---

## Next — friction in daily-use pages

### 3. Dashboard: too many independent collapsed things, and one nested pair
**Where:** `/dashboard`, "Budget vs actual" section and the Overview tab generally.

To be precise about the nesting (I overstated this on the first pass): `BudgetCard` is a plain `div` and `TxnList` is a plain `<ul>`, so the only genuinely nested case is an *on-track* expense row, which sits behind two taps — `<details>` "Show all (N on track)" → `<details>` `BudgetLine`. Over/near rows are one tap. That's not egregious on its own.

The real weight is horizontal, not vertical: the Overview tab holds "Spent this day" (`<details>`), one `<details>` per daily-budget row, one `<details>` per budget line across three `BudgetCard`s, plus `SpendBreakdown`'s tap-to-isolate legend — a dozen-plus independently collapsed affordances on one screen, each needing its own tap. Opening the app first thing shows mostly closed rows rather than the two numbers that actually matter (am I over, and on what).

**Fix:** Change defaults rather than structure. Expense rows over or near their limit should render already-expanded — they're the ones demanding attention — while on-track rows stay behind the existing "Show all." And drop the third layer entirely by replacing the inline `TxnList` inside `BudgetLine` with a link into History filtered to that category.

**Prerequisite worth knowing:** that link isn't a one-liner today. `HistoryClient` holds its filters in React state seeded from `sessionStorage`, and `history/page.tsx` only accepts `?m=`. There is no URL-param path into a category filter, so this needs History to read `type`/`category` from `searchParams` first (which is independently worth doing — it also makes a filtered view shareable and back-button-able).

### 4. Charts have no way to read an intermediate value
**Where:** `ChartsClient.tsx` — Net worth and Cash flow line charts.

Both are hand-rolled SVG paths with only a start/end month label underneath. There's no tooltip, no gridlines, no way to tap a point on the line and see "March: Rp 12.4M." The category breakdown and category-over-time charts *do* support drill-down/tap interaction — the two line charts are the odd ones out, and they're also the two most likely to prompt "wait, what happened in that dip."

**Fix:** Add a tap/drag crosshair on both line charts that shows month + value in a small floating label, mirroring the interaction style already used for the breakdown donut (tap to isolate, values appear). Doesn't need a charting library — it's a hit-test against the existing point array plus one more SVG group.

### 5. Categories page: add-then-scroll, no filter for long lists
**Where:** `/more/categories`.

The "Add a category" form sits between the Groups section and the four kind-sections, so adding one means scrolling down to find it, several sections later, dimmed in with everything else once archived. There's no search and no "hide archived" toggle — for an account that's been used for a year, this page will be a long scroll of mixed active/archived rows with no way to narrow it.

**Fix:** Two changes: (a) let the add-category form live inline at the top of each kind-section (it already knows the kind — no reason to force a scroll-and-find round trip), or keep one global add form but auto-scroll/highlight the new row on success; (b) add an "Archived" filter chip that hides archived categories by default, matching how History already treats filters as a first-class UI element.

### 6. Route loading skeleton doesn't match any real page
**Where:** `app/(app)/loading.tsx`.

The Suspense fallback is three generic 28-unit pulsing cards for every route — dashboard, settings, charts, categories, all the same three grey blocks. Since none of these pages actually look like three stacked cards, there's a visible layout jump the moment real content streams in (heights, columns, and card counts all differ from the skeleton).

**Fix:** Not worth a full per-route skeleton for every page, but at least differentiate by rough shape: a hero-card + list skeleton for data pages (dashboard, stocks, bonds, savings), vs a simple header + form skeleton for settings-style pages. Even a rough match reduces the jump a lot more than a one-size-fits-all block.

---

## Later — polish and discoverability

### 7. Budget-related data is split across three destinations
**Where:** Dashboard's "Budget vs actual" tab, `/more/budgets` (editing), `/more/cashflow` (forward-looking plan).

These are conceptually distinct (actual-vs-limit this month / edit the limits / what the plan predicts for the month), but a user trying to answer "am I on track" may not know which of the three to open, and cross-links between them are one-directional and only appear in edge cases (e.g., dashboard only links to Budgets when a category has nothing set). Not a bug, but worth an explicit link from the Budgets page header to Expected Cashflow and vice versa, so the three read as one feature with three views rather than three separate features.

### 8. No fast path for repeat entries — and the half-built one is dead code
**Where:** `AddSheet.tsx`, `TxnFields.tsx`.

There's no shortcut for logging several similar transactions in a row (the daily cash lunch). The Recent tab helps with category, but wallet and amount are re-picked every time — `AddSheet`'s open effect explicitly resets all of it.

Worth knowing before you build one: **a sticky-defaults mechanism already exists and is entirely dead.** `TxnFields` carries a `persist` prop that restores the last type and both wallets from `localStorage.ft_last`. Nothing ever passes it. Its only consumers are `EditSheet` and `history/[id]/EditForm.tsx`, both of which pass `initial` and omit `persist`, so it defaults to `false` — meaning `ft_last` is never written and never read anywhere in the app. Roughly 35 lines of effect logic, plus the StrictMode `hydrated` guard protecting it, run for nothing.

**Fix:** Either delete it, or — better — port the idea to where it was always meant to live. `AddSheet` is the flow that would benefit, and it's the one place the key's name (`ft_last`) suggests was the original intent. A "repeat last" affordance (long-press the nav Add button, or a first chip in the Recent tab) pre-filling category + wallet + amount from the most recent matching entry would land naturally on top of it. Don't leave it as-is: dead code that *looks* live is how a future change ends up "fixing" a feature nobody is running.

### 9. Bottom nav's "Move" slot vs. ATLAS.md's original "Budget" slot
**Where:** `BottomNav.tsx`.

The implementation swapped the spec's 4th tab-bar slot from Budget to Move (transfer/withdraw). That's a reasonable call if transfers are frequent, but it does mean Budgets — a core feature — is now two taps deep (More → Budgets) while a comparatively rarer action (Move) sits in the primary nav. Worth confirming this against actual usage rather than treating it as settled; if Budgets turns out to be opened often, it may deserve the more prominent slot back.

---

## Additional findings (verification pass)

### 10. Privacy masking works on 13 pages; the toggle exists on 5
**Where:** `PrivacyToggle` vs `.privacy-scope`. Belongs in the "Now" tier — it's small and it defeats an existing feature.

Thirteen pages wrap their content in `.privacy-scope` so amounts mask correctly. Only five render a `PrivacyToggle`: dashboard, savings, stocks, bonds, forex. The eight that mask but offer no control are **history, charts, more/budgets, more/cashflow, more/loans, more/paylater, balances, and stocks/targets**.

History is the glaring one — it's the most amount-dense screen in the app, and it's the screen you'd hand to someone to show them a specific entry. To hide amounts there you must navigate to Dashboard, toggle, and navigate back. The masking is CSS-driven off a class on `<html>`, so the state is genuinely global and already works everywhere; only the control is missing.

**Fix:** Cheapest correct answer is to stop putting the toggle on pages individually and hoist it into the app header in `app/(app)/layout.tsx`, next to the "Account" link. It's global state with a global effect — a per-page control was always the wrong shape for it. That single move covers all thirteen and removes the five scattered instances.

### 11. Dashboard runs a query it never uses
**Where:** `app/(app)/dashboard/page.tsx`, the `Promise.all` at the top.

`installmentAutoBudgets(monthKey)` is awaited into `installmentAuto`, which is then referenced nowhere in the file. (`loanAuto` and `itemActiveIn` from the same import *are* used — this is specifically the one result that's dead.) `currentMonthKey` is likewise imported and unused.

This is the app's home screen, it's `force-dynamic`, and that helper walks installment items and payments to build per-category budgets — so it's a real query on every single dashboard load, discarded. Not a UX issue in itself, but it's paid on the most-visited route in the app, and it's a one-line deletion.

## Deep dive: Stocks, Bonds, Forex

You're right that these three feel heavier than the rest of the app — and having read all three closely, there's one root cause behind most of it, plus a couple of page-specific issues.

### Root cause: entry forms live permanently inline, instead of behind a trigger

Everywhere else in Atlas, recording something is a deliberate action: tap Add or Move, a sheet rises over the current screen, you fill it in, it closes. The page underneath stays a clean read surface. Stocks, Bonds, and Forex don't follow that — `StockTradeForm`, `StockDividendForm`, `BondTradeForm`, and `ForexConvert` are all rendered directly in the page body, permanently expanded, interleaved with the read-only portfolio data. On `/stocks` specifically, that means the scroll order is: hero → **full trade form** → targets banner → holdings → **full dividend form** → dividend summary → dividend log → recent trades. Someone who opens the page just to check portfolio value has to scroll past two complete forms to get there, every single time.

This is the actual source of "overwhelming" — it's not that there's too much data, it's that permanently-open forms are competing for space with it. **Fix:** convert `StockTradeForm`, `StockDividendForm`, `BondTradeForm`, and `ForexConvert` into sheet-triggered flows using the same pattern as `AddSheet`/`MoveSheet` — a compact "Record a trade" / "Log dividend" / "Convert" button that opens a bottom sheet, rather than an always-expanded form taking up permanent scroll space. This is mechanical (the sheets already exist as a pattern to copy) and would cut each page's resting length by something like a third to a half.

### Stocks specifically: four distinct concerns stacked in one scroll, with no tabs

`/stocks` is doing portfolio overview, trade entry, dividend entry + log, recent-trades history, and (via a banner) monthly buy targets — five concerns on one page. Compare this to `/dashboard`, which has a comparable amount of content but solves it with `StatsTabs` (Overview / Installments / Saving, switched instantly since all three are pre-rendered). Stocks never got the same treatment.

**Fix:** once the forms move into sheets (above), split what's left into two or three tabs using the same `StatsTabs`/`PillSwitcher` component already proven on the dashboard — e.g. **Portfolio** (hero + holdings), **Activity** (dividend log + recent trades merged into one chronological feed instead of two separate lists), and either fold Targets in as a section of Portfolio or leave it linked out as it is now. This reuses an existing, working pattern rather than inventing new UI.

### Forex: the per-currency card repeats its heaviest content by default

Each currency renders a 6-row stat `<dl>` (Invested / Value now / Gain-loss / Realized P/L / Live rate / Average rate) plus the full Convert form, open by default, for every currency you hold. Two or three currencies means two or three of those stacked in full. Notice that `holdings` on the Stocks page already solved this exact problem with a collapsed `<details>` summary (ticker + balance + value, one line) that expands to the detail grid — Forex's cards should get the same treatment: a one-line summary (name, balance, value, gain) by default, expanding to the stat grid + Convert + "Correct the balance" only on tap. Combined with moving Convert into a sheet, a 3-currency Forex page would go from three full cards to three compact rows.

### Bonds is actually the right size — use it as the reference

`/bonds` (hero → trade form → holdings → recent activity) is the leanest of the three, because it never accumulated the extra concerns (dividends, targets, per-item corrections) that Stocks and Forex have. Once its trade form also moves into a sheet, it's a good template for how compact the other two should feel.

### Same missing-confirmation issue, concentrated here

Worth re-flagging in this context specifically: stock trades, stock dividends, bond trades, and forex conversions/accounts all delete on a single tap with no confirmation (see item #1 above). These are also the densest lists in the app — a recent-trades list of 20 rows, a dividend log, a forex history grouped by month — so the odds of a stray tap landing on a delete icon instead of the row next to it are higher here than almost anywhere else in the app.

---

## Suggested order of work

All items complete as of 2026-08-07 — see the status note at the top of this document.

- [x] 1. **Confirm-before-delete on every transaction-level delete (#1).** Safety, mechanical, the confirm UI already exists. Forex account deletion first.
- [x] 2. **Hoist `PrivacyToggle` into the app header (#10).** One move fixes eight pages and deletes five scattered instances.
- [x] 3. **Investment pages: entry forms into sheets (Deep dive).** Biggest single readability win in the app, and pure reuse of `AddSheet`'s pattern. Do this before the Stocks tab split — it's most of the benefit for less of the work, and it changes what's left to organize.
- [x] 4. **Align Add/Edit ordering (#2), default-expand over-budget rows (#3).** UI-only changes to existing components. (Implemented as a direct link into filtered History rather than an in-place expand — see status note.)
- [x] 5. **Stocks tab split + Forex card collapse (Deep dive).** Now that the forms are gone, organize what remains.
- [x] 6. **History URL-param filters** — prerequisite for #3's drill-down link, independently useful (shareable, back-button-able filtered views).
- [x] 7. Charts crosshair/tooltip (#4); Categories add-inline + archived filter (#5).
- [x] 8. Loading skeleton differentiation (#6), once the above settles the shapes it should mimic.
- [x] 9. Resolve the `TxnFields.persist` dead code (#8) — delete it or port it to `AddSheet`; don't leave it looking live. (Ported: `AddSheet` now offers "Repeat last.")
- [x] 10. Drop the unused dashboard query (#11) whenever that file is next open.
- [x] 11. Cross-links (#7) as polish. Revisit the nav slot question (#9) with real usage data, not as a code change. (Cross-links added; nav slot intentionally left uncoded.)

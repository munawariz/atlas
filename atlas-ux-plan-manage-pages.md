# Atlas — UX & Copy Plan: Categories, Installments, Lending, Budgets

> **Status: planned, not implemented.** Nothing in this document has been coded. It is the
> companion to `atlas-ux-review.md` (all implemented 2026-08-07), covering the four `/more`
> management pages that round of work left largely untouched. Two naming decisions were taken
> up front and are treated as settled throughout: **"Installments"** replaces the four competing
> names for that feature, and **"Lending"** replaces "Loans" as the label for money owed *to*
> you. Everything else is a proposal with a cost tag.

**Scope:** `/more/categories`, `/more/paylater`, `/more/loans`, `/more/budgets` — and the
components they own: `ManageRow`, `CategoryControls`, `GroupControls`, `PaylaterItemCard`,
`PaymentGrid`, `BudgetRow`.

**Cost tags:** **S** = under an hour, strings and classes. **M** = component restructure, no new
queries. **L** = new data or a new shared component.

---

## Why these four pages read as less finished than the rest of the app

The last review round fixed the loud problems — deletes without confirmation, entry forms
squatting on investment pages, a privacy toggle that only existed on five of thirteen masked
screens. It worked page by page down the list of what hurt most, and these four sat below the
cut line.

What's left isn't a list of unrelated small bugs. It's that **the four pages were written at
different times, and each one invented its own answer to the same handful of questions**: where
does the add form live, how do you show a schedule, what does the page put at the top, how do
you tell the user something went wrong. Individually every answer is defensible. Together they
mean that moving between Categories, Installments, Lending and Budgets feels like moving between
four apps that share a colour palette.

The copy has the same shape of problem. The *voice* is good and consistent — direct, second
person, explains consequences rather than just naming actions ("Past transactions keep their
history but lose this label" is a genuinely well-written confirmation). What's inconsistent is
the *vocabulary*: the same concept gets a different word on each page, and a handful of strings
leak internal implementation names to the user.

So this plan is organised as: cross-cutting decisions first (six of them, and they resolve most
of the per-page items automatically), then a page-by-page pass, then a copy style guide to stop
the drift recurring.

---

## Part 1 — Cross-cutting

### C1. One feature, four names — and one word pointing the wrong way

**Cost: S. Do this first; several later items depend on the vocabulary being settled.**

The installments feature is currently called four things in user-visible text:

| Where | String |
|---|---|
| `more/paylater/page.tsx` H1 and `metadata.title` | "My Installment" |
| `more/page.tsx` hub row label | "My Installment" |
| `more/page.tsx` hub row hint | "Inst**a**lments and what is due" (British spelling) |
| Dashboard `StatsTabs` | "Installments" |
| `CategoryControls` toggle title | "…tracked on the Installments **tab**" |
| Route | `/more/paylater` |

Five strings, four spellings, and one of them describes the page as a "tab" when it is a route.
Meanwhile `README.md` and `ATLAS.md` both use "Installments" in prose, so the docs and the UI
already disagree.

**Decision: "Installments" — plural, US spelling, no possessive — in every user-visible string.**
US spelling because `LOCALE = "en-US"` is the project's stated language constant and `Rp` is a
currency, not a language choice (`README.md` § Language). The route stays `/more/paylater`:
renaming it buys nothing a user can see and breaks any bookmark or home-screen shortcut.

Second half of the same problem: **"Loans"**. In ordinary use, "a loan" is money you *borrowed*.
On this page it means money someone owes *you* — a receivable — and it sits one row below "My
Installment" in the More hub, which is money you owe. Two adjacent rows, opposite directions,
and the labels give you no way to tell which is which without opening them. The hero copy ("Still
owed to you") does the disambiguating work, but it's two taps too late.

**Decision: "Lending".** Nav label and H1 both become "Lending". The hero keeps "Still owed to
you" verbatim — it's already the clearest string on the page. "Owed to you" was considered as
the page title and rejected as too long for a hub row and awkward as an H1.

Strings to change:

| File | Current | Proposed |
|---|---|---|
| `more/paylater/page.tsx` | `metadata: "My Installment · Atlas"` | `"Installments · Atlas"` |
| `more/paylater/page.tsx` | H1 `My Installment` | `Installments` |
| `more/loans/page.tsx` | `metadata: "Loans · Atlas"` | `"Lending · Atlas"` |
| `more/loans/page.tsx` | H1 `Loans` | `Lending` |
| `more/page.tsx` `MANAGE` | `"My Installment"` / `"Instalments and what is due"` | `"Installments"` / `"What you owe each month"` |
| `more/page.tsx` `MANAGE` | `"Loans"` / `"Money other people owe you"` | `"Lending"` / `"Money other people owe you"` |
| `more/page.tsx` `MANAGE` | `"Installment providers"` / `"Card, paylater, store credit"` | keep both — already correct |
| `CategoryControls.tsx` | `"…tracked on the Installments tab."` | `"…tracked on the Installments page instead."` |

While in `more/page.tsx`: the Categories hint reads **"Names, cadence, installment flags"** —
three internal field names in a row. Propose **"What your transactions get labelled with"**.

---

### C2. Three different shapes for "add a thing", across four sibling pages

**Cost: M.**

| Page | How you add |
|---|---|
| Categories | Five permanently-open inline forms (one for groups, one per kind) |
| Installments | `<details>` collapsed block, "Add an installment" |
| Lending | `<details>` collapsed block, "Add a loan" |
| Budgets | No add — budgets attach to existing categories |

The last review round established the answer for this app and applied it to Stocks, Bonds and
Forex: **entry forms belong behind a trigger, in a `FormSheet`.** The reasoning in
`FormSheet.tsx`'s own doc comment is exactly as applicable here — "everywhere else in Atlas,
recording something is a deliberate action: tap a button, a sheet rises over the current screen,
fill it in, it closes." These two pages simply weren't in scope that round.

`<details>` is the worst of the three options, and it's the one used on both money pages:

- The `<summary>` renders as plain 15px semibold text with **no chevron and no button
  affordance**. Compare `more/page.tsx`, where the "Investment" `<details>` *does* get a
  `.chevron` glyph. On Installments and Lending, "Add an installment" and "Add a loan" look
  like section headings. There is nothing to tell you they open.
- Opening one pushes the entire list below it down by 300-plus pixels, so the content you were
  looking at moves out from under your thumb.
- No focus trap, no Escape to close, no scroll lock, no dimmed backdrop — all of which
  `FormSheet` already handles.

**Proposal:**

- **Installments and Lending** → replace the `<details>` with a `FormSheet`. The forms move
  verbatim; only the wrapper changes. `FormSheet` takes `triggerLabel` and `title`, renders a
  `btn btn-outline w-full` trigger, and handles the rest. This is close to mechanical.
- **Categories** → keep the forms inline. `atlas-ux-review.md` #5 deliberately put them there so
  the form sits in the section that already knows its `kind`, and that reasoning still holds.
  But five always-open white boxes is a real cost: the page's resting state is roughly 400px of
  empty form chrome before you reach a single category. **Propose a middle path:** render each
  add-form collapsed as a single-line ghost row — `+ New expense category` — that expands
  *in place* on tap. Same zero-scroll benefit, a fifth of the resting weight, and no `<details>`
  semantics (use a `useState` toggle with a real `<button>`, matching how `BudgetRow` already
  expands).

---

### C3. Silent failure is the default across all four pages

**Cost: M. This is the item with the widest blast radius.**

Of every server action reachable from these four pages, **exactly one** returns an error the
user can see: `collectLoanMonth`, which returns a typed `{ error }` that `PaymentGrid` renders in
a `role="alert"` panel. It is a good implementation. Nothing else follows it.

Everything else `return`s silently on invalid input:

| Action | Silent failure case | What the user sees |
|---|---|---|
| `addCategory` | Empty name, or a `kind` not in `KINDS` | Nothing. Form appears to submit. |
| `addGroup` | Empty name | Nothing. |
| `addGroupMember` | No `category_id` | Nothing. |
| `deleteCategory` / `deleteGroup` | Row is not archived → refuses | Nothing. Confirm panel closes, row stays. |
| `addPaylaterItem` | Backwards month range | Item is created, then **never appears** — `itemActiveIn` filters it out of every month. |
| `addLoan` | Invalid input | Nothing. |

The `addPaylaterItem` one is the worst of the set, and it is deliberate — the source comment
says so: *"A backwards range would make the item permanently inactive rather than erroring."*
Set "Last month" to a date before "First month" and Atlas writes a row you can never see, reach,
or delete from the UI. That is a data-loss-shaped bug wearing a UX costume.

There is also **no success feedback anywhere on these four pages**. Add a category and the new
row appears somewhere below the fold in its kind section; add a loan and the new card appears
below a still-open `<details>`. `atlas-ux-review.md` #5 already flagged the add-then-scroll
problem for Categories and proposed "auto-scroll/highlight the new row on success" as the
alternative to the inline forms. Since the inline forms were the option taken, the highlight was
never built — and it's still the missing half.

**Proposal, in three parts:**

1. **Give every add/mutate action a typed return.** Match the shape `collectLoanMonth` already
   uses: `{ ok?: true; error?: string; nonce?: number }`. This is the single highest-value change
   in the plan, because it unblocks parts 2 and 3 and makes the four pages honest.
2. **Render errors inline, near the field**, in the `role="alert"` panel style `PaymentGrid`
   already ships (`bg-negative-100`, 13px, `text-negative-600`). Do not add a toast system — the
   app doesn't have one and doesn't need one for this.
3. **Validate the installment month range client-side and server-side.** Client: disable the
   submit and show `Last month can't be before the first.` under the pair. Server: reject with
   the same string. Separately, `addPaylaterItem` should be fixed to reject rather than write an
   unreachable row — and a one-off check for rows already in this state is worth running.

Proposed error strings (they should sound like the rest of the app — say what to do, not what
failed):

| Action | Error copy |
|---|---|
| `addCategory` empty name | `Give the category a name.` |
| `addGroup` empty name | `Give the group a name.` |
| `addPaylaterItem` backwards range | `Last month can't be before the first.` |
| `addPaylaterItem` no amount | `Enter the monthly amount.` |
| `addLoan` no person | `Enter who owes you.` |
| `addLoan` no amount | `Enter the monthly amount.` |
| `deleteCategory` not archived | `Archive it first — that's what makes deleting deliberate.` |

---

### C4. Schedule chips: identical look, opposite affordance, both untappable-by-standard

**Cost: M. Contains the plan's only WCAG-level failures.**

Installments and Lending both render a per-month chip strip. They look the same. They are not:

| | Installments (`PaylaterItemCard`) | Lending (`PaymentGrid`) |
|---|---|---|
| Element | `<span>` — **not interactive** | `<button>` with `aria-pressed` |
| Size | `px-2 py-0.5 text-[11px]` → ~20px tall | `px-2.5 py-1 text-[11px]` → ~26px tall |
| Paid state | `bg-lime-200 text-forest-800` | `bg-lime-200 text-forest-800` |
| Unpaid state | `bg-cream-200 text-ink-500` | `bg-cream-200 text-ink-500` |
| Current month | `bg-warning-100 text-warning-600` | — no equivalent |
| How you learn the state | `title` attribute only | Colour only |

Three separate problems:

**(a) Colour is the only carrier of meaning.** Paid vs unpaid is lime vs cream and nothing else.
The `title` attribute on the installment chips is the only textual fallback, and `title` does
not exist on touch — which is the app's primary target. This is the skill database's priority-1
Accessibility rule and its priority-10 "never rely on colour alone" rule at once. **Fix:** add a
non-colour token to the paid state — a `Check` glyph before the month label is the smallest
change that works and the icon is already imported in `components/icons`.

**(b) Touch targets.** 20px and 26px against a 44×44 minimum. On Lending these are the *primary
interaction on the page* — tapping a month is how you collect it. **Fix:** raise both strips to
a minimum 44px hit area. The chip can stay visually small if the padding does the work
(`min-h-11` with the label vertically centred), so this needn't cost layout.

**(c) The strips do different things while looking identical.** On Lending, tapping a month opens
its collect/undo panel. On Installments, tapping does nothing at all. A user who learns the
gesture on one page will tap uselessly at the other. **Fix — pick one:**

- *Preferred:* make the installment strip interactive too, so a past month can be corrected
  without hunting. The actions already exist (`payPaylaterMonth`, `unpayPaylaterMonth` both take
  an arbitrary `month`); only `PaylaterItemCard`'s "this month only" gating stands in the way.
- *Cheaper:* make it visibly non-interactive — smaller, lower contrast, no chip shape. Then it
  reads as a progress meter, which is what it currently is.

**(d) Long schedules dominate their card.** A 24-month installment renders 24 chips across four
wrapped lines, above a card whose actual content is three lines. Lending has the same shape but
also has a progress bar, so the chips are redundant there in a way they aren't on Installments.
**Fix:** give Installments the progress bar Lending already has (`% paid`, same markup), promote
it to the primary indicator, and put the chip strip behind a `Show schedule` disclosure. Cards
with a schedule of 3 or fewer months can render the chips inline, since they cost nothing.

**(e) On Lending, the collect panel opens below the whole strip.** Tap January on a 24-month
loan and the form appears four wrapped rows further down — frequently off-screen, with no
`scrollIntoView` and no focus move. **Fix:** move focus to the panel's first control on open and
`scrollIntoView({ block: "nearest" })`.

---

### C5. Four sibling pages, four different things at the top

**Cost: S–M.**

| Page | Top of page |
|---|---|
| Categories | H1 + a filter chip. No summary, no framing sentence. |
| Installments | H1 → `MonthSwitcher` → three equal 15px stat cards |
| Lending | H1 → a forest hero with a 32px number → filter chips |
| Budgets | H1 + a cross-link → `MonthSwitcher` → forest hero with a 30px number → chips → blurb |

Installments and Lending are exact mirrors of each other — what you owe monthly, what you're
owed monthly — and they're the two that look least alike. Lending leads with one big number in
the brand's forest hero; Installments leads with three small equal-weight cards, one of which
isn't even money.

That last detail is worth stating plainly: the Installments cards read **"Due 3"**, **"Owed
Rp 2.4M"**, **"Paid Rp 1.1M"** in three identical white boxes with identical 15px type. "Due 3"
is a *count of items* rendered in the same slot, weight and shape as two rupiah figures. The
first thing a user does is read it as money.

**Proposal:** give Installments the same forest hero as Lending, carrying the one number that
matters, with the counts demoted to a subline.

```
┌──────────────────────────────────────┐
│ LEFT TO PAY IN AUGUST                │   .label, forest-300
│ Rp 2,400,000                         │   32px display, white
│ 3 of 7 items still due · Rp 1.1M     │   13px, forest-200
│ already paid                         │
└──────────────────────────────────────┘
```

And, symmetrically, give Categories a one-line framing sentence under its H1 — it's the only one
of the four with no statement of what the page is for, and it's the one doing two distinct jobs
(groups *and* categories) in one scroll.

---

### C6. Two destructive actions still have no confirmation

**Cost: S. Ship this one on its own if nothing else gets done.**

`atlas-ux-review.md` #1 swept transaction-level deletes and built `ConfirmDeleteButton` for
exactly this. Two on these pages were missed:

**`deleteLoan` (`more/loans/page.tsx`, line ~245) is the significant one.** It is a bare
`SubmitButton` — one tap, no confirm. And it does more than delete a loan:

```ts
// loans/actions.ts, deleteLoan
const txnIds = payments.map(p => p.income_txn_id).filter(v => v != null);
if (txnIds.length > 0) await sb.from("transactions").delete().in("id", txnIds);
await sb.from("loans").delete().eq("id", id);
```

It deletes **every income transaction the loan ever booked**. A 24-month loan fully collected is
24 ledger rows gone on a single mistap, silently, with no undo — from a button sitting directly
below a schedule strip you were just tapping. Compare the treatment a *category* gets: archive
first, then a confirm panel, and even then past transactions survive.

**Fix:** `ConfirmDeleteButton` with `variant="block"`, and count the rows so the message is
specific rather than vague:

> Delete this loan? The **12 collections** recorded against it are deleted from your history too.
> This can't be undone.

**Second, smaller:** the group and category delete paths in `ManageRow` are correctly gated, but
`ManageRow` hardcodes one confirm message — *"Past transactions keep their history but lose this
label"* — and that sentence is written for categories. It is simply wrong for a group: a group
has no transactions, it has members. `ManageRow` should take the message as a prop.

> Delete **Daily life**? The group goes; the 6 categories in it are untouched.

---

## Part 2 — Page by page

### 2.1 Categories (`/more/categories`)

**What works and should not be touched:** the archive-before-delete gate, the per-kind sections
with their explanatory hints, the group chips with a kind-coloured dot, and `GroupAddSelect`'s
submit-on-change select with the snap-back to placeholder. That last one has a good reason
written next to it and it's correct.

#### UX

| # | Change | Cost |
|---|---|---|
| 1 | Collapse the five inline add-forms to single-line `+ New …` ghost rows that expand in place (C2). | M |
| 2 | Highlight and scroll to the newly added row on success — the missing half of `atlas-ux-review.md` #5. Needs C3's typed returns first. | M |
| 3 | Add a framing sentence under the H1 (C5). | S |
| 4 | **`aria-pressed` on the Archived link is invalid.** It's an `<a>`; `aria-pressed` is only defined for `role="button"`. Either give it `role="button"` (wrong — it navigates) or drop the attribute and convey state with `aria-current="page"` plus the existing `chip-on` styling. | S |
| 5 | `ManageRow`'s action cluster is up to **five** 36px-tall targets in one row (move up, move down, rename, the Archive/Restore text button, delete). All are `h-9` — under the 44px minimum — and separated by `gap-1`. On an archived group row it's the densest cluster in the app. Propose: keep rename + archive inline, move `Move up`/`Move down`/`Delete` behind a single overflow control, and raise all to 44px. | M |
| 6 | Group member chips are `<button>`s whose entire function is *remove* — but they look identical to a passive tag and the `×` is 12px. First-time users will tap one expecting to open the category. Add a 44px hit area and consider making removal a two-step (tap → chip turns red → tap to confirm) since it is not currently undoable in one action. | M |
| 7 | The `title` attributes on `CategoryFavoriteToggle` and `CategoryInstallmentToggle` carry the *only* explanation of what those toggles do — and `title` doesn't render on touch. Move both to visible section-level helper text. | S |

#### Copy

| Current | Proposed | Why |
|---|---|---|
| *(no subtitle)* | **The labels every transaction gets — and the groups shown first when you add one.** | Page does two jobs with no framing (C5) |
| "The Add sheet lists these first. A group can mix kinds — expense, income, saving and investment categories side by side." | **Shown first when you add a transaction. A group can mix kinds: expense, income, saving and investment side by side.** | "The Add sheet" is an internal component name; the user sees a `+` button |
| `placeholder="New group name"` | Visible label **Group name**, placeholder **Daily life** | Placeholder-as-label — skill priority-1 accessibility rule |
| "No groups yet. Without groups, the Add sheet lists categories by kind instead." | **No groups yet. Adding a transaction will list categories by kind instead.** | Same jargon |
| "No categories yet — add some below, then pick them into this group." | **No categories yet. Add some below, then add them to this group.** | "pick them into" |
| "Expense — Money spent." | **Expense — Money going out.** | Parallel with "Money received" |
| "Saving — Buckets you set money aside into. Held outside net worth." | **Saving — Money you set aside. Moving it into a bucket takes it out of your net worth.** | "Buckets … held outside net worth" states the model without explaining it |
| "Investment — Buckets your stocks, bonds and forex hold value in." | **Investment — Where your stocks, bonds and forex hold value. Also outside net worth.** | Same |
| `placeholder="New expense category"` + button "Add" | Ghost row **+ New expense category**, expanding to labelled field + **Add category** | Four buttons all reading "Add" |
| "3 archived — show" | **Show 3 archived** | Currently a sentence fragment with a dangling dash |
| Header chip "Archived" | **Show archived** | The bare noun doesn't say it's a toggle |
| `<span className="label">Budget</span>` on the cadence select | **Cadence** | The control sets cadence, not an amount — "Budget" here reads as the budget figure |
| Toggle "Installment" / "Not installment" | Always **Installment**, state via `aria-pressed` + fill | A pill that renames itself to its own negation is hard to parse at a glance |
| `title="Installment categories are excluded from Budget vs actual — they are fixed and tracked on the Installments tab."` | Visible helper on the Expense section: **Installment categories are excluded from Budget vs actual — they're fixed, and tracked on the Installments page.** | `title` invisible on touch; "tab" is wrong (C1) |
| `title="Favorites get their own tab in the Add sheet."` | Visible helper: **Favorites get their own tab when you add a transaction.** | Same |
| "All expense categories are archived." | **Every expense category is archived.** + link **Show archived** | Dead end with no way out shown |
| "No expense categories yet." | **No expense categories yet. Add one above.** | Empty state with no action |

---

### 2.2 Installments (`/more/paylater`)

**What works:** the per-provider grouping with a running "owed" figure per group; the "Pay all N
in *Provider*" bulk action; `PaylaterItemCard`'s delete confirmation, which correctly warns
about the ledger rows going with it; and the edit-form note about already-paid months keeping
their original amount. That last one is a genuinely subtle rule explained in one sentence.

#### UX

| # | Change | Cost |
|---|---|---|
| 1 | `<details>` add form → `FormSheet` (C2). | M |
| 2 | Three stat cards → one forest hero + subline (C5). | S |
| 3 | Add a progress bar per item; chip strip behind **Show schedule** for schedules over 3 months (C4d). | M |
| 4 | Chips get a `Check` glyph when paid, and a 44px hit area (C4a, C4b). | S |
| 5 | Decide the chip affordance — make them tappable, or make them visibly not (C4c). | M |
| 6 | Validate the month range, client and server (C3). | M |
| 7 | The **sort is invisible.** `rank()` orders by single-month-first, then most months remaining, then shortest total. It's a considered rule and the user has no way to know it exists — nor to change it. Either surface it (a `Sorted by what's closest to finishing` line) or add a simple sort chip row. | S–M |
| 8 | The provider group header shows *unpaid* total, but the group's card list shows **all** items including paid ones. A group whose header says "Rp 0 owed" still renders four cards. Add a paid count to the header: `Rp 0 owed · 4 paid`. | S |
| 9 | An item outside the visible month vanishes entirely with no trace. The `MonthSwitcher` is the only clue. Consider a `2 items finished before August` footnote so a schedule that ended doesn't just silently disappear. | M |

#### Copy

| Current | Proposed | Why |
|---|---|---|
| H1 "My Installment" | **Installments** | C1 |
| `metadata` "My Installment · Atlas" | **Installments · Atlas** | C1 |
| Stat card "Due" (a count, styled as money) | Hero subline: **3 of 7 items still due** | "Due 3" reads as an amount (C5) |
| Stat card "Owed" | Hero label **Left to pay in August** | "Owed" is ambiguous between the month and the whole schedule |
| Stat card "Paid" | Hero subline: **· Rp 1.1M already paid** | — |
| `<summary>` "Add an installment" | `FormSheet` trigger **Add an installment** | Same words, real button |
| `placeholder="What you bought"` | Label **Item**, placeholder **Phone, laptop, sofa…** | Placeholder-as-label |
| `placeholder="Monthly amount"` | Label **Per month** | Placeholder-as-label; "Monthly amount" repeats the noun |
| "First month" / "Last month" | Keep, plus helper **The month the first and last payments are due.** | Currently no explanation that these are *payment* months, not purchase dates |
| `<option>` "No provider" | **None** | The select's own aria-label already says "Provider" |
| "Nothing running in August 2026." | **No installments running in August 2026.** + **Add one and it'll show up here.** | "Nothing running" without a noun |
| Group header "Rp 800,000 owed" | **Rp 800,000 left** (and add **· 4 paid** — see UX #8) | "owed" appears three times on this page meaning two different scopes |
| "Pay all 3 in Kredivo" | Keep — good | — |
| "Book 3 expenses" | **Record 3 payments** | "Book" is accounting jargon; it's also the only place the app uses it in a button |
| "Rp 500k/mo · 4 of 12 left" | **Rp 500k/mo · 4 of 12 months left** | "4 of 12 left" — 4 of 12 *what*? |
| "Pay this month" | Keep — good | — |
| "Pay Rp 500,000" | Keep — good | — |
| "Mark paid without a transaction" | **Mark paid — don't record an expense** | States the consequence rather than the mechanism |
| "Undo this month's payment" | Keep | — |
| "Edit installment" | Keep | — |
| "Months you have already paid keep the expense they booked — only future months use the new amount." | **Months you've already paid keep the expense they created. Only future months use the new amount.** | Splits a long clause; drops "booked" |
| Delete: "Delete **X**? Every expense it booked is removed from the ledger too." | **Delete X? The 6 expenses it recorded are deleted from your history too. This can't be undone.** | Surface the actual count; "ledger" is internal vocabulary (`README.md` uses it; the UI shouldn't) |
| `title="Aug — paid"` on chips | Replace with a `Check` glyph + `aria-label="August, paid"` | `title` doesn't exist on touch (C4a) |

---

### 2.3 Lending (`/more/loans`)

**What works:** the forest hero with one clear number; the progress bar with `45% collected ·
Rp 900k of Rp 2M` underneath, which is the best single data line on any of these four pages; the
partial-collection support and the `(partial)` marker; `collectLoanMonth`'s typed errors; and the
`Edit months` mode that gates schedule removal behind an explicit toggle.

#### UX

| # | Change | Cost |
|---|---|---|
| 1 | **`ConfirmDeleteButton` on "Delete loan" (C6).** Highest priority item in the whole plan. | S |
| 2 | `<details>` add form → `FormSheet` (C2). | M |
| 3 | Chips: `Check` glyph on collected, 44px hit area (C4a, C4b). | S |
| 4 | On opening a month's panel, move focus into it and `scrollIntoView({ block: "nearest" })` (C4e). | S |
| 5 | The tab labels and the card badge disagree: tabs say **Unfinished / Finished**, the badge on a completed card says **settled**. Three words, two concepts. | S |
| 6 | `outstanding` is shown per card and `Still owed to you` in the hero — but the hero sums only *unfinished* loans while the `All` tab shows finished ones with an outstanding of Rp 0. Consistent, but worth a hero subline naming the scope: **across 3 open loans**. | S |
| 7 | No `MonthSwitcher`, unlike Installments — correct, since a loan shows its whole schedule at once. Worth a comment in the code so a future pass doesn't "fix" it. | S |
| 8 | The partial-amount field's placeholder is the only thing explaining that leaving it blank collects the full amount. If a user types over it, the explanation is gone. Move it to a helper line. | S |

#### Copy

| Current | Proposed | Why |
|---|---|---|
| H1 "Loans" | **Lending** | C1 |
| `metadata` "Loans · Atlas" | **Lending · Atlas** | C1 |
| Hero "Still owed to you" | Keep — best string on the page | — |
| Hero blurb "Money other people owe you, collected month by month." | Keep, append **· across 3 open loans** as a scope line | UX #6 |
| Tabs "Unfinished / Finished / All" | **Open / Settled / All** | Matches the `settled` badge already on the card (UX #5); "Unfinished" is a negation |
| `<summary>` "Add a loan" | `FormSheet` trigger **Add a loan** | — |
| `placeholder="Who owes you"` | Label **Who owes you**, placeholder **A name** | Placeholder-as-label |
| `placeholder="Via / lender (optional)"` | Label **Via**, placeholder **Optional — a shop, platform or middleman** | **"lender" is backwards** — on this page *you* are the lender |
| `placeholder="Monthly amount"` | Label **Per month** | — |
| Label "# months" | **Months** | `#` is developer shorthand |
| "Add loan" | Keep | — |
| "Nobody owes you anything yet." | **Nobody owes you anything yet.** + **Add a loan to start tracking one.** | Good line, no next step |
| "No finished loans." | **Nothing settled yet.** | Follows the tab rename |
| "No unfinished loans." | **Nothing open — everything's been collected.** | Turns a dead end into good news |
| Card label "outstanding" | **still owed** | Matches the hero's vocabulary; "outstanding" appears nowhere else in the app |
| "45% collected · Rp 900,000 of Rp 2,000,000" | Keep — good | — |
| "Schedule" / "Edit months" / "Done" | Keep | — |
| MoneyInput `placeholder="Rp 500,000 (full)"` | Helper line: **Leave blank to collect the full Rp 500,000.** | Placeholder vanishes on type (UX #8) |
| "Collect" | Keep | — |
| "Aug collected — Rp 300,000 (partial)" | Keep — good | — |
| "Undo collection" | Keep | — |
| "Remove this month from the schedule" | Keep | — |
| "Delete loan" (bare) | `ConfirmDeleteButton`: **Delete this loan? The 12 collections recorded against it are deleted from your history too. This can't be undone.** | C6 |
| `aria-label="Received in wallet"` | Keep | — |

---

### 2.4 Budgets (`/more/budgets`)

**What works:** the negative-cashflow hero flipping to `bg-negative-100` with copy that says what
to *do* about it ("Trim a limit or raise a target") is the best piece of writing in the app. The
three scope options with per-scope hints are well constructed. The auto rows and their `note`
explain themselves. Keep all of it.

#### Bug found in passing

**`BudgetRow.tsx` line 88 renders the label "Per dai" for a daily budget.**

```ts
{period === "yearly" ? "Whole-year limit" : `Per ${period.replace("ly", "")}`}
```

`"daily".replace("ly", "")` → `"dai"`. `weekly` → `week` and `monthly` → `month` happen to work,
which is why it survived. Any category on a daily cadence shows **Per dai** above its amount
field. Replace the string surgery with an explicit map:

```ts
const AMOUNT_LABEL: Record<BudgetPeriod, string> = {
  daily:   "Per day",
  weekly:  "Per week",
  monthly: "Per month",
  yearly:  "Whole-year limit",
};
```

#### UX

| # | Change | Cost |
|---|---|---|
| 1 | Fix "Per dai". | S |
| 2 | **The hero and the header link are both called "Expected cashflow."** The header's `Expected cashflow →` navigates to `/more/cashflow`; the hero directly below says `Expected cashflow /mo` and is a number. Two different things, one name, 40px apart. Rename the hero (copy table below). | S |
| 3 | **The page shows no actuals.** You're setting a limit for Groceries with no idea what you spent last month. The dashboard has that context; this page — where the decision is actually made — does not. Add last month's actual (or a 3-month average) as a subline per row: `Last month: Rp 1.2M`. Needs a new query, hence **L**, but it is the change that turns this from a data-entry form into a decision surface. | L |
| 4 | Every category renders a row, budgeted or not, in category order. With 30 categories that's 30 rows and no way to narrow. Propose sorting set-budget rows above unset, or a `Only budgeted` filter chip matching the Categories page's `Show archived`. | M |
| 5 | The 3-paragraph footer is at the very bottom of a long scroll and duplicates content: its **Scope** paragraph restates the per-scope hints already shown inline inside `BudgetRow`. Cut the Scope paragraph; put **Cadence** and **Auto rows** behind a `How budgets work` disclosure near the top, where a confused user actually is. | S |
| 6 | `BudgetRow`'s whole header is one `<button>` containing name, cadence and amount — correct — but there's no chevron or any other affordance saying it opens. Add one, matching `more/page.tsx`'s `.chevron`. | S |
| 7 | An auto row is a `<div>` styled almost identically to a `BudgetRow` but silently does nothing when tapped. The `auto` badge is the only distinction, at 11px. Make the non-interactivity visible — flatter ground, no chevron, and a `Set from your schedule` line. | S |

#### Copy

| Current | Proposed | Why |
|---|---|---|
| Hero label "Expected cashflow /mo" | **Left over each month** | Collides with the link right above it (UX #2) |
| Hero blurb "Planned income, less planned expense and saving." | Keep | — |
| Negative blurb "Your plan spends more than it earns. Trim a limit or raise a target." | Keep — best line in the app | — |
| Header link "Expected cashflow →" | Keep | — |
| Tab blurbs ("A limit. Going over is what the dashboard warns you about." etc.) | Keep all three | — |
| Amount label `Per ${period.replace("ly","")}` | Explicit map — **Per day / Per week / Per month / Whole-year limit** | Renders "Per dai" today |
| Unset amount `—` | **Not set** | An em dash is not a state |
| Scope "This month →" | **From this month on** | A trailing arrow inside a pill reads as navigation |
| Scope "This month only" | Keep | — |
| Scope "All months" | **Every month** | Parallel with the other two |
| Scope hints | Keep all three | — |
| "Save budget" | Keep | — |
| "Cadence" | Keep | — |
| "Revert to the recurring rule" | **Remove this month's override** | Says what happens, not what you return to |
| Badge "auto" | **Automatic** + line **Set from your schedule — nothing to type.** | An 11px lowercase badge is the only signal this row is different |
| "No expense categories yet." | **No expense categories yet.** + link **Add one in Categories →** | Dead end |
| Footer "Cadence." paragraph | Keep, move into a `How budgets work` disclosure | UX #5 |
| Footer "Scope." paragraph | **Cut** — duplicates the inline scope hints | UX #5 |
| Footer "Auto rows." paragraph | Keep, move into the same disclosure | UX #5 |

---

## Part 3 — Copy style guide

The voice is already good. These are the rules it follows when it's working, written down so the
next page doesn't drift again.

1. **Say the consequence, not the mechanism.** "The 6 expenses it recorded are deleted from your
   history too" beats "This will cascade." The app already does this well in `ManageRow` and
   `PaylaterItemCard`; the rule is to keep doing it.
2. **Never name an internal component to the user.** "The Add sheet", "the ledger", "book an
   expense", "installment flags", "Budget vs actual tab" — all leak. The user tapped a `+`; they
   have no idea it's called `AddSheet`.
3. **Every empty state names the next action.** "No groups yet" is half a string. "No groups yet.
   Adding a transaction will list categories by kind instead" is whole.
4. **Placeholders are examples, not labels.** A visible `<label>` says what the field is; the
   placeholder shows what an answer looks like. `placeholder="Who owes you"` is doing both jobs
   and loses one the moment you type.
5. **Buttons name their specific action.** Four buttons reading "Add" on one page is three too
   many. "Add category", "Add group", "Add installment".
6. **One concept, one word — across all pages.** Currently: *owed* means both the month's total
   and the whole schedule's; *outstanding* and *still owed* are the same thing on different
   pages; *finished* and *settled* are the same state in two places. Pick one of each.
7. **Prefer the positive form.** "Not installment", "Unfinished", "No unfinished loans" all make
   the reader compute a negation. Use `aria-pressed` and fill for toggle state instead of
   renaming the label to its own opposite.
8. **US spelling, always** — `LOCALE = "en-US"`. "Installments", never "Instalments".
9. **Numbers get a unit or a noun.** "4 of 12 left" and "Due 3" both make the reader guess.
10. **`title` is not copy.** It doesn't render on touch, which is this app's primary target. If
    the string matters, it goes on the page.

---

## Part 4 — Suggested order of work

Ordered by cost-to-benefit, not by page. Items in a group can ship independently.

**Round 1 — safety and the free wins (all S, roughly one sitting)**

- [ ] 1. `ConfirmDeleteButton` on "Delete loan" **(C6)** — one tap currently destroys every ledger row that loan ever created, with no undo.
- [ ] 2. Fix **"Per dai"** in `BudgetRow` — a visible typo for anyone on a daily cadence.
- [ ] 3. The C1 rename sweep — "Installments" and "Lending" across 8 strings in 4 files.
- [ ] 4. Rename the Budgets hero to **Left over each month** — removes a same-name collision.
- [ ] 5. Drop the invalid `aria-pressed` from the Categories Archived link.
- [ ] 6. Lending tabs → **Open / Settled / All**, matching the badge already on the card.
- [ ] 7. `Check` glyph on paid/collected chips — removes the colour-only encoding **(C4a)**.

**Round 2 — the shape fixes (M)**

- [ ] 8. Installments and Lending add-forms → `FormSheet` **(C2)**. Mechanical; the sheet exists.
- [ ] 9. Typed error returns on every add/mutate action + inline `role="alert"` rendering **(C3)**. Do the installment month-range validation as part of this — it's the one that currently writes unreachable data.
- [ ] 10. Installments forest hero replacing the three stat cards **(C5)**.
- [ ] 11. Chip touch targets to 44px on both pages; resolve the affordance mismatch **(C4b, C4c)**.
- [ ] 12. Progress bar on installment items, chips behind `Show schedule` **(C4d)**.
- [ ] 13. Categories add-forms → expanding ghost rows **(C2)**; add the success highlight **(C3)**.

**Round 3 — polish**

- [ ] 14. The remaining per-page copy tables (Part 2) — largely independent of everything above.
- [ ] 15. `ManageRow` action-cluster overflow + 44px targets (Categories UX #5).
- [ ] 16. Budgets footer → `How budgets work` disclosure; cut the duplicated Scope paragraph.
- [ ] 17. Focus + `scrollIntoView` on the Lending collect panel **(C4e)**.
- [ ] 18. Auto rows made visibly non-interactive (Budgets UX #7).

**Round 4 — the one bigger bet (L)**

- [ ] 19. **Show last month's actual next to each budget row** (Budgets UX #3). Needs a new query and is the only item here that isn't a refactor of what's already on screen. It is also the only item that changes what the page is *for*.

---

## Part 5 — Deliberately not changing

- **The route `/more/paylater`.** Renaming it to `/more/installments` buys nothing visible and
  breaks bookmarks and home-screen shortcuts on an installed PWA.
- **`GroupAddSelect`'s submit-on-change select.** The reasoning next to it — "a picker with a
  separate commit step reads as broken on a phone" — is right.
- **The archive-before-delete gate.** Called out as a strength in the previous review and it
  still is.
- **Categories' add-forms living inside their kind section.** `atlas-ux-review.md` #5 decided
  this on purpose. This plan only proposes collapsing them, not relocating them.
- **Lending having no `MonthSwitcher`.** A loan shows its whole schedule; a month scope would
  hide most of it.
- **The Budgets scope model** (forward / month / all). It is genuinely three distinct behaviours
  and the inline hints already explain them well.
- **Adding a toast system.** The app has no global notification surface and these pages don't
  justify introducing one — inline panels near the field are both cheaper and better placed.

---

## Open questions

1. **Installment chips: interactive or decorative?** (C4c) Making them tappable means you can fix
   a mis-marked month from the card. Making them plainly decorative is half the work. This turns
   on whether you actually correct past months in practice — you'd know, I wouldn't.
2. **Is the installment `rank()` sort worth surfacing?** It encodes a real opinion (closest to
   finishing floats up). Either it's explained, or it's replaced with something the user picks.
3. **Budget actuals (item 19)** — last month's figure, or a 3-month average? The average is more
   useful for a lumpy category and more work to compute.
4. **Are there already unreachable installment rows** from the backwards-range bug (C3)? A
   `select * from paylater_items where last_month_date < first_month_date` would say. If there
   are, the fix needs a repair step, not just validation.

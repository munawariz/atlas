# Atlas Design System

Atlas is a digital-banking brand: an all-in-one mobile banking app plus the marketing site that
sells it. Its promise is money without borders — instant transfers, fee-free international
sending, cash back on a debit card, and spending analytics that a normal person can read.

This design system is built from one source, described below. Everything in it is either
**sampled from that source** or **explicitly flagged as derived / substituted**.

## Sources given

| Source | What it is | Access |
|---|---|---|
| `uploads/edf3b58ff32f0cfb59d0db7fe1340a6e.jpg` (copied to `assets/reference/atlas-marketing-reference.jpg`) | A single 1200×5787 render of the Atlas marketing home page — hero, feature grid, transfer panel, how-it-works accordion, testimonials, download panel, footer. Also contains six app screens inside device frames. | In this project |

No codebase, Figma file, font binaries, logo files, photography or slide template were provided.
**Every colour value in `tokens/colors.css` marked "sampled" was read pixel-by-pixel out of that
render.** Anything not obtainable from it is called out under *Substitutions and gaps* below.

The reference render carries the product name **Gopay** in its artwork. The brief names the
company **Atlas**, so this system is built as Atlas: the visual language of the reference is
treated as ground truth, but its wordmark, logo and product names are not reproduced anywhere.

---

## Content fundamentals

**Voice.** Confident, plain, and second-person. Atlas talks to one person about their own money
and never about itself in the abstract. Sentences are short and declarative; nothing is hedged.

**Person.** "You" and "your", constantly. "We" appears only where Atlas is making a promise
("We show the fee before you commit"). Never "users", never "customers" in customer-facing copy.

**Casing.**
- Marketing headlines: **Title Case**, every word capitalised. "Digital Banking Made For Digital
  Users". "Save When You Send Worldwide". "Trusted By Over Our 400k Accounts".
- Feature-tile titles and in-product headings: **sentence case**. "Get paid up within two days
  early." "Track the spending money that matters to you".
- Eyebrows, nav links and button-adjacent labels: **UPPERCASE** with 0.12em tracking. "OUR
  FEATURES", "ATLAS IN NUMBERS", "FEATURES CREDIT DEBIT APP CONTACT".
- Buttons: **Title Case**, two or three words. "Send Money Now", "Open an Account", "View More",
  "Continue".

**Punctuation.** Headlines never take a full stop. Feature-tile titles and accordion step titles
**do** — "Register for free.", "Choose an amount to send." That trailing period is deliberate and
part of the voice; it makes each step read as finished. Em dashes appear in attributions
("— Dan Wright") and nowhere else. Ampersands are used in short label pairs ("Cash Back & Perks").

**Numbers.** Always concrete, always abbreviated the short way: "7.5M", "2.4%", "400k", "5,000+",
"+2%", "$120.30", "10,750". Money always carries its sign in transaction contexts: "+288.00",
"-$15.99". Currency codes are uppercase and unadorned: USD, BDT, EUR.

**Sentence shapes that recur.**
- Proposition then proof: "Atlas is an all-in-one mobile banking app chock full of all the tools,
  tips, and tricks you need to take control of your finances."
- Benefit then mechanism: "Use your Atlas debit card to earn automatic cash back rewards at select
  retailers, including grocery stores, apparel shops, restaurants and more."
- Imperative step: "Add recipient's bank details."

**Emoji: never.** Not in marketing, not in product, not in transaction rows. Where a glyph is
needed it is a Lucide icon or the four-point sparkle.

**Unicode as ornament.** Only two marks are used decoratively: the four-point sparkle (drawn as
SVG, not a character) and a typographic open quote on testimonial cards.

**Length discipline.** Marketing body copy is two or three lines at 380–520px measure, never
more. Feature-tile bodies are one to three lines at 14px. Nothing in the product needs a
paragraph; if it does, the screen is wrong.

---

## Visual foundations

**Colour.** Two brand colours and two grounds, all sampled:

- **Forest `#003511`** carries every dark surface: the marquee bands, the how-it-works section,
  the download panel, the footer, the primary button, the flagship card. It is very dark and very
  desaturated — it reads almost black at small sizes, which is the point.
- **Lime `#d3fa53`** is the single accent. It appears as icon-chip circles, the strongest CTA fill,
  the sparkle, the open accordion rule, an active nav underline, a switch knob. Never as a large
  ground except the one lime marquee variant. Text on lime is always forest, never white.
- **Cream `#f7f4ed`** and **sage `#cdd8d4`** are the two tinted card grounds. They alternate across
  a grid. There is no third tint.
- **Warm greys** carry copy: ink 900 `#111` for headlines, ink 700 `#4e4e4e` for body. Body copy is
  never pure black.
- Money colours are **derived, not sampled**: incoming amounts go `--positive-500`, outgoing amounts
  stay near-black rather than red. Red is reserved for genuine failure.

At most two background colours are in play on any one page: white plus forest, with cream and sage
appearing only inside cards.

**Type.** One family does everything. A tight geometric grotesque, near-black weight for display,
regular for body. Display sizes run 76 / 56 / 44 / 34 at **-0.03em tracking and 1.05 line-height** —
this tightness is the most recognisable thing about the brand's type. Body copy is the opposite:
16px at **1.7 line-height** in grey, generous and calm. Eyebrows and nav are 13–14px uppercase at
0.12em. Stats use the display face; card numbers and reference codes use the mono face.

**Spacing and layout.** 4px base scale. Page max width 1240px with 48px side gutters. Marketing
sections sit **104–120px** apart vertically. Cards pad at 32px (40px for the wide feature tiles).
The grid is honest: 2-up then 3-up tile rows, 1fr/1fr splits for text-beside-visual sections. The
header is not sticky; nothing is fixed except the app's bottom tab bar. Full-bleed elements are
the marquee bands and the footer — everything else respects the max width.

**Backgrounds.** Flat colour, always. No gradient backgrounds anywhere. The only gradient in the
system is `--glow-lime`, a barely-there radial lime haze used once or twice per page behind a
headline, and `--scrim-bottom`, a protection gradient for the rare case of text over an image.
No patterns, no textures, no noise, no hand-drawn illustration. The decorative shapes that do
appear are large flat circles and half-circles in cream or lime, cropped by their container.

**Cards.** 24px radius (28px for the big feature tiles, 40px for full-width panels). Tinted cards
(cream, sage, forest) are completely **flat** — no shadow, no border. White cards that float over a
tint carry a soft shadow. A card never has both a shadow and a border. Cards clip their contents:
phone frames and payment cards are meant to bleed off the bottom edge.

**Shadows.** Wide, soft, low-opacity, and **tinted green** (`rgba(0,43,15,…)`) — never neutral grey.
Blur radii are large (16–96px) with small or zero offsets, so the shadow reads as ambient light
rather than a drop. Only one shadow layer per element. Inner shadows are not used; where a hairline
is needed it is a real 1px border at 10–16% forest.

**Borders.** Hairline only, and always forest at low alpha rather than grey. 1px on inputs and
outline buttons, 1.5px for the lime nav underline. Dividers inside forest sections are white at
16% alpha, turning lime when the row is active.

**Radii in use.** Buttons 10px — noticeably squarer than the cards around them. Inputs 12px. Icon
chips and avatars fully round. Chips and the header CTA fully round. Phone frames 44px. The only
pill-shaped button on a marketing page is the header "Open an Account".

**Hover states.** Colour, not motion. Filled buttons darken exactly one step on the ramp (forest
800 → 700, lime 500 → 600). Ghost and outline buttons fill with forest 50. Nav links reveal a lime
underline. Cards do **not** lift, scale, or grow their shadow on hover. Icon buttons darken via a
small brightness reduction.

**Press states.** A 1px downward nudge on buttons. No scale-down, no ripple, no colour flash.

**Animation.** Short and unshowy. 140ms for hovers, 220ms for toggles and panels, 340ms for chart
bars, all on **`cubic-bezier(.2,.8,.2,1)`** — one curve does nearly everything. No bounce, no
spring, no overshoot, ever. Content does not animate in on scroll beyond a subtle 16px rise
(`atlas-rise`) where it is genuinely useful. The one continuous animation in the whole system is
the marquee: a 32-second **linear** translate, never eased.

**Transparency and blur.** Almost none. Alpha is used for hairlines, dividers on forest, and the
lime glow. There is no frosted glass, no backdrop blur, no translucent overlay chrome anywhere.
Opacity as a state signal is limited to disabled controls (0.4) and a frozen card (0.5).

**Imagery.** The reference's photography is warm, bright, and shot on light neutral grounds —
people mid-gesture against cream, a hand holding a phone. No grain, no heavy grade, no duotone.
Product photography is replaced by rendered payment cards, which sit at a slight rotation
(-7° to -38°) in marketing layouts and flat in the app. **No photography was supplied**, so this
system ships none; see gaps below.

**Charts.** Two-tone columns — forest bars against sage bars, 8px rounded caps, month labels
beneath, no axes and no gridlines. The alternation is rhythmic rather than semantic.

---

## Iconography

**Set: Lucide, vendored into `assets/icons/` — a flagged substitution.** No icon font, sprite sheet
or SVG files were supplied with the reference. Its icons are outline, roughly 1.75–2px stroke, round
caps and joins, geometric, with no fill. Lucide (`lucide-static@0.454.0`, ISC) is the closest
widely-available match on stroke weight and construction, so **42 glyphs are copied into
`assets/icons/`** — the system needs no network and icons survive screenshot and PDF export.
**If Atlas has its own icon library, send it: drop the SVGs into `assets/icons/` under the same
names and nothing else changes.**

- **How icons render.** `Icon` inlines the glyph as a real `<svg>` with `stroke` set from its `color`
  prop, so it takes any Atlas colour. Stroke weight is fixed at 2px by brand rule — use `size` only.
  `ICON_NAMES` lists every available slug; an unknown name falls back to `circle`.
- **Sizes.** 16 in dense rows, 18–20 inline with text, 22–26 inside chips and tiles, 34 for the
  standalone QR/store marks.
- **The lime chip.** The brand's signature icon treatment is a 54px lime circle with a 26px forest
  glyph centred in it. Feature tiles always open with one.
- **In-app.** Icons sit on 44px cream or sage 12px-radius squares in transaction rows, and on 58px
  white 16px-radius tiles in the quick-action row.
- **Directional glyphs carry meaning.** `arrow-down-left` is money in, `arrow-up-right` is money out
  or "open"; they appear on the Income/Expenses toggle and on positive badges.
- **Brand ornament.** The four-point sparkle is drawn as SVG in `components/core/Sparkle.jsx`, not
  taken from an icon set. It is the only decorative mark in the system.
- **Emoji are never used.** Neither are unicode dingbats. The only non-alphabetic characters in copy
  are the typographic open quote on testimonials, the em dash in attributions, and the middot
  separating meta fields in transaction rows.
- **Third-party marks.** Network logos (VISA, Mastercard) are set as type on the payment card
  because no vector files were supplied. Partner logos in the proof strip render as grey text
  placeholders for the same reason.

---

## Substitutions and gaps

Read this section before trusting the system on anything visual.

1. **Fonts are substituted.** No binaries were supplied. The reference uses a tight geometric
   grotesque (double-storey `a`, flat-sided `G`, straight-tailed `y`). **Figtree** from Google Fonts
   is the closest available match and is loaded in `tokens/fonts.css`; **DM Mono** covers card
   numbers and reference codes. **Please send the real font files** — swapping `tokens/fonts.css`
   for local `@font-face` rules is a five-minute change, and until then display headlines will
   render slightly wider and less quirky than the reference.
2. **No logo file exists.** Per the brief, no mark has been drawn or reconstructed. `Logo` sets the
   word "atlas" in the display face at -0.045em, and that wordmark stands in everywhere a mark
   would go — nav, footer, payment card. **Send an SVG and `Logo.jsx` becomes a one-line change.**
3. **Icons are substituted** (Lucide) — see Iconography.
4. **No photography, illustration or background imagery** was supplied, so `assets/` contains no
   imagery beyond the vendored icon set and the reference render itself. Avatars fall back to initials on a sage ground; the
   partner-logo strip and the download QR code render as honest placeholders. Nothing has been
   generated or drawn to fill these holes.
5. **Semantic money/status colours are derived**, not sampled — the reference only shows a positive
   green. Treat `--negative-*`, `--warning-*` and `--info-*` as proposals.
6. **No slide template was supplied**, so no sample slides were built.
7. **Everything is recreated from a single flat render**, not from code or a Figma file. Padding and
   type sizes were measured off it and are close, not exact. If Atlas has a codebase or a Figma
   library, connecting it would let the tokens be corrected to real values.

## Intentional additions

The reference is a marketing page, not a component library, so it defines an inventory by example
rather than explicitly. Three components exist that the reference does not literally show:

- **`Icon`** — a wrapper so the substituted glyph set can be repointed in one place.
- **`Field`** — the label/hint/error frame the reference's form controls imply but never display.
- **`Radio`, `Checkbox`, `Switch`** — the reference shows only a switch-like control in passing;
  these three are standard and needed by any real product surface. Treat their exact metrics as
  proposals rather than sampled truth.

---

## Index

**Root**
- `styles.css` — the single global entry point. Consumers link this. `@import` lines only.
- `readme.md` — this file.
- `SKILL.md` — Agent Skills front matter, for using this system inside Claude Code.
- `thumbnail.html` — the system's homepage tile.

**`tokens/`** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `radius.css`,
`elevation.css`, `motion.css`, `base.css`.

**`guidelines/`** — 18 specimen cards feeding the Design System tab, grouped Colors / Type /
Spacing / Brand: colour brand, forest ramp, lime ramp, neutrals, money & status, approved
pairings, display type, headings, body, labels & eyebrows, numerals & mono, spacing scale,
spacing in use, corner radii, elevation, motion, wordmark, sparkle motif, card grounds,
iconography.

**`assets/`**
- `assets/icons/` — 42 vendored Lucide SVGs plus a README explaining the substitution and how to
  replace them.
- `assets/reference/atlas-marketing-reference.jpg` — the source render. No logo, font or photographic
  assets were supplied.

**Components** — 32 exports in five groups. Each has `<Name>.jsx`, `<Name>.d.ts` and
`<Name>.prompt.md`; each directory has one `@dsCard` HTML.

- `components/core/` — **Button**, **IconButton**, **Badge**, **Chip**, **Icon**, **Logo**, **Sparkle**
- `components/forms/` — **Field**, **Input**, **Select**, **Checkbox**, **Radio**, **Switch**, **AmountField**
- `components/layout/` — **Card**, **FeatureTile**, **SectionHeading**, **StatBlock**, **Marquee**, **PhoneFrame**, **TestimonialCard**
- `components/navigation/` — **Navbar**, **Accordion**, **QuickActions**, **SiteFooter**
- `components/data/` — **BankCard**, **TransactionRow**, **BarChart**, **SegmentedControl**, **Avatar**, **AvatarStack**, **StarRating**

**UI kits**
- `ui_kits/marketing_site/` — the full Atlas home page at 1280px, click-through. `index.html` plus
  `Hero`, `FeaturesSection`, `BordersSection`, `StepsSection`, `FasterSection`, `ProofSection`,
  `DownloadSection`. See its README for what is deliberately left blank.
- `ui_kits/mobile_app/` — the Atlas app at 390×844, click-through across five screens.
  `index.html` plus `AppShell`, `HomeScreen`, `TransactionsScreen`, `StatisticsScreen`,
  `SendMoneyScreen`, `CardsScreen`.

**Starting points** — Button, Card, FeatureTile, Marquee, BankCard, Accordion, Navbar, plus both
UI-kit `index.html` screens.

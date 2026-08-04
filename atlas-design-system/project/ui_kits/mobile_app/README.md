# Atlas — Mobile banking app UI kit

A click-through recreation of the Atlas app, rebuilt from the app screens visible inside the
brand reference (`assets/reference/atlas-marketing-reference.jpg`). Design frame **390×844**
(iPhone 14-class), rendered inside `PhoneFrame`.

## Screens
| File | Screen | Reference basis |
|---|---|---|
| `HomeScreen.jsx` | Wallet home: card, quick actions, recent activity with period chips | Download panel screenshot |
| `TransactionsScreen.jsx` | Transaction list with filter | "Get paid two days early" tile |
| `StatisticsScreen.jsx` | Income/Expenses toggle, bar chart, transaction history | "Track the spending" tile + Borders panel |
| `SendMoneyScreen.jsx` | Amount, fee breakdown, recipient currency, Continue | Borders panel transfer card |
| `CardsScreen.jsx` | Card carousel across all three finishes, card controls | Hero card fan + "Make Your Money Move Faster" |
| `AppShell.jsx` | Header, bottom tab bar, screen router | Composed |

## Interactions that work
Bottom tabs switch screens · quick actions jump to Send / Transactions · period chips refilter
recent activity · Income/Expenses toggle swaps the chart · the amount field recalculates the
recipient figure · card controls toggle · the card carousel swipes between finishes.

## Deliberate gaps
No photography or merchant logos were supplied, so avatars fall back to initials and merchant
rows use Lucide glyphs on tinted chips.

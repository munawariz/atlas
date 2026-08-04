One-line: A single transaction line — icon chip or avatar, title, meta, signed amount.

```jsx
<TransactionRow icon="hand-coins" title="Barclays Bank Deposit" amount="+288.00" direction="in" />
<TransactionRow title="Transaction" meta="November 20" amount="-$120.30" chevron />
```

Notes
- Incoming amounts are `--positive-500`; outgoing amounts stay near-black, never red.
- Icon chip is a 44px 12px-radius cream square. Use an avatar for person-to-person rows.
- Stack rows in a flex column with `gap: var(--space-2)` on a cream ground.

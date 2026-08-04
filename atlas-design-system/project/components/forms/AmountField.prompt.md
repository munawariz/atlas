One-line: Cream-filled money input with a currency picker — used for both "Amount to send" and the read-only "Recipient will get".

```jsx
<AmountField label="Amount to send" value="100" currency="USD" />
<AmountField label="Recipient will get" value="10,750" currency="BDT" readOnly />
```

Notes
- Figure is set in the display face at `--text-stat-sm`, caption in 13px grey above it.
- Ground is `--cream-100` on white cards, `--white` on cream cards. Radius 16px, no border.

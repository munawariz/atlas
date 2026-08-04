One-line: The tinted feature tile with a lime icon chip — the building block of Atlas's feature grids.

```jsx
<FeatureTile icon="wallet" title="Get paid up to two days early." body="Use your Atlas debit card to earn automatic cash back rewards at select retailers.">
  <PhoneFrame width={260} style={{ marginBottom: -80 }} />
</FeatureTile>
```

Notes
- Alternate `cream` and `sage` across a grid; one `forest` tile per grid as the CTA.
- Titles are max ~20 characters per line and hard-wrap early; body copy stays 14px.
- Children are meant to be clipped by the tile — let them bleed past the bottom padding.

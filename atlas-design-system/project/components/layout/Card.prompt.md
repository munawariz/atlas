One-line: The Atlas card — tinted cream/sage grounds by default, flat, 24px radius, no border.

```jsx
<Card tone="cream" pad="lg">…</Card>
<Card tone="forest" pad="lg" radius="lg">…</Card>
<Card elevation="md">…</Card>
```

Notes
- Tinted cards are FLAT (no shadow, no border). White cards get `elevation="sm|md"` when they float over a tint.
- Never mix a shadow and a border on the same card.
- Cream and sage alternate across a grid; do not use a third tint.

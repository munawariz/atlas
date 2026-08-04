One-line: Single-choice control for short mutually exclusive lists (delivery speed, account type).

```jsx
<Radio name="speed" label="Standard — free" checked={v==="std"} onChange={() => setV("std")} />
```

Notes
- Stack with flex + `gap: var(--space-3)`. Use `SegmentedControl` when there are only two or three options and space is tight.

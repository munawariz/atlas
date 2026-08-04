One-line: Selectable pill filter; exactly one selected per row.

```jsx
<Chip selected>This week</Chip>
<Chip onSelect={() => set("month")}>This month</Chip>
```

Notes
- 38px tall, hairline border when unselected, solid forest fill when selected (lime when `tone="inverse"`).
- Lay rows out with flex + `gap: var(--space-2)`.

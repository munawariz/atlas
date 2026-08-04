One-line: Renders an Atlas outline glyph inline as SVG in any colour, inheriting text colour by default.

```jsx
<Icon name="wallet" size={22} />
<Icon name="arrow-up-right" size={18} color="var(--forest-800)" label="Open" />
```

Notes
- Set is Lucide, **vendored** into `assets/icons/` and inlined into `Icon.jsx` (substitution flagged in readme.md) — outline, 2px stroke, round caps/joins.
- `ICON_NAMES` lists every available slug; an unknown name falls back to `circle`.
- Stroke weight is fixed at 2px by brand rule. Use `size` only.
- On lime chips use `color="var(--forest-800)"`; on forest surfaces use `var(--white)` or `var(--lime-500)`.

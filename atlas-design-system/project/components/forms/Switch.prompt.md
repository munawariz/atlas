One-line: Instant-effect toggle for settings — never for form submission.

```jsx
<Switch checked={on} onChange={setOn} label="Round up my spare change" />
```

Notes
- Track slides in 220ms with the standard ease; no bounce.
- Knob turns lime when on — that lime is the only signal of state, so keep it.

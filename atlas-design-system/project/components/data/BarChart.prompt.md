One-line: Two-tone column chart — forest bars against sage bars, 8px rounded caps, month labels beneath.

```jsx
<BarChart data={[{label:"Mar",value:40},{label:"Apr",value:100},{label:"May",value:58}]} />
```

Notes
- No axes, no gridlines, no value labels. The month row is the only annotation.
- `highlight="alternate"` is the brand default and is purely rhythmic; use `"datum"` when the emphasis is meaningful.

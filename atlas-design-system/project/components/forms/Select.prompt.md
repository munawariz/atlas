One-line: Dropdown matching Input's frame, with a chevron-down at the trailing edge.

```jsx
<Select options={[{value:"usd",label:"USD"},{value:"bdt",label:"BDT"}]} />
```

Notes
- Same 52px height and 12px radius as `Input` so they line up in a form row.
- For currency pickers with a flag, use `AmountField` instead.

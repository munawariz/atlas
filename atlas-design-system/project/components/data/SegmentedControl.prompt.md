One-line: The Income / Expenses style toggle — sage trough, white raised selected segment.

```jsx
<SegmentedControl
  value={tab}
  onChange={setTab}
  options={[{value:"income",label:"Income",icon:"arrow-down-left"},{value:"expenses",label:"Expenses",icon:"arrow-up-right"}]}
/>
```

Notes
- Two or three segments only. Trailing directional arrows are part of the look for money views.
- Selected segment gets `--shadow-xs`, never a border.

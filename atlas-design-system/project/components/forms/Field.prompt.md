One-line: Wraps any Atlas control with its label, hint and error text at the right sizes.

```jsx
<Field label="Recipient email" hint="They get a notification instantly.">
  <Input placeholder="name@bank.com" />
</Field>
```

Notes
- Gap between label and control is always 8px. Error replaces the hint; never show both.

One-line: The app's four-up quick action row — white rounded tiles, forest glyphs, small bold labels.

```jsx
<QuickActions onSelect={(a) => go(a)} />
```

Notes
- Four items is the brand layout; a fifth breaks the grid. The last one is always "More".
- Tiles are 16px radius with `--shadow-sm`, sitting on the app's cream background.

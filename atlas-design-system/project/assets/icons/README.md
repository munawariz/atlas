# Atlas icon set (vendored)

42 SVGs vendored from **Lucide** (`lucide-static@0.454.0`, ISC licence) so the
system works offline and renders correctly in screenshot and PDF export.

This is a **flagged substitution** — no icon assets were supplied with the Atlas brand reference.
Lucide matches the reference's outline construction, 2px stroke and round caps. Stroke colour is
set to `#000` because `components/core/Icon.jsx` applies each file as a CSS mask, so the visible
colour comes from the component, not the file.

To swap in a real Atlas icon library: drop the SVGs in here using the same file names (or set
`window.ATLAS_ICON_BASE` to another directory) and nothing else changes.

# Atlas — Marketing site UI kit

A recreation of the Atlas marketing site, rebuilt from the single brand reference at
`assets/reference/atlas-marketing-reference.jpg`. Design width **1280px**.

## Files
| File | What it is |
|---|---|
| `index.html` | The full page, click-through. Nav links scroll to sections; the accordion, chips, currency switch and testimonial rail all work. |
| `Hero.jsx` | Above-the-fold: headline with the sparkle pill, fanned card stack, stat column. |
| `FeaturesSection.jsx` | "4 Quick Steps" — a 2-up then 3-up tile grid with a phone screen and a chart inside. |
| `BordersSection.jsx` | "Meet Money Without Borders" — cream panel, phone, floating transfer cards. |
| `StepsSection.jsx` | Forest section: numbered accordion beside a floating card visual. |
| `FasterSection.jsx` | "Make Your Money Move Faster" — stats pair beside the sage card. |
| `ProofSection.jsx` | Testimonials, app-store rating, partner-logo strip. |
| `DownloadSection.jsx` | Forest CTA panel with the marquee lip, store buttons and app screens. |

## Deliberate gaps
- **No photography.** The reference's hero people, hand-holding-phone shot and partner logos
  (Coinbase, Spotify, Slack, Dropbox, Asana, InVision) are third-party assets that were not
  supplied. Avatars fall back to initials and the partner strip renders as labelled placeholders.
- **No QR code.** The download panel shows a "Scan to install" placeholder tile rather than a
  fabricated QR.
- **No logo file.** Everywhere the reference shows a mark, this kit sets the `Logo` wordmark.

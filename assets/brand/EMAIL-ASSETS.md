# Customer email assets

These transparent PNG assets accompany the responsive customer acknowledgement
email. They are rendered at twice their intended display size so ordinary email
clients can display the artwork without SVG support. Missing or blocked images
must not carry unique information; the surrounding HTML retains all labels,
values and links.

| Asset | PNG pixels | Intended display |
| --- | --- | --- |
| `email-file.png` | 64 × 64 | 32 × 32 |
| `email-clock.png` | 64 × 64 | 32 × 32 |
| `email-shield.png` | 48 × 48 | 24 × 24 |
| `email-link.png` | 48 × 48 | 24 × 24 |
| `email-check.png` | 40 × 40 | 20 × 20 |
| `email-chevron.png` | 24 × 40 | 12 × 20 |
| `email-header-leaves.png` | 252 × 216 | 126 × 108 |
| `email-footer-garden.png` | 1360 × 220 | Up to 680 × 110, proportional |
| `email-footer-garden-mobile.png` | 780 × 220 | Up to 390 × 110, proportional |

The document, clock, shield and link geometry comes from Lucide Icons (ISC).
The retained license is [`../vendor/lucide-LICENSE.txt`](../vendor/lucide-LICENSE.txt).
Their thin, rounded brown strokes match CoverMate's existing icon character.
The status check and CTA chevron use simple original vector geometry.

The pale botanical sprigs and small garden, house and heart are original vector
artwork authored for CoverMate on 30 September 2026. Their composition follows
the user-supplied email mockups; they do not crop or embed the reference images,
contain rendered text, or substitute for the official CoverMate logo. Existing
official LINE assets and their usage terms remain unchanged.

The mobile footer repositions the same garden geometry beside the left sprig
within a narrower artboard. It preserves the whole house without cropping or
shrinking the desktop illustration into an unreadable detail.

Regenerate from the inline SVG sources in
[`../../scripts/generate-customer-email-assets.mjs`](../../scripts/generate-customer-email-assets.mjs):

```sh
node scripts/generate-customer-email-assets.mjs
```

The generator uses the project's existing `sharp` dependency. It writes only
the nine listed PNGs; no network or email delivery is involved.

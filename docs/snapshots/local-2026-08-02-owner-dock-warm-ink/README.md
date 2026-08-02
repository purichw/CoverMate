# CoverMate Owner Dock Warm-Ink Snapshot

Captured: 2026-08-02, local `http://127.0.0.1:4177`

Reference inputs:

- `/Users/point/Downloads/CoverMate Owner Dock - spec.html`
- `/Users/point/Downloads/owner-dock-spec.md`

Files:

- `reference-desktop.png` - Claude owner-dock reference page at 1440 x 900.
- `reference-mobile-section.png` - Claude reference mobile section.
- `app-desktop-edit-dock-expanded.png` - CoverMate `/#edit` at 1440 x 900 with Tools expanded.
- `app-mobile-edit-dock-expanded.png` - CoverMate `/#edit` at 390 x 844 with Tools expanded.
- `desktop-reference-vs-app.png` - desktop side-by-side contact sheet.
- `mobile-reference-vs-app.png` - mobile side-by-side contact sheet.

Product decision:

- Use the Claude warm-ink owner dock visual direction.
- Preserve CoverMate production behavior for real `Save draft`, `Preview`, `Publish`, `Panel`, `Main`, `Public site`, and `Log out`.
- Keep public visitor mode free of owner chrome unless an owner hash mode is intentionally opened.

Verification:

- `npm run check:bundles`
- `COVERMATE_URL=http://127.0.0.1:4177 npm run smoke`

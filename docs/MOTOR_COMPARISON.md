# Motor comparison and per-cell CMS editing

## Shared presentation

Home and `/motor` use the same featured class cards and comparison component.
The layout follows the supplied desktop and mobile references while retaining
the published insurance content. A design reference does not change coverage
states or policy wording.

- At 1000px and wider, classes are columns and coverage topics are rows in a
  semantic table. Suitability and class notes are additional rows.
- Below 1000px, each topic becomes a keyboard-operable disclosure containing all
  enabled classes. Suitability starts open. There is no outer comparison toggle.
- The three featured classes remain side by side. Their status/remark content
  is projected from the same class and topic IDs used by the full comparison.
- Shared status markup is owned by `src/visitor/tier-cell.html`; Home featured
  cards, desktop cells and mobile disclosures all consume it.
- Visitors and Draft Preview have no editing controls. An authenticated owner
  in Edit mode receives real buttons with accessible names and visible focus.
- The status legend labels all three icon states. Empty suitability or class
  notes show an em dash to visitors; the placeholder is never saved as copy.

## Editing a cell

1. Open Website content → Edit and go to the motor comparison.
2. Click a status icon to cycle through covered (`y`), conditional (`p`) and not
   covered (`n`). The status is independent of the remark.
3. Click the cell's Remark control to edit the current TH or EN text. Every
   status supports a remark; it is not restricted to conditional cover.
4. Save in the dialog (or Cmd/Ctrl+S) commits that one localized remark to Draft. Clear stages
   an empty value; Save confirms it. Cancel or Escape leaves Draft unchanged.
5. Use the existing Undo/Redo, Save draft, Preview and Publish controls. Saving
   Draft never changes the visitor version; Publish uses the existing owner
   confirmation and Firestore publishing flow.

The remark dialog traps keyboard focus and returns focus to its trigger when
closed. Text is plain text, escaped when rendered, with a 1000-character limit.
An empty TH remark does not remove its EN counterpart. Cmd/Ctrl+S inside the
dialog saves the staged remark to Draft without opening the browser Save menu.

## Canonical content contract

Coverage remains in `sections.@tiers.items.@tierId.st[]`, aligned with
`sections.@tiers.heads[]`. Per-cell remarks are stored on the same tier:

```json
{
  "cellRemarks": {
    "durable-head-id": {
      "th": "หมายเหตุเฉพาะช่อง",
      "en": "Cell-specific remark"
    }
  }
}
```

Remarks use durable head IDs rather than array positions or display labels.
Moving a topic moves its `st[]` entries and leaves the remark map attached to
the same topic. Hiding a class/topic preserves its content. Duplicating a class
deep-copies its remarks; duplicating a topic gives the copy its own ID and
copies the corresponding statuses and remarks.

`normalizeTierRemarks()` adds missing language entries from the former class
note only for a legacy `p` cell. Other missing entries start empty. Explicit
empty strings remain empty, so clearing a remark cannot reactivate the old
fallback. The existing `item.th.note` / `item.en.note` remains the separate class
notes row; it is not a live fallback after migration.

CMS v18 also owns the localized comparison labels and optional class tag.
Existing published statuses, hidden rows and owner-written copy are preserved.
No live Firestore write is performed by rendering or by migration in the
browser; persistence still requires the existing Draft/Publish actions.

## Targeted verification

Run the generated visitor build before the focused browser harness:

```sh
npm run build:visitor
node scripts/motor-comparison-browser-check.mjs
```

To use a previously captured public CMS snapshot instead of embedded defaults:

```sh
node scripts/motor-comparison-browser-check.mjs \
  --fixture=uat-results/motor-comparison/published-baseline.json
```

The harness isolates every network write and uses a synthetic owner with
in-memory Draft/Published storage, including Publish. It covers Home/Motor,
TH/EN, 390/820/1440px, keyboard disclosure/status controls, per-status remarks,
language independence, cancellation, explicit clearing, Undo/Redo, reload,
structural reorder/hide/duplicate behavior, Preview and fresh-visitor Publish.
Targeted Axe checks and screenshots are written to
`uat-results/motor-comparison/` (override with `--output=path`). These are local verification artifacts, not
proof that a production release has been deployed.

For a read-only local preview of that same snapshot:

```sh
node scripts/motor-comparison-preview.mjs uat-results/motor-comparison/published-baseline.json
```

This server serves the generated visitor bundle with the supplied public
snapshot and blocks Admin/API writes. The default fixture path above is a
local verification artifact; provide an equivalent CMS snapshot on a fresh
checkout. The permanent regression test uses embedded defaults without one.

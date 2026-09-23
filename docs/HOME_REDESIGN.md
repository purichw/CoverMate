# Home And Motor Shared Design

Updated 2026-09-24. This design is included in upstream source `7759a34`.
See [HANDOFF.md](HANDOFF.md) for exact-source checks and deployment/CMS status;
an older preview or source commit does not prove the current production state.
The authorized input is `covermate-home-codex-handoff-v1.0`, specifically the
approved no-large-portrait Desktop, Tablet and Mobile references. Later owner
direction explicitly includes the palette, contrast, icons and illustrations,
not merely rearrangement of the previous page.

## Implementation Owners

Home advisor identity is a three-placement addition, not another section redesign.
`advisor.*` (CMS v15) owns the optional real name, role, portrait and localized
intro copy. Home's existing Hero card stays open, with a 56x70px portrait next
to the name when both are present. Licence/Contact only reuse the name, never
the image. `proof-credentials.html` is the shared unchanged credentials/hours
partial for the permanent Home card and the existing Motor disclosure.
At the September 23 review the real CMS had no personal identity, so that preview
retained CoverMate. Read current Live/Draft before making new content assumptions.
See [CMS ownership](CMS_CONTENT_OWNERSHIP.md) for blank/language behavior.

Home contact submission states now use shared `submission.html`/`submission.css`
and `covermate-submission.mjs`, with CMS v14 localized copy. This is a Home-only
activation of the shared panel; Motor/renewal retain their existing presentation.
See [CONTACT_SUBMISSION.md](CONTACT_SUBMISSION.md) for contract and local evidence.

September 23: Home and `/motor` now consume these same section components,
tokens, responsive styles and contact/renewal forms. `home.html`, `home.css` and
`homeDesign.*` keep their existing names for compatibility; they are shared
owners, not a Home-only fork. Do not copy their markup or add a Motor stylesheet.
`motorPage.sections`, `hero/trust/cover` and its navigation remain authoritative.
Home-only sections are not injected. The final licence band is a presentation
of the existing insurer cards, not a new CMS section. Motor filters those cards
by the Admin-editable `licenceRole:broker`; Footer still includes AIA. See
`scripts/motor-shared-design-check.mjs` for focused regression and visual proof.

| Surface | Owner and behavior |
| --- | --- |
| Shared Home/Motor sections | `src/visitor/home.html` and `home.css`, composed once by `scripts/lib/visitor-source.mjs` |
| Shared shell, forms, licences and Footer | `src/visitor/template.html`; shared form/API changes are tested on existing paths |
| Home Needs v2 | `src/visitor/calculator.html` / `calculator.css`; shared three-mode renderer; `covermate-calculator.mjs` owns client/server math and snapshots, with v1 payload compatibility. See `NEEDS_CALCULATOR.md` |
| Projection, navigation, editor rendering | `src/visitor/runtime.js` |
| Editor commands, Draft history orchestration | `src/visitor/cms-controller.js`, backed by `editor-history.js` and `covermate-firebase.js` |
| Schema and semantic paths | `covermate-contract.js`; embedded into the visitor build; v11 adds relationship-card roles |
| Deployable output | Generated `index.html`; never hand-edit |
| Optional statement, hero artwork, labels | `homeDesign.*`, Brand & contact > Shared page design (internal key `Home design`) |
| Per-class illustration | `sections.@tiers.items.@id.illustration`, existing section row editor |
| Featured tiers and preview axes | Stable item/head ID arrays in Home composition controls |
| Task shortcuts | Separate ID-bearing `homeDesign.taskLinks`; not insurance categories |
| Original text, items, matrix, visibility/order | Existing `config.sections`, shared by Home/Motor where applicable |

The real logo files and Google Sans families are unchanged. Home uses warmer
ivory/white surfaces, sage insurer/contact bands, terracotta actions, restrained
shadows, outlined icon medallions and optional integrated hero artwork. The existing icon
path registry remains the shared icon source. Reference people, fabricated
social accounts, company lists, hours and browser/device frames are not copied.

No fixed section order is imposed by rendering. Adjacent About/Review/How may
share a responsive band; separating or reordering them in Admin keeps the owner
order. Coverage has its own single `#cover` section again. Old embedded-only
Admin navigation no longer excludes it. Unknown section types are not routed
into the new Home template accidentally.

The Admin Sections list uses the same route projection, with hidden sections
retained for restore. Licence cards have a separate fixed final-band editor,
still writing `sections.@insurers.cards`; Footer follows as the final fixed row.
These two presentation entries are not inserted into stored section arrays.
Motor's licence editor and visitor share the broker-only card filter. See
`scripts/admin-structure-check.mjs` and `scripts/admin-structure-browser.mjs`.

## Compact Reference Composition

The owner's September 21 follow-up overrides the earlier conservative spacing:
the default Home should fit about 3-4 viewports, not a stack of enlarged sections.
The rejected intermediate measured 6,383px TH / 6,824px EN at 390x844. The revised
composition measures about 3,100px TH / 3,260px EN at that viewport, and about
2,800px at 1440x900. These are measurements of the supplied local content in its
initial collapsed state, not a CSS height cap or a limit on future CMS content.

- Hero copy and the illustrated quote share columns on mobile. Proof stays
  available in a small disclosure. The existing font family/logo artwork stay.
- Six coverage categories form a compact six-column desktop / three-column
  mobile grid. Opening one reveals its complete copy and closes its peer.
- About, review and workflow form connected short bands. Secondary explanations
  are disclosed, with all original fields still editable. Empty explanation
  controls are omitted rather than rendered as dead buttons.
- Fourteen real logos use seven desktop / five mobile columns. No reference
  insurer is inserted or substituted to make a screenshot match.
- Three illustrated featured motor classes stay side by side even on mobile.
  They are static cards with visible CMS copy, without per-card detail links or
  collapse controls. All five classes/axes remain in the separate comparison.
  Its disclosure uses the CMS theme action color, white 18px bold text and a
  minimum 64px target, with native keyboard/touch expansion and visible focus.
- Contact uses one mobile field column, two name/contact columns on desktop,
  and retains the original consent, contact rules and separate renewal form.
- FAQ stays a compact grid and now includes the four former reading items.
  There is no separate Guides section or Admin section. Fee explanations and
  privacy retain their disclosures; `#guides` aliases to `#faq`.
- Footer has four proposed desktop columns, two tablet columns and expanded
  mobile groups, using the owner's September 22 Footer references.
  `footer.columns` remains an Admin value, not a forced runtime override.
- Desktop body type is 16px; dense mobile introductory/supporting copy is 14px,
  tablet introductory copy is 15px, compact labels 12-14px, and inputs remain 16px. No viewport-scaled type or
  whole-page zoom is used to achieve the height target.

Faithful adaptation does not mean copying false evidence: the live-source claim
section is disabled, so the reference's support-photo strip is not fabricated or
silently enabled. The supplied reference coverage assertions, employee photos,
social identities and operating hours are not a data source.

## Tablet Layout And Touch Behavior

The September 21 tablet direction is desktop-like composition with mobile
interaction, not a enlarged single-column phone view. Layout and input
capabilities are separate:

- From 768px, Home retains a three-part hero when its CMS statement is enabled,
  six category columns, seven insurer columns, three motor classes, and the
  side-by-side advisory/contact bands. Split-screen below 768px uses the phone
  arrangement. No user-agent or physical-device-name detection is used.
- `(any-pointer: coarse)` enables touch navigation at every width, including
  large landscape tablets and hybrid input. Home and Motor share the existing
  menu with their own CMS navigation items, focus return, Escape and background
  scroll locking. Narrow mouse windows below 1200px also use this menu.
- Touch visitors tap to expand Home proof details. Featured tier cards remain
  visible without toggles at every width. Owner edit mode keeps
  fields expanded. Rotation within the tablet range preserves open details.
  Footer disclosure columns retain a desktop-like horizontal arrangement on
  touch tablets; the desktop footer remains unchanged for mouse users.
- Motor now uses the same featured tier cards and keyboard-accessible full
  comparison disclosure as Home, retaining every configured class and axis.
- Touch controls and summaries are at least 44px high; form text remains 16px.
  The Admin crop dialog retains its fixed action row and scrollable content.
  All content, links, images, ratios and editing owners are still shared CMS data.

Local checks:

```sh
node scripts/tablet-responsive-check.mjs http://127.0.0.1:58081/
npm run check:cms:site:browser -- --tablet /path/to/covermate-home-codex-handoff-v1.0
```

The responsive harness covers 768/820/1024/1180/1366px iPad-class and
800/1280/1600px Android-tablet-class layouts, portrait/landscape, split view,
phone and mouse desktop, with TH/EN content. Chromium touch emulation is not
physical iPad Safari or Samsung Internet verification. This tablet pass used
Chromium; the later [browser pass](BROWSER_COMPATIBILITY.md) adds focused
Firefox/WebKit coverage. Evidence: `uat-results/tablet-responsive/` and
`uat-results/cms-site-audit-tablet/`; neither harness publishes or submits leads.

## Local Proposal, Not a Database Import

```sh
npm run build:visitor
node scripts/home-redesign-preview.mjs /path/to/covermate-home-codex-handoff-v1.0
node scripts/home-redesign-check.mjs /path/to/covermate-home-codex-handoff-v1.0
npm run check:faq -- /path/to/covermate-home-codex-handoff-v1.0
```

The read-only preview uses the explicitly supplied public snapshot, stages the
bilingual proposed copy and section arrangement in memory, and writes an ignored
`uat-results/home-redesign/proposed-draft-diff.json` for review. Each staged
change carries the old value/hash and proposed value. Unmapped copy proposals
are reported, not silently published. `/api/leads` is disabled in this preview;
Admin verification uses the separate isolated browser harness.

This is not an importable backup. Do not run a live migration, publish a draft,
push or deploy from these instructions. Those operations require separate owner
authorization and the normal release gate. Production content/order is not
replaced with the reference snapshot by any runtime code.

### Authorized Release Migration

The owner subsequently authorized the complete production release. Use
`scripts/release-home-content.mjs --site=covermate` for a read-only plan against
fresh live and draft states, with `COVERMATE_HANDOFF_DIR` set to the handoff.
`--apply` is only for that authorized release, after compatible code is deployed.
The planner coalesces repeated copy aliases, compares each original/proposed
value, reorders current objects by ID rather than importing reference objects,
and refuses conflicts. Live/draft are independent conditional writes guarded
by Firestore updateTime, with ignored local backup and immediate readback.
Re-running must be a no-op; never publish an unrelated draft or wholesale import
the fixture. `home-release-check.mjs <handoff-dir>` verifies these invariants.

## Preserved Data Contracts

- Schema v4 moves the legacy `guides.items` into `faq.items`, after the existing
  questions, without rewriting copy. `title/body` become `q/a`; optional
  `label/meta` remain editable in the FAQ Admin row and appear inside the answer.
  Stable IDs, collision handling, bilingual blanks and hidden flags are retained.
  `cmsArchives.guides` is a recovery snapshot, never a rendered/editable fallback.
  Deleting or hiding a migrated FAQ item cannot re-import it from that archive.
  Legacy guide semantic overrides are adopted once; unsupported positional
  overrides remain available for review. Migration is read-time/local until a
  separately authorized save/publish. The original legacy defaults still provide
  the migration input for a new/old configuration, not a second live owner.

- Six enabled categories, insurer records and full five-class/five-axis matrix
  remain data-driven. Featured cards only filter the projection by durable IDs.
- Column moves swap the corresponding status-array positions before rendering;
  preview axis lookup uses the head ID, not the new display index.
- Successful CMS values, empty arrays, blank images and blank translations win.
  An unreadable insurer image shows its configured company name, not a made-up
  replacement logo. The dynamic count token counts enabled records, not image
  load successes.
- Explicit `claim.on:false` is preserved when an older record lacks `motorPage`.
  Claim remains absent in the supplied local proposal. Fit and Voices remain off.
- `cms:sections.@section.items.@item.th.field` and card equivalents are canonical
  inline owners. Known old Hero/Insurer intro overrides are translated before
  applying the new layout. A documented legacy consultation choice override is
  also migrated while its legacy flag is pending. Unknown positional overrides
  are retained for review and are **not applied to different nodes** in Home.
  Review any additional live-only legacy overrides before release; the supplied
  public snapshot contains four known migrated overrides, not every future state.
- Locale switches and published refresh preserve typed form state. Header/Footer
  retain existing ownership. Closing Panel keeps the current Editor route.
- Home nav Motor links use `#motor` and stay in-page. No public cross-page link
  leads to `/motor`; that route remains available directly. The `insurers`
  DOM/CMS ID stays unchanged and old `#insurers`
  URLs normalize to `#motor`. Legacy `#life` scrolls to `#cover`. Deep links open
  privacy/about/renewal/comparison disclosures before scrolling.
- Same-page anchor clicks have one native smooth scroll in either direction;
  initial deep links and reduced-motion users land without animation. No delayed
  re-aim timers may override a newer anchor or manual scrolling. `#top` must not
  open a disclosure. Motor header height stays stable during scrolling. Hash
  events still notify analytics/live refresh without triggering a second scroll.
- The mobile/touch contact bar stays visible at every scroll position, including
  Hero, contact inputs and Footer. Its CMS switch and contact URLs remain
  authoritative; menus and owner modes still suppress the underlying bar.
  Root scroll padding reserves space for the sticky header and contact bar so
  browser-driven focus/scroll-into-view does not place controls behind them.
- Both the Motor link beside the Home tier heading and the insurer-section
  entry into `/motor` are removed on every viewport. Partial-coverage notes use
  a pale surface and accent border without increasing font size (14px on
  desktop/tablet, 12px on mobile); note text remains CMS-owned.

## Licence Section

Home licence/relationship details are the final main section before Footer,
always expanded. The former insurer-band disclosure is removed. Card content,
logos and visibility still belong to `sections.@insurers.cards`, and its intro
still belongs to `sections.@insurers.{th,en}.body`. Hero/Footer licence summaries
remain unchanged. Motor now uses this same component with broker-role cards
only; the shared Home intro is omitted there because it describes AIA as well.
The section heading, eyebrow, statement and 3:1
background are editable under Brand & contact > Home licences (code schema v6).
Desktop/tablet use two equal-height cards, or a full row for a single broker;
mobile stacks them with contained logos. Motor Hero uses the broker card's
logo/kicker and only the non-life licence number. No AIA body copy or logo is
borrowed from Home, and a hidden broker card hides its proof instead of restoring it.

## Forms and Safety

Consultation still submits the original name/contact/qtype/coverage/topic,
language, consent and summary contract. Name is optional, contact accepts LINE
ID or phone. Details stay visible on all devices; coverage interest retains an
optional disclosure which opens when a coverage is prefilled.
Renewal is a separate disclosed form, not nested in consultation.
Contact channels and business hours are always expanded, not a disclosure.
Home text inputs/selects are 48px high with 16px text; the submit action is 52px
and full-width within the form card. Desktop uses roughly 40/60 information/form
columns; below 900px they stack. Mobile groups the contact methods into one
surface. Actual contact data, consent and API remain unchanged. The latest
handoff requires the original details field even though its mobile mock omits it.

Contact and Footer presentation fields are in the shared schema v8, editable
under Brand & contact > Home contact / Footer design. Backgrounds have 3:1
crop slots and icons 1:1. Existing CMS logos and licence values remain canonical.
No mock QR, motor-only introduction, response-time promise or artificial 500
character limit is added. Local screenshots are under `uat-results/contact-redesign/`.

Home Needs v1 attaches only an active-tab snapshot explicitly selected with the
calculator CTA. The contact form's include-estimate checkbox can remove it;
consent and submit are still required to send. Changing language, loading CMS,
typing figures or hidden defaults never opts in. See NEEDS_CALCULATOR.md.

The public lead service keeps its existing idempotency key on failed/unconfirmed
requests, bounds verification time, and requires the API's 64-character record
ID before returning success. Offline/uncertain messages have CMS owners; fields
remain populated and errors receive focus. Raw submission exceptions are no
longer logged by the visitor runtime. The API, App Check and consent validators
are not bypassed in real service code.

Browser fixtures explicitly mock Auth/Firestore/App Check and lead responses.
Their success is not persistence proof. The emulator suite separately exercises
real local Auth, Rules, API transactions and Admin publishing; never production.

## Assets

Created with the built-in image-generation tool, then encoded as WebP without
changing the composition or transparency. Original PNG masters are retained.

| Asset | Role | Web payload |
| --- | --- | --- |
| `assets/brand/home-hero-background-v2.webp` | Full-width cream/sage/peach background with flat illustrated foliage | 33,124 bytes |
| `assets/brand/home-tier-1-v1.webp` | Class 1: silver car, gold check shield and ring | 49,234 bytes |
| `assets/brand/home-tier-2-plus-v1.webp` | Class 2+: car, shield, collision/theft/fire motifs | 47,102 bytes |
| `assets/brand/home-tier-3-plus-v1.webp` | Class 3+: car, people shield and second-car silhouette | 35,886 bytes |

The owner rejected the detached, overly realistic botanical branch on September
21. The unused `home-botanical-v1` PNG/WebP files are retained as an earlier local
iteration, not referenced by the current seed. The replacement covers the entire
hero instead of the statement block. On mobile it is bottom-aligned with a soft
top mask, so the artwork does not stretch or create a hard horizontal seam.
The proof card has an opaque cream surface to keep foliage out of licence text.

Admin label: **Hero background artwork**, under Brand & contact > Home design.
The existing `homeDesign.botanicalIllustration` storage key is intentionally
preserved. Blank remains blank; custom media wins. This change does not alter
logos, fonts, copy or production CMS values.

The earlier `home-motor-illustration-v1` asset is also retained but unused.
Each new class image was generated separately with the built-in image tool using
the owner-supplied `codex-clipboard-b11acf38-4e39-470a-b74c-5fcac6906ef6.png`.
The prompt asked for background extraction of the left/middle/right artwork:
isolate the silver car and its corresponding shield/symbols, retain composition
and proportions, transparent square canvas with 6% safe padding, no card,
text, button or surrounding page. These are generated adaptations of the
reference, not exact source-pixel crops. PNG masters accompany each WebP.

The motifs are decorative, not policy terms. Actual coverage comes from the
unchanged source matrix. No asset depicts a real employee, insured vehicle or
endorsement. **Tier illustration (optional)** in the Admin row editor controls
each durable row's path; editing/reordering and explicit blank/unsafe values are
covered by the local browser harness. No production CMS media was written.

### Hero Background Generation Prompt

Tool: built-in `image_gen`, with the owner's September 21 banner crop as the
style reference. PNG master: `assets/brand/home-hero-background-v2.png`.

> Use case: style-transfer. Asset type: full-width website hero BACKGROUND ONLY,
> wide landscape 3:1 aspect ratio, ideally 2400x800. Use the supplied website crop
> strictly as a visual style reference for its integrated cream/sage/peach
> background. Reconstruct that background as a finished seamless composition
> WITHOUT ANY UI, text, numbers, letters, logos, cards, icons, people or
> portraits. Warm pale ivory base (#faf5e9). Large pale sage green organic
> flowing color fields connected to the top and right edges and gently sweeping
> toward the lower center; a soft light peach field sweeping along the lower
> edge from center toward right. Broad calm flat color areas with lightly
> brushed paper texture, not blurred circles, not isolated orbs. Preserve a
> quiet almost blank ivory LEFT 40% so real HTML headline and paragraph can go
> there. A single small stylized botanical sprig at 65% horizontal position,
> from 88% down to 42% of canvas height; only 5 or 6 simplified sage leaves,
> softly tapered geometric leaf silhouettes with a single subtle center vein,
> entirely two-dimensional graphic illustration, NOT photographic, NOT a
> realistic cutout, NOT detailed veins, NOT 3D. Sprig belongs within the
> overlapping background planes like the reference, rather than floating as a
> standalone object. Right quarter mostly soft pale sage/ivory, suitable behind
> a real HTML proof card. Low contrast, refined, warm and reassuring, integrated
> edge-to-edge art direction matching the reference closely. No gradients
> resembling spotlights, no bokeh, no shadows cast by leaves. Do not reproduce
> screenshot frame or web components. Output only the usable wide background
> bitmap.

## Evidence and Remaining Reviews

### Lessons From Owner Review

- Matching section order alone was insufficient. The accepted direction also
  owns section density, color/contrast bands, icon weight, integrated artwork,
  card alignment, footer composition and details below the first viewport.
- Compactness is a composition requirement on desktop and mobile. The owner's
  roughly 3-4 viewport target is project-specific, measured with real TH/EN
  content and collapsed disclosures; it is not permission to shrink the page,
  hide required capabilities, clip text or erase CMS data.
- Inspect visible artwork, not just image element dimensions: logos with baked-in
  white padding looked tiny inside apparently large tiles. Match optical size
  and equal surrounding clearance without cropping actual marks or changing identity.
- FAQ, coverage and process peer cards need equal closed-state geometry with
  long Thai/English labels. Disclosure text needs real inline padding and a
  reserved plus/chevron area. Expansion must still grow naturally.
- Tablet composition should resemble desktop while coarse-pointer behavior is
  touch-first. Desktop width is not evidence of a mouse or hover capability.
- Personally open current desktop/mobile/tablet images before handoff. A passing
  harness, saved PNG, or successful build is not visual approval. Compare readable
  top/middle/footer crops plus full-page rhythm; record remaining deviations.
- New copy/media must have matching Admin owners, blank handling and draft/preview
  behavior. The local proposal is not the production CMS or owner approval to publish.
- Do not treat obsolete embedded-only coverage, separate Guides, or media-upload
  prohibitions as reasons to resist the owner's explicitly approved redesign.

Current screenshots and structured results are under `uat-results/home-redesign/`.
`snapshot-provenance.json` records the six TH/EN captures at 390, 820 and 1440px.
`visual-review.json` distinguishes personally inspected evidence from captures.
`acceptance-results.json` maps the supplied 107-case plan conservatively:
partial coverage remains NOT_RUN and owner decisions remain BLOCKED, not PASS.

`browser-checks.json` covers 32 viewport/locale combinations plus Home menu,
disclosures, forms, consent changes, media and authenticated mock Admin editing.
Source checks and CMS ownership/browser checks passed. The real local emulator
suite was rerun successfully with `COVERMATE_NFR_BROWSER=chromium`: Auth/Rules,
API persistence, Admin lead readback/publishing, Home/Motor and contrast checks.
That backend run predates the final compact CSS/template pass; the final pass
reruns targeted browser/form/Admin and bundle checks, not the entire backend
suite. That original pass did not run WebKit. A subsequent focused cross-browser
pass installed project-local Firefox/WebKit runtimes; see
[browser compatibility](BROWSER_COMPATIBILITY.md) and
`uat-results/browser-compatibility/report.json` for its exact engine versions,
profiles and results. This does not convert the original full acceptance plan
or actual Safari/LINE-device checks into PASS.

September 21 release rerun: the final emulator suite passed both Chromium and
WebKit for authenticated draft/Publish/open-visitor refresh, plus the real
emulator form/API/Admin journeys and TH/EN Home/Motor accessibility. Test-server
header selection was updated for preview noindex and cleanup now closes all
resources. This supersedes the earlier Chromium-only backend evidence, not the
remaining real-device/compliance items.

Before a separately authorized release, resolve the handoff's owner-review
queue: LINE account identity, regulated insurance/tax claims, compensation,
emergency wording, privacy retention and renewal operations. A received renewal
lead is not proof of a reminder scheduler. No legal/compliance approval or
real-user conversion improvement is claimed by this redesign.

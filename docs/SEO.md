# CoverMate SEO Contract

Last updated: 2026-08-10

## Canonical Indexing

The only indexable public URL is:

- `https://covermate.vercel.app/`

`/#motor` is a hash alias into the public single-page site and must keep the
same canonical URL. Do not add hash URLs to `sitemap.xml`; crawlers ignore URL
fragments for separate indexing.

Admin surfaces are private owner tools and must stay `noindex,nofollow`:

- `/admin/login`
- `/admin`
- `/admin/analytics`
- `/#admin`
- `/#edit`
- `/#preview`

`robots.txt` also disallows `/admin` and points crawlers to the production
sitemap.

## Metadata Layers

The site is a static Claude Design export that replaces the shell document with
an embedded template at runtime. SEO metadata therefore exists in two places:

- the outer `index.html` head, which non-rendering crawlers and link previews
  can see immediately;
- the embedded template head, which becomes the live document after hydration.

Keep these layers aligned whenever changing title, description, canonical,
Open Graph, Twitter, icon, or JSON-LD data.

## Dynamic Live Content

The static metadata is only a fallback. After the app hydrates Firestore live
content, the runtime updates:

- `document.title`
- `html[lang]`
- `meta[name="description"]`
- `meta[name="robots"]`
- canonical link
- Open Graph and Twitter title/description/image
- `script#covermate-jsonld`

This keeps metadata aligned with Admin Portal edits to the live brand and hero
copy. Firestore live content must win over stale browser cache, including SEO
metadata.

## Guarded Admin SEO Controls

The Admin CMS can manage only:

- `seo.title.th/en`
- `seo.description.th/en`

Those fields feed `document.title`, meta description, Open Graph title and
description, and Twitter title and description after hydration. If the guarded
fields are blank, the runtime falls back to the live brand and hero copy.

The CMS must not expose arbitrary controls for canonical URL, robots directives,
social image path, JSON-LD entity types, testimonials, ratings, reviews,
addresses, PII, or unsupported licence/claim statements. Canonical remains
locked to `https://covermate.vercel.app/`. Public `/` remains
`index,follow`; owner/admin routes remain `noindex,nofollow`.

## Structured Data

Structured data lives in `script#covermate-jsonld` and uses JSON-LD. It is
limited to facts represented by the public page:

- `WebSite`
- `Organization` / `InsuranceAgency`
- `WebPage`
- `Service`

Do not add FAQ, review, rating, price, address, phone, email, fee, or claim
structured data unless the same information is accurate, visible on the public
page, and not a placeholder. The runtime intentionally omits placeholder
phone/email values such as `08X-XXX-XXXX` and `purich@example.com`.

## Social Assets

Current share image:

- `assets/covermate-og.png` - 1200 x 630 PNG
- `assets/covermate-og.svg` - editable source

App/icon assets:

- `favicon.svg`
- `favicon.ico`
- `assets/apple-touch-icon.png`
- `assets/icon-192.png`
- `assets/icon-512.png`
- `site.webmanifest`

The Open Graph image is not immutable-cached so social preview fixes can roll
out without changing file names.

## Verification

Run:

```sh
npm run smoke
```

The smoke harness verifies:

- `robots.txt`, `sitemap.xml`, `site.webmanifest`, and SEO images/icons load;
- public routes are indexable and canonicalized to production root;
- admin routes and owner modes are `noindex`;
- Open Graph, Twitter, and JSON-LD metadata exist and parse;
- remote Firestore live content updates SEO metadata instead of stale local
  cache winning.
- guarded Admin SEO controls can persist title/description without exposing
  canonical or robots editors.
- the expanded public section set, including claim help, renewal reminders, fee
  transparency, and privacy/PDPA, renders without creating separate indexable
  hash URLs.
- `covermate-analytics.js` loads as a public static asset; Analytics itself is
  production-only and must not be added to admin-only HTML surfaces.
- `/admin/analytics` is `noindex,nofollow`, is not in `sitemap.xml`, and does
  not load visitor GA scripts.

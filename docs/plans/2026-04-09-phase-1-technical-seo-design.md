# Phase 1 Technical SEO Design

## Goal

Strengthen the public site's Google SEO foundation without changing product behavior. This phase should improve crawlability, canonical consistency, and search-facing metadata for the existing public pages.

## Scope

This slice covers five technical SEO upgrades:

- stronger homepage and sitewide metadata defaults
- canonical URL declarations for public pages
- `robots` route
- `sitemap` route
- crawlable CTA links on the homepage

## Product Problems To Fix

1. The root metadata still speaks like a local MVP instead of a public `MYP + DP` product.
2. Public pages do not currently declare canonical URLs.
3. The app does not expose explicit `robots` and `sitemap` metadata routes.
4. Key homepage CTA elements are rendered as buttons with no crawlable destination.
5. Private routes such as login, dashboard, and billing are not explicitly marked as non-indexable.

## Design

### Site Metadata

The root layout should become the baseline search-facing metadata owner:

- set `metadataBase` to the production canonical host
- use a public-facing title template
- replace the old MVP description with a user-facing product description
- add homepage canonical default
- keep Organization JSON-LD and add `WebSite` JSON-LD

### Page-Level Canonicals

Public informational pages should declare their own canonicals:

- `/`
- `/about`
- `/contact`
- `/privacy`
- `/terms`

This avoids accidental duplication and makes the canonical host explicit.

### Robots And Sitemap

The app should expose:

- `robots.ts`
- `sitemap.ts`

The sitemap should list only public canonical pages. Robots should point to the sitemap and block clearly private areas such as `/admin` and `/api`.

### CTA Linkification

The homepage CTAs should use real links:

- trial and setup actions should point to `/login`
- the sample CTA should point to an existing public route instead of staying a dead button

This improves crawlability and avoids decorative controls that lead nowhere.

### Private Route Indexing

Private routes that are not intended to rank should declare `noindex` metadata:

- `/login`
- `/dashboard`
- `/billing`

## Non-goals

This phase does not include:

- adding new SEO-focused public content pages
- changing page layout or visual design
- rewriting large sections of landing-page copy
- adding article/blog infrastructure
- search-console operations

## Success Criteria

- root metadata reflects the live public product
- public pages declare canonicals
- `robots` and `sitemap` routes are live
- homepage CTAs are crawlable links
- private routes are marked non-indexable
- tests lock these SEO foundations against regression

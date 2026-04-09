# Phase 1 Technical SEO Implementation Plan

## Scope

Implement the minimum technical SEO foundation for the current public site:

- metadata refresh
- canonical URLs
- `robots`
- `sitemap`
- CTA linkification

## Steps

1. Add regression tests first
- lock root metadata defaults
- lock homepage metadata
- lock CTA destinations
- add `robots` and `sitemap` route tests

2. Introduce shared site URL config
- centralize canonical host configuration
- reuse it across metadata, robots, and sitemap generation

3. Upgrade root metadata
- add `metadataBase`
- replace MVP description
- add canonical default
- add `WebSite` JSON-LD alongside `Organization`

4. Upgrade homepage metadata and CTA links
- export homepage metadata
- convert key CTA buttons to `Link`
- point the sample CTA to an existing public route

5. Add public canonical declarations
- update `about`
- update `contact`
- update `privacy`
- update `terms`

6. Add SEO routes
- create `robots.ts`
- create `sitemap.ts`
- include only public canonical pages

7. Mark private pages as non-indexable
- add `robots: { index: false, follow: false }` to `login`
- add the same to `dashboard`
- add the same to `billing`

8. Verify
- run targeted SEO tests
- run lint
- run full test suite
- run build

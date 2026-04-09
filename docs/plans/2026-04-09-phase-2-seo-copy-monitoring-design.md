# Phase 2 SEO Copy And Monitoring Design

## Goal

Finish the second half of the public SEO cluster rollout by making the five intent pages better at routing visitors between pages, and by starting a lightweight Search Console monitoring loop for impressions and indexed status.

## Problems To Fix

1. The five new pages exist, but the comparison path between them is still too weak.
2. The CTA copy mostly pushes users toward a single action instead of helping them choose the next best page.
3. Search Console is connected, but there is no repeatable way to monitor how the new cluster is performing.

## Recommended Approach

Use one shared content model for the five pages and extend it in two ways:

1. Add a comparison block to each page
2. Add a two-step CTA block to each page

Then add a local ops script that reads Search Console data for exactly these five pages and prints a compact report.

## Content Design

### Comparison Block

Each page should explicitly answer:

- when this page is the right starting point
- what adjacent page is most useful next
- how this page differs from another page in the cluster

This makes internal linking more helpful than a generic “related pages” list.

### CTA Block

Each page should include:

- primary CTA
- supporting note
- secondary CTA that links deeper into the comparison cluster

This keeps the page useful both for conversion and for SEO cluster navigation.

## Monitoring Design

Add a Search Console report script that:

- queries the five tracked URLs for search analytics impressions and clicks
- checks sitemap submitted/indexed counts
- inspects each URL for indexed state using URL Inspection
- prints a markdown summary to stdout

This should stay outside the app UI for now. A script is enough to start the monitoring habit without introducing a premature dashboard.

## Scope

### In scope

- stronger comparison copy on the five SEO pages
- stronger CTA copy on the five SEO pages
- a shared Search Console reporting helper
- a runnable script for Phase 2 SEO monitoring
- tests for summary logic and page-level copy regressions

### Out of scope

- Search Console admin UI
- automatic alerting
- recurring scheduler wiring
- content performance charts

## Success Criteria

- each of the five SEO pages includes a clear comparison block
- each page includes a primary and secondary CTA
- Search Console monitoring can be run with one command
- the report includes impressions, clicks, sitemap indexed/submitted, and URL inspection status

# Phase 2 Public SEO Pages Design

## Goal

Expand the public site from a single broad landing page into a small cluster of intent-mapped pages that can rank for the core `MYP`, `DP`, `Goodnotes`, `Notion`, and comparison queries the product now serves.

## Scope

This slice adds five new public pages:

- `/ib-myp-reading-support`
- `/ib-dp-reading-and-writing-support`
- `/goodnotes-workflow-for-ib-students`
- `/notion-archive-for-ib-families`
- `/myp-vs-dp-reading-model`

It also adds internal links from the homepage, About, and Contact pages, and updates the sitemap so these pages become part of the public crawl path.

## Product Problems To Fix

1. The public site has strong product messaging, but too few pages to capture real search intent.
2. Important product concepts such as `MYP bridge reading`, `DP academic framing`, `Goodnotes delivery`, and `Notion archive` exist only as homepage fragments.
3. The site lacks a comparison page for `MYP vs DP`, even though the product now clearly differentiates the two learning loops.
4. Internal linking between public pages is too thin to reinforce topical relevance.

## Recommended URL Strategy

Use explicit, descriptive, human-readable URLs that match likely search phrasing:

- `ib-myp-reading-support`
- `ib-dp-reading-and-writing-support`
- `goodnotes-workflow-for-ib-students`
- `notion-archive-for-ib-families`
- `myp-vs-dp-reading-model`

These are long enough to be descriptive but still clean and stable.

## Content Design

### Shared Structure

Each page should keep the same high-trust informational shell and follow a consistent structure:

1. clear search-intent hero
2. who it is for
3. how Daily Sparks helps
4. what the workflow includes
5. related pages
6. CTA

This keeps implementation light while making each page feel purpose-built.

### Page Roles

#### `IB MYP reading support`

Focus on:

- bridge reading
- global context
- compare-connect thinking
- inquiry prompts

#### `IB DP reading and writing support`

Focus on:

- academic framing
- abstract and core issue
- claim and counterpoint
- evidence limits and TOK-style prompts

#### `Goodnotes workflow for IB students`

Focus on:

- direct student delivery
- handwriting-friendly reading
- low-distraction workflow
- how Goodnotes fits the daily brief loop

#### `Notion archive for IB families`

Focus on:

- family archive
- searchable history
- notebook entries
- weekly recaps and retrieval

#### `MYP vs DP reading model`

Focus on:

- how the two loops differ
- what changes for families
- what remains shared
- when a family should expect more inquiry vs more argument

## Technical Design

### Shared Content Source

Create a shared `public-seo-pages-content` module that holds:

- route metadata
- page headings
- section copy
- related links

This reduces duplication and keeps SEO copy easy to update later.

### Page Files

Keep real static route files for each public page. Do not use a dynamic catch-all route for this slice. Static files are clearer, safer, and easier to test.

### Sitemap And Canonicals

Add all five pages to the public canonical route list so they automatically appear in the sitemap.

Each page should export:

- title
- description
- canonical
- open graph metadata

## Internal Linking

The homepage should link into the new pages from visible product-relevant areas, not just the footer.

The About and Contact pages should add one lightweight section each that points readers toward the most relevant guides.

Each SEO page should link to two or three related SEO pages to create a small content cluster.

## Non-goals

This phase does not include:

- a blog or article CMS
- a guides index page
- programmatic content generation
- new screenshots or media assets
- Search Console performance reporting UI

## Success Criteria

- the site has five intent-mapped public SEO pages
- each page has clean metadata and canonical URLs
- sitemap includes all five pages
- homepage, About, and Contact provide crawlable internal links into the new cluster
- tests lock route presence, metadata, and sitemap coverage against regression

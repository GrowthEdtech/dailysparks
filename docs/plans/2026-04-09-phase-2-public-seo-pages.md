# Phase 2 Public SEO Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add five intent-mapped public SEO pages plus the internal linking and sitemap updates needed to turn them into a crawlable content cluster.

**Architecture:** Reuse the existing informational page shell for layout consistency, introduce one shared content module for page copy and metadata, and keep each new route as a dedicated static page file. Update homepage and public informational pages to link into the new cluster, and extend the sitemap from the existing canonical route list.

**Tech Stack:** Next.js app router, static metadata exports, Vitest, React server components.

---

### Task 1: Add failing tests for new SEO routes

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/informational-pages.test.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/seo-routes.test.ts`

**Step 1: Write the failing tests**

Add assertions for:
- five new page modules and expected route labels
- page metadata and canonical values
- homepage/About/Contact internal links to the new routes
- sitemap entries for all five routes

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/informational-pages.test.tsx src/app/seo-routes.test.ts`

Expected: FAIL because the routes, metadata, and sitemap entries do not exist yet.

### Task 2: Create shared SEO page content source

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/public-seo-pages-content.ts`

**Step 1: Write the failing test if needed**

Use the route tests from Task 1 as the red state for this shared content source.

**Step 2: Write minimal implementation**

Create a shared module that defines:
- route slug
- title
- description
- eyebrow
- hero intro
- section content
- related links

**Step 3: Run targeted test**

Run: `npm test -- src/app/informational-pages.test.tsx src/app/seo-routes.test.ts`

Expected: still FAIL until page files are created.

### Task 3: Add the five new public page routes

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/ib-myp-reading-support/page.tsx`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/ib-dp-reading-and-writing-support/page.tsx`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/goodnotes-workflow-for-ib-students/page.tsx`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/notion-archive-for-ib-families/page.tsx`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/myp-vs-dp-reading-model/page.tsx`
- Reuse: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/informational-page-shell.tsx`

**Step 1: Write minimal implementation**

Each page should:
- import the shared content
- export metadata with title, description, canonical, and open graph
- render the informational shell
- include related links and CTA

**Step 2: Run targeted test**

Run: `npm test -- src/app/informational-pages.test.tsx src/app/seo-routes.test.ts`

Expected: fewer failures, likely still failing until sitemap and internal links are updated.

### Task 4: Update sitemap coverage

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/site-config.ts`
- Reuse: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/sitemap.ts`

**Step 1: Add the five new public canonical routes**

Extend `publicCanonicalRoutes` so the new pages appear in the sitemap.

**Step 2: Run targeted test**

Run: `npm test -- src/app/seo-routes.test.ts`

Expected: PASS for sitemap coverage.

### Task 5: Add homepage internal links

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/page.tsx`

**Step 1: Add a lightweight public guide cluster section**

Introduce crawlable links from the homepage to:
- MYP page
- DP page
- Goodnotes page
- Notion page
- comparison page

Keep the section visually light and aligned with the existing landing-page structure.

**Step 2: Run targeted test**

Run: `npm test -- src/app/informational-pages.test.tsx`

Expected: internal linking assertions move to green.

### Task 6: Add About and Contact internal links

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/about/page.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/contact/page.tsx`

**Step 1: Add one section per page with related public guides**

Keep it lightweight:
- About links to MYP, DP, and comparison
- Contact links to Goodnotes and Notion setup help pages

**Step 2: Run targeted test**

Run: `npm test -- src/app/informational-pages.test.tsx`

Expected: PASS.

### Task 7: Verify and finalize

**Files:**
- Verify all files above
- Update docs only if implementation differs from design

**Step 1: Run lint**

Run: `npm run lint`

Expected: PASS

**Step 2: Run full test suite**

Run: `npm test`

Expected: PASS

**Step 3: Run production build**

Run: `npm run build`

Expected: PASS

**Step 4: Commit**

```bash
git add src/app docs/plans
git commit -m "feat: add phase 2 public seo pages"
```

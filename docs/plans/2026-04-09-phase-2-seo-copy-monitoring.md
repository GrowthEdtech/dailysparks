# Phase 2 SEO Copy And Monitoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strengthen the comparison and CTA path inside the five public SEO pages, then start a repeatable Search Console monitoring loop for impressions and indexed status.

**Architecture:** Extend the existing shared SEO page content model so each page can render a comparison section and a two-step CTA. Add a small Search Console reporting helper in `src/lib` plus a runnable script in `scripts/` that queries the connected property and summarizes the Phase 2 page cluster.

**Tech Stack:** Next.js app router, React, TypeScript, Vitest, Google Search Console API, google-auth-library

---

### Task 1: Lock the comparison and CTA copy in tests

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/informational-pages.test.tsx`

**Step 1: Write the failing test**

Add expectations that the five SEO pages render:

- a comparison section
- a specific comparison link
- a secondary CTA

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/informational-pages.test.tsx`

Expected: FAIL because the new comparison/CTA copy does not exist yet.

### Task 2: Implement the shared comparison and CTA model

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/public-seo-pages-content.tsx`

Add:

- comparison block data per page
- supporting CTA note
- secondary CTA per page

Render:

- comparison section before related guides
- dual CTA row inside the final conversion block

### Task 3: Add Search Console report summary logic

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/search-console-phase2-report.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/search-console-phase2-report.test.ts`

Add:

- tracked Phase 2 URLs
- indexed-state helper
- summary builder that returns totals, page rows, and markdown

### Task 4: Add a runnable monitoring script

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/scripts/search-console-phase2-report.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/package.json`

Add a script that:

- authenticates via ADC
- queries Search Analytics
- queries URL Inspection
- queries sitemap status
- prints markdown output

Add npm command:

- `npm run seo:search-console-phase2`

### Task 5: Verify and capture the first monitoring run

**Files:**
- Modify if needed: docs only if runtime assumptions need explanation

Run:

- `npm run lint`
- `npm test -- src/app/informational-pages.test.tsx src/lib/search-console-phase2-report.test.ts`
- `npm test`
- `npm run build`
- `npm run seo:search-console-phase2`

Expected:

- code is green
- report prints current impressions and indexed status for the five public SEO pages

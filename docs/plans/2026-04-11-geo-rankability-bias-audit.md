# GEO Rankability and Bias Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GEO rankability, citation-readiness, and bias-resistance layer based on LLM-as-recommender risks from arXiv:2603.17417.

**Architecture:** Extend the existing `auditGeoContent` result rather than creating a separate audit silo. Persist aggregate audit scores on GEO monitoring runs and expose them in the existing admin GEO Copilot panel.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, local/Firestore-backed JSON record stores.

---

### Task 1: Add RED tests for the expanded audit result

**Files:**
- Modify: `src/lib/geo-content-audit.test.ts`

**Step 1: Write failing tests**

Add tests that expect:

- `result.rankability.score` to be high for balanced Daily Sparks content
- `result.citationReadiness.score` to be high when IB / Goodnotes / Notion / parent workflow signals are present
- `result.biasResistance.score` to be low and issues to be present when content uses hype, bandwagon, unsupported authority, or instruction-like ranking language

**Step 2: Run RED**

Run: `npm test -- src/lib/geo-content-audit.test.ts`

Expected: fail because `rankability`, `citationReadiness`, and `biasResistance` do not exist.

### Task 2: Implement the audit scoring layer

**Files:**
- Modify: `src/lib/geo-content-audit.ts`

**Step 1: Add types**

Extend `GeoContentAuditResult` with:

- `rankability`
- `citationReadiness`
- `biasResistance`

**Step 2: Add scoring helpers**

Implement helpers for:

- candidate passage extraction
- entity/workflow/programme signal detection
- hype/authority/bandwagon/instruction/verbosity/distraction risk detection
- protective signal detection

**Step 3: Run GREEN**

Run: `npm test -- src/lib/geo-content-audit.test.ts`

Expected: pass.

### Task 3: Add monitoring run persistence

**Files:**
- Modify: `src/lib/geo-monitoring-run-schema.ts`
- Modify: `src/lib/geo-monitoring-run-store.ts`
- Modify: `src/lib/local-geo-monitoring-run-store.ts`
- Modify: `src/lib/firestore-geo-monitoring-run-store.ts`
- Modify: `src/lib/geo-monitoring.ts`
- Modify: `src/lib/geo-monitoring.test.ts`
- Modify: `src/lib/geo-monitoring-run-store.test.ts`
- Modify: `src/lib/operations-health.test.ts`
- Modify: `src/lib/operations-health-runner.test.ts`

**Step 1: Write failing monitoring assertions**

Assert monitoring runs include numeric `rankabilityScore`, `citationReadinessScore`, and `biasResistanceScore`.

**Step 2: Implement persistence**

Normalize missing historical fields to `0` in local and Firestore stores.

**Step 3: Feed monitoring audit**

Audit a source pack built from `llms.txt`, `llms-full.txt`, and the homepage SSR text.

**Step 4: Run tests**

Run: `npm test -- src/lib/geo-monitoring.test.ts src/lib/geo-monitoring-run-store.test.ts src/lib/operations-health.test.ts src/lib/operations-health-runner.test.ts`

Expected: pass.

### Task 4: Update admin API/UI contracts

**Files:**
- Modify: `src/app/api/admin/geo-content-audit/route.test.ts`
- Modify: `src/app/admin/editorial/geo-copilot/geo-copilot-panel.tsx`
- Modify: `src/app/admin/editorial/geo-copilot/geo-copilot-panel.test.tsx`

**Step 1: Write failing UI/API assertions**

Assert the API returns `rankability`, and admin markup contains:

- `Rankability`
- `Citation readiness`
- `Bias resistance`

**Step 2: Implement UI**

Render the new score cards and issue/suggestion lists without changing the existing admin workflow.

**Step 3: Run tests**

Run: `npm test -- src/app/api/admin/geo-content-audit/route.test.ts src/app/admin/editorial/geo-copilot/geo-copilot-panel.test.tsx`

Expected: pass.

### Task 5: Upgrade machine-readable source files

**Files:**
- Modify: `src/app/llms.txt/route.ts`
- Modify: `src/app/llms-full.txt/route.ts`

**Step 1: Add canonical routes**

Use `publicCanonicalRoutes` and `siteUrl` so the machine-readable source pack tracks public SEO pages automatically.

**Step 2: Add sourceable passages**

Add concise Daily Sparks passages for:

- parent-facing IB workflow
- MYP vs DP distinction
- Goodnotes and Notion workflow
- fit / not-fit boundaries

**Step 3: Verify route compilation**

Run: `npm test -- src/lib/geo-monitoring.test.ts`

Expected: pass and monitoring source pack scoring should improve.

### Task 6: Final verification

Run:

- `npm run lint`
- `npm test -- src/lib/geo-content-audit.test.ts src/lib/geo-monitoring.test.ts src/lib/geo-monitoring-run-store.test.ts src/app/api/admin/geo-content-audit/route.test.ts src/app/admin/editorial/geo-copilot/geo-copilot-panel.test.tsx`
- `npm run build`

Expected:

- no lint errors
- targeted tests pass
- production build completes

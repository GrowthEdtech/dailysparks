# GEO Copilot Admin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GEO Copilot module to the editorial admin so operators can manage golden prompts, inspect AI visibility logs, review machine-readability readiness, and run content optimization checks from one CMS-adjacent workspace.

**Architecture:** Extend the existing editorial admin shell with a new `GEO Copilot` tab, backed by local/Firestore store abstractions and admin-only App Router APIs. Keep the monitoring backend manual and audit-friendly for now, so future polling/vector-search work can attach to stable state models and UI surfaces.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, local JSON stores, Firestore Admin SDK, existing editorial admin auth.

---

### Task 1: Add GEO Copilot Tab To Editorial Admin Shell

**Files:**
- Modify: `src/app/admin/editorial/editorial-admin-tabs.tsx`
- Modify: `src/app/admin/editorial/editorial-admin-tabs.test.tsx`
- Modify: `src/app/admin/editorial/layout.tsx`
- Modify: `src/app/admin/editorial/layout.test.tsx`

### Task 2: Add GEO Prompt Schema And Store

**Files:**
- Create: `src/lib/geo-prompt-schema.ts`
- Create: `src/lib/geo-prompt-store.ts`
- Create: `src/lib/local-geo-prompt-store.ts`
- Create: `src/lib/firestore-geo-prompt-store.ts`
- Test: `src/lib/geo-prompt-store.test.ts`

### Task 3: Add GEO Visibility Log Schema And Store

**Files:**
- Create: `src/lib/geo-visibility-log-schema.ts`
- Create: `src/lib/geo-visibility-log-store.ts`
- Create: `src/lib/local-geo-visibility-log-store.ts`
- Create: `src/lib/firestore-geo-visibility-log-store.ts`
- Test: `src/lib/geo-visibility-log-store.test.ts`

### Task 4: Add Machine-Readability Status Schema And Store

**Files:**
- Create: `src/lib/geo-machine-readability-schema.ts`
- Create: `src/lib/geo-machine-readability-store.ts`
- Create: `src/lib/local-geo-machine-readability-store.ts`
- Create: `src/lib/firestore-geo-machine-readability-store.ts`
- Test: `src/lib/geo-machine-readability-store.test.ts`

### Task 5: Add Content Audit Evaluator

**Files:**
- Create: `src/lib/geo-content-audit.ts`
- Test: `src/lib/geo-content-audit.test.ts`

### Task 6: Add Admin API Routes

**Files:**
- Create: `src/app/api/admin/geo-prompts/route.ts`
- Create: `src/app/api/admin/geo-prompts/route.test.ts`
- Create: `src/app/api/admin/geo-visibility-logs/route.ts`
- Create: `src/app/api/admin/geo-visibility-logs/route.test.ts`
- Create: `src/app/api/admin/geo-machine-readability/route.ts`
- Create: `src/app/api/admin/geo-machine-readability/route.test.ts`
- Create: `src/app/api/admin/geo-content-audit/route.ts`
- Create: `src/app/api/admin/geo-content-audit/route.test.ts`

### Task 7: Build GEO Copilot Admin Page

**Files:**
- Create: `src/app/admin/editorial/geo-copilot/page.tsx`
- Create: `src/app/admin/editorial/geo-copilot/page.test.tsx`
- Create: `src/app/admin/editorial/geo-copilot/geo-copilot-panel.tsx`
- Create: `src/app/admin/editorial/geo-copilot/geo-copilot-panel.test.tsx`

### Task 8: Add Summary Helpers And UI Composition

**Files:**
- Create: `src/app/admin/editorial/geo-copilot/geo-copilot-helpers.ts`
- Create: `src/app/admin/editorial/geo-copilot/geo-copilot-helpers.test.ts`

### Task 9: Verify, Commit, Deploy

Run:
- `npm run lint`
- `npm test`
- `npm run build`

Deploy Cloud Run and smoke-test:
- GEO Copilot page shell
- geo prompts route unauthorized contract
- geo visibility logs route unauthorized contract
- geo content audit route unauthorized contract

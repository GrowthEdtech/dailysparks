# GEO Copilot Scheduled Monitoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a real GEO monitoring pipeline that runs on a schedule, writes visibility evidence automatically, refreshes machine-readability checks, and exposes run evidence in the admin GEO Copilot workspace.

**Architecture:** Build a shared monitoring runner behind one internal scheduler route and one admin-trigger route. Persist immutable monitoring runs, enrich visibility logs with provenance, add public machine-readable endpoints, and surface the results in the GEO Copilot UI.

**Tech Stack:** Next.js App Router, TypeScript, local/Firestore stores, server-side fetch, existing editorial admin auth, existing scheduler secret auth.

---

### Task 1: Add GEO Monitoring Run Schema And Store

**Files:**
- Create: `src/lib/geo-monitoring-run-schema.ts`
- Create: `src/lib/geo-monitoring-run-store.ts`
- Create: `src/lib/local-geo-monitoring-run-store.ts`
- Create: `src/lib/firestore-geo-monitoring-run-store.ts`
- Test: `src/lib/geo-monitoring-run-store.test.ts`

### Task 2: Enrich GEO Visibility Logs With Provenance

**Files:**
- Modify: `src/lib/geo-visibility-log-schema.ts`
- Modify: `src/lib/geo-visibility-log-store.ts`
- Modify: `src/lib/local-geo-visibility-log-store.ts`
- Modify: `src/lib/firestore-geo-visibility-log-store.ts`
- Test: `src/lib/geo-visibility-log-store.test.ts`

### Task 3: Add Public Machine-Readable Endpoints

**Files:**
- Create: `src/app/llms.txt/route.ts`
- Create: `src/app/llms-full.txt/route.ts`
- Modify: `src/app/layout.tsx`
- Test: `src/app/llms.txt/route.test.ts`
- Test: `src/app/llms-full.txt/route.test.ts`
- Test: `src/app/layout.test.ts`

### Task 4: Build Shared GEO Monitoring Runner

**Files:**
- Create: `src/lib/geo-monitoring.ts`
- Test: `src/lib/geo-monitoring.test.ts`

### Task 5: Add Internal Scheduler Route

**Files:**
- Create: `src/app/api/internal/geo-monitoring/run/route.ts`
- Test: `src/app/api/internal/geo-monitoring/run/route.test.ts`

### Task 6: Add Admin Manual Run Route

**Files:**
- Create: `src/app/api/admin/geo-monitoring/run/route.ts`
- Test: `src/app/api/admin/geo-monitoring/run/route.test.ts`

### Task 7: Surface Monitoring Runs In GEO Copilot Admin

**Files:**
- Modify: `src/app/admin/editorial/geo-copilot/page.tsx`
- Modify: `src/app/admin/editorial/geo-copilot/geo-copilot-panel.tsx`
- Modify: `src/app/admin/editorial/geo-copilot/geo-copilot-helpers.ts`
- Test: `src/app/admin/editorial/geo-copilot/page.test.tsx`
- Test: `src/app/admin/editorial/geo-copilot/geo-copilot-panel.test.tsx`
- Test: `src/app/admin/editorial/geo-copilot/geo-copilot-helpers.test.ts`

### Task 8: Add Scheduler Job Wiring

**Files:**
- Modify: `scripts/configure-daily-brief-scheduler.sh`
- Test: `bash -n scripts/configure-daily-brief-scheduler.sh`

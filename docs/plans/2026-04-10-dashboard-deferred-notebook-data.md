# Dashboard Deferred Notebook Data Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Speed up dashboard first render by deferring notebook and weekly recap data behind a dedicated authenticated API call.

**Architecture:** Move notebook-specific data gathering into a reusable server helper and expose it through `/api/dashboard/notebook`. Keep the dashboard page lightweight, then let the client-side dashboard form fetch notebook data after the shell has rendered.

**Tech Stack:** Next.js App Router, React client state/effects, Vitest

---

### Task 1: Write the failing tests

**Files:**
- Create: `src/app/api/dashboard/notebook/route.test.ts`
- Modify: `src/app/dashboard/page.test.tsx`
- Modify: `src/app/dashboard/dashboard-form.test.tsx`

**Steps:**
1. Add a route test for authenticated notebook payload loading
2. Update dashboard page tests to expect deferred loading instead of server-side notebook fetching
3. Add a dashboard form test for the notebook loading state
4. Run the targeted tests and confirm they fail before implementation

### Task 2: Add the shared notebook data builder and API route

**Files:**
- Create: `src/lib/dashboard-notebook-data-schema.ts`
- Create: `src/lib/dashboard-notebook-data.ts`
- Create: `src/app/api/dashboard/notebook/route.ts`

**Steps:**
1. Define a shared payload type for notebook data
2. Move the current dashboard notebook/recap fetch logic into a server helper
3. Expose that helper via an authenticated JSON route
4. Return `401` when the session or profile is missing

### Task 3: Lighten the dashboard page and defer notebook load

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/dashboard-form.tsx`

**Steps:**
1. Remove notebook/review data loading from `dashboard/page.tsx`
2. Pass a `deferNotebookData` signal into `DashboardForm`
3. Fetch `/api/dashboard/notebook` on mount inside `DashboardForm`
4. Add loading and retry UI for the notebook/review area
5. Refresh notebook state after notebook-related save/sync actions

### Task 4: Verify and ship

**Files:**
- Test: `src/app/api/dashboard/notebook/route.test.ts`
- Test: `src/app/dashboard/page.test.tsx`
- Test: `src/app/dashboard/dashboard-form.test.tsx`

**Steps:**
1. Run targeted tests for the new route and updated dashboard components
2. Run `npm run lint`
3. Run full `npm test`
4. Run `npm run build`

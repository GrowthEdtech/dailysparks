# Billing UI and Data Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a logged-in billing experience with a dedicated `/billing` page, dashboard entry point, and persisted monthly/yearly subscription plan selection.

**Architecture:** Extend the parent profile model with `subscriptionPlan`, persist it in both local and Firestore stores, add a dedicated authenticated `/api/billing` update route, then render billing summary UI in the dashboard and a full `/billing` page from the same billing helper definitions.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Firebase Auth session cookies, Firestore/local profile stores

---

### Task 1: Add failing store and route tests for billing selections

**Files:**
- Modify: `src/lib/mvp-store.test.ts`
- Modify: `src/app/api/auth-routes.test.ts`

**Step 1: Write the failing tests**

Add tests that expect:

- new parent profiles include `subscriptionPlan: null`
- billing plan updates persist to the parent profile
- `/api/billing` rejects invalid plan values
- `/api/billing` updates an authenticated parent profile

**Step 2: Run the focused tests**

Run: `npm test -- --run src/lib/mvp-store.test.ts src/app/api/auth-routes.test.ts`

Expected: FAIL because the data model and route do not exist yet.

### Task 2: Extend the parent profile store contract

**Files:**
- Modify: `src/lib/mvp-types.ts`
- Modify: `src/lib/profile-store.ts`
- Modify: `src/lib/mvp-store.ts`
- Modify: `src/lib/local-profile-store.ts`
- Modify: `src/lib/firestore-profile-store.ts`

**Step 1: Add the billing field**

Add `subscriptionPlan` to the parent record and normalize legacy records without it.

**Step 2: Add a parent billing update method**

Implement a store method that updates the selected billing cadence while preserving the current status.

### Task 3: Add the billing API and helper definitions

**Files:**
- Create: `src/app/api/billing/route.ts`
- Create: `src/lib/billing.ts`

**Step 1: Implement billing helpers**

Define the monthly/yearly plan cards and billing summary copy in one place.

**Step 2: Implement `/api/billing`**

Require a valid session, validate the plan, update the parent billing selection, and return the updated profile.

### Task 4: Render billing in the dashboard and create `/billing`

**Files:**
- Modify: `src/app/dashboard/dashboard-form.tsx`
- Create: `src/app/billing/page.tsx`
- Create: `src/app/billing/billing-form.tsx`

**Step 1: Update dashboard summary**

Replace the hardcoded workspace card with a billing-aware summary and add a `Manage billing` action.

**Step 2: Add `/billing`**

Create an authenticated billing page with:

- current status summary
- monthly/yearly cards
- save selection CTA
- return-to-dashboard action

### Task 5: Verify, deploy, and smoke test

**Files:**
- Modify: `README.md`

**Step 1: Run focused tests**

Run: `npm test -- --run src/lib/mvp-store.test.ts src/app/api/auth-routes.test.ts`

**Step 2: Run full verification**

Run:

- `npm test -- --run`
- `npm run lint`
- `npm run build`

**Step 3: Deploy**

Run: `./scripts/deploy-cloud-run.sh`

**Step 4: Smoke test**

Verify:

- `/dashboard` shows a billing entry
- `/billing` loads
- saved billing selection appears after refresh

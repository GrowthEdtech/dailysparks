# D2C Marketing Phase 4 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add attribution-aware marketing reporting and a trial-to-paid nurture sequence for Daily Sparks.

**Architecture:** Reuse the existing marketing lead store, referral invite store, parent profile milestones, notebook stores, transactional email design system, and internal scheduler auth. Keep attribution in the reporting layer and keep nurture state on the parent record through the existing notification email state update path.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, local/Firestore profile stores, Nodemailer-based transactional emails.

---

### Task 1: Document Phase 4

**Files:**
- Create: `docs/plans/2026-04-10-d2c-marketing-phase-4-design.md`
- Create: `docs/plans/2026-04-10-d2c-marketing-phase-4.md`

**Steps:**
1. Capture the practical attribution model.
2. Capture the trial-conversion nurture sequence.
3. Save the design and implementation plan before code changes.

### Task 2: Extend marketing reporting

**Files:**
- Modify: `src/lib/marketing-reporting.ts`
- Test: `src/lib/marketing-reporting.test.ts`

**Steps:**
1. Write failing tests for attribution buckets and paid activation counts.
2. Add practical source classification using referral and lead evidence.
3. Extend the summary type with attribution and trial lifecycle metrics.
4. Re-run the targeted test.

### Task 3: Update the admin marketing dashboard

**Files:**
- Modify: `src/app/admin/editorial/marketing/page.tsx`
- Test: `src/app/admin/editorial/marketing/page.test.tsx`

**Steps:**
1. Write failing UI assertions for attribution and trial lifecycle sections.
2. Add new cards and sections without disturbing the current admin visual rhythm.
3. Keep the page data fetch model simple and server-side.
4. Re-run the targeted test.

### Task 4: Add trial-conversion nurture state support

**Files:**
- Modify: `src/lib/mvp-types.ts`
- Modify: `src/lib/local-profile-store.ts`
- Modify: `src/lib/firestore-profile-store.ts`
- Test: `src/lib/mvp-store.test.ts`

**Steps:**
1. Write failing tests for updating parent trial-conversion nurture fields.
2. Extend the parent record and notification-state input with optional trial-conversion fields.
3. Implement store persistence in local and Firestore pathways.
4. Re-run the targeted store test.

### Task 5: Add trial-conversion nurture policy and email builder

**Files:**
- Create: `src/lib/trial-conversion-nurture.ts`
- Create: `src/lib/trial-conversion-nurture-email.ts`
- Test: `src/lib/trial-conversion-nurture.test.ts`
- Test: `src/lib/trial-conversion-nurture-email.test.ts`

**Steps:**
1. Write failing tests for due / skipped / completed assessment logic.
2. Write failing tests for stage 1 and stage 2 email copy.
3. Implement the assessment and email builder using notebook and recap counts.
4. Re-run the targeted tests.

### Task 6: Add the internal scheduler route

**Files:**
- Create: `src/app/api/internal/marketing/trial-conversion/run/route.ts`
- Test: `src/app/api/internal/marketing/trial-conversion/run/route.test.ts`
- Modify: `scripts/configure-daily-brief-scheduler.sh`

**Steps:**
1. Write failing route tests for auth, sent, skipped, and failed outcomes.
2. Implement the scheduler route using existing daily-brief scheduler auth helpers.
3. Add the new scheduler job to the configuration script.
4. Re-run the targeted tests.

### Task 7: Verification and release

**Files:**
- Review: all changed files above

**Steps:**
1. Run the focused tests for reporting, marketing admin, profile store, and trial-conversion nurture.
2. Run `npm test`.
3. Run `npm run build`.
4. Commit with a conventional commit.
5. Push and deploy.

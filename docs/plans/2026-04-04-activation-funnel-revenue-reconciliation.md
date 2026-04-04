# Activation Funnel + Revenue Reconciliation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn Daily Sparks from a runnable content pipeline into a measurable growth system that tracks activation milestones, first delivery, and paid conversion with honest admin and ops visibility.

**Architecture:** Keep the existing profile-store-first architecture and add a thin layer of growth milestones onto `ParentRecord` and `StudentRecord`, then derive funnel state and reconciliation summaries from those persisted timestamps plus existing delivery and billing state. Write milestone timestamps at the business edges we already control: profile completion, channel readiness, first successful brief delivery, and first paid activation.

**Tech Stack:** Next.js App Router, TypeScript, local JSON store + Firestore store, existing admin editorial surfaces, existing staged scheduler routes, Vitest.

---

### Task 1: Add Growth Milestone Schema And Derived Funnel Helper

**Files:**
- Modify: `src/lib/mvp-types.ts`
- Modify: `src/lib/profile-store.ts`
- Modify: `src/lib/local-profile-store.ts`
- Modify: `src/lib/firestore-profile-store.ts`
- Create: `src/lib/activation-funnel.ts`
- Create: `src/lib/activation-funnel.test.ts`
- Modify: `src/lib/mvp-store.test.ts`

**Step 1: Write the failing tests**

- Add tests for a new derived funnel helper that returns milestone timestamps and current stage for:
  - signed in only
  - child profile completed
  - first dispatchable channel ready
  - first brief delivered
  - paid activated
- Add store tests proving new milestone fields normalize, persist, and backfill safely.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/activation-funnel.test.ts src/lib/mvp-store.test.ts`
Expected: FAIL because the new milestone fields and helper do not exist yet.

**Step 3: Write minimal implementation**

- Add new optional milestone fields:
  - `childProfileCompletedAt`
  - `firstDispatchableChannelAt`
  - `firstBriefDeliveredAt`
  - `firstPaidAt`
- Normalize and persist them in both local and Firestore stores.
- Add `getActivationFunnelState(profile)` helper that derives the highest completed milestone and labels the current funnel stage.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/activation-funnel.test.ts src/lib/mvp-store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/mvp-types.ts src/lib/profile-store.ts src/lib/local-profile-store.ts src/lib/firestore-profile-store.ts src/lib/activation-funnel.ts src/lib/activation-funnel.test.ts src/lib/mvp-store.test.ts
git commit -m "feat: add activation funnel milestones"
```

### Task 2: Write Milestones At Business Edge Mutations

**Files:**
- Modify: `src/app/api/profile/route.ts`
- Modify: `src/lib/local-profile-store.ts`
- Modify: `src/lib/firestore-profile-store.ts`
- Modify: `src/lib/delivery-readiness.ts`
- Modify: `src/lib/delivery-health-rollup.ts`
- Modify: `src/lib/daily-brief-stage-delivery.ts`
- Modify: `src/lib/stripe.ts`
- Modify: `src/lib/stripe-backfill.ts`
- Modify: `src/lib/mvp-store.ts`
- Create: `src/lib/profile-growth-milestones.ts`
- Create: `src/lib/profile-growth-milestones.test.ts`

**Step 1: Write the failing tests**

- Add tests that:
  - set `childProfileCompletedAt` the first time a meaningful child profile is saved
  - set `firstDispatchableChannelAt` when a channel first becomes dispatchable
  - set `firstBriefDeliveredAt` on the first successful daily brief receipt
  - set `firstPaidAt` on the first paid subscription activation or invoice-paid backfill
  - never overwrite an already-recorded first milestone

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/profile-growth-milestones.test.ts src/lib/daily-brief-stage-delivery.test.ts src/lib/stripe-backfill.test.ts`
Expected: FAIL because the milestone writer does not exist yet.

**Step 3: Write minimal implementation**

- Add one small helper to apply “set once” milestone timestamps.
- Call it from:
  - student profile save path
  - delivery readiness transition path
  - successful brief delivery path
  - Stripe activation and invoice-paid backfill path

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/profile-growth-milestones.test.ts src/lib/daily-brief-stage-delivery.test.ts src/lib/stripe-backfill.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/profile/route.ts src/lib/local-profile-store.ts src/lib/firestore-profile-store.ts src/lib/delivery-readiness.ts src/lib/delivery-health-rollup.ts src/lib/daily-brief-stage-delivery.ts src/lib/stripe.ts src/lib/stripe-backfill.ts src/lib/mvp-store.ts src/lib/profile-growth-milestones.ts src/lib/profile-growth-milestones.test.ts
git commit -m "feat: record first growth milestones"
```

### Task 3: Add Reminder Run History And Operational Evidence

**Files:**
- Create: `src/lib/onboarding-reminder-history-schema.ts`
- Create: `src/lib/onboarding-reminder-history-store.ts`
- Create: `src/lib/local-onboarding-reminder-history-store.ts`
- Create: `src/lib/firestore-onboarding-reminder-history-store.ts`
- Modify: `src/app/api/internal/onboarding-reminder/run/route.ts`
- Create: `src/lib/onboarding-reminder-history-store.test.ts`
- Modify: `src/app/api/internal/onboarding-reminder/run/route.test.ts`

**Step 1: Write the failing tests**

- Add tests that each reminder run records:
  - run date/time
  - stage index
  - targeted parents
  - success/failure outcome
  - message id or error

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/onboarding-reminder-history-store.test.ts src/app/api/internal/onboarding-reminder/run/route.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

- Add a small reminder run history store with local and Firestore support.
- Persist immutable per-attempt records from the reminder route.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/onboarding-reminder-history-store.test.ts src/app/api/internal/onboarding-reminder/run/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/onboarding-reminder-history-schema.ts src/lib/onboarding-reminder-history-store.ts src/lib/local-onboarding-reminder-history-store.ts src/lib/firestore-onboarding-reminder-history-store.ts src/app/api/internal/onboarding-reminder/run/route.ts src/lib/onboarding-reminder-history-store.test.ts src/app/api/internal/onboarding-reminder/run/route.test.ts
git commit -m "feat: add onboarding reminder run history"
```

### Task 4: Add Admin Activation Funnel Dashboard

**Files:**
- Modify: `src/app/admin/editorial/users/page.tsx`
- Modify: `src/app/admin/editorial/users/[parentId]/page.tsx`
- Modify: `src/app/admin/editorial/users/users-admin-helpers.ts`
- Create: `src/app/admin/editorial/users/activation-funnel-summary.ts`
- Create: `src/app/admin/editorial/users/activation-funnel-summary.test.ts`
- Modify: `src/app/admin/editorial/users/page.test.tsx`
- Modify: `src/app/admin/editorial/users/[parentId]/page.test.tsx`

**Step 1: Write the failing tests**

- Add tests for:
  - top-level funnel counts
  - per-user milestone visibility
  - “stuck between milestones” callouts
  - paid-but-not-delivered warnings

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/editorial/users/activation-funnel-summary.test.ts src/app/admin/editorial/users/page.test.tsx src/app/admin/editorial/users/[parentId]/page.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

- Add a compact funnel summary card set to users admin.
- Show milestone timestamps and current funnel stage on user detail.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/editorial/users/activation-funnel-summary.test.ts src/app/admin/editorial/users/page.test.tsx src/app/admin/editorial/users/[parentId]/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/admin/editorial/users/page.tsx src/app/admin/editorial/users/[parentId]/page.tsx src/app/admin/editorial/users/users-admin-helpers.ts src/app/admin/editorial/users/activation-funnel-summary.ts src/app/admin/editorial/users/activation-funnel-summary.test.ts src/app/admin/editorial/users/page.test.tsx src/app/admin/editorial/users/[parentId]/page.test.tsx
git commit -m "feat: add activation funnel admin summary"
```

### Task 5: Add Daily Revenue And Delivery Reconciliation

**Files:**
- Create: `src/lib/growth-reconciliation.ts`
- Create: `src/lib/growth-reconciliation.test.ts`
- Create: `src/app/api/internal/growth-reconciliation/run/route.ts`
- Create: `src/app/api/internal/growth-reconciliation/run/route.test.ts`
- Modify: `src/app/admin/editorial/users/page.tsx`
- Modify: `scripts/configure-daily-brief-scheduler.sh`
- Modify: `README.md`

**Step 1: Write the failing tests**

- Add tests that summarize:
  - trials expiring soon without first brief
  - active families without dispatchable channel
  - active families without first successful delivery
  - reminder failures still blocking activation

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/growth-reconciliation.test.ts src/app/api/internal/growth-reconciliation/run/route.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

- Add a reconciliation helper and internal ops route.
- Add a scheduler job for daily reconciliation.
- Surface a compact reconciliation card in admin users.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/growth-reconciliation.test.ts src/app/api/internal/growth-reconciliation/run/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/growth-reconciliation.ts src/lib/growth-reconciliation.test.ts src/app/api/internal/growth-reconciliation/run/route.ts src/app/api/internal/growth-reconciliation/run/route.test.ts src/app/admin/editorial/users/page.tsx scripts/configure-daily-brief-scheduler.sh README.md
git commit -m "feat: add growth reconciliation workflow"
```

### Final Verification

Run:

```bash
npm run lint
npm test
npm run build
```

Expected:
- lint passes
- all tests pass
- production build passes


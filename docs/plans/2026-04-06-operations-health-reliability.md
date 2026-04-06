# Operations Health Reliability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an operations-health control plane with dashboard visibility, SLA alerts, and safe auto-remediation workflows.

**Architecture:** Reuse existing Daily Brief, planned notification, GEO, and billing evidence stores to compute a unified health snapshot. Persist immutable operations-health runs, expose them through a new admin page, and trigger existing internal workflows for retry/backfill/remonitoring when the policy says they are safe.

**Tech Stack:** Next.js app routes, React server/client components, Vitest, local/Firestore JSON stores, Cloud Scheduler, webhook-style alert emission.

---

### Task 1: Add failing tests for the health summary and remediation runner

**Files:**
- Create: `src/lib/operations-health.test.ts`
- Create: `src/lib/operations-health-runner.test.ts`

**Step 1: Write the failing tests**

Cover:

- Daily Brief + notification + GEO + billing health aggregation
- alert severity derivation
- auto-remediation action recording for retry-delivery, growth reconciliation, and geo-monitoring

**Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/lib/operations-health.test.ts src/lib/operations-health-runner.test.ts
```

**Step 3: Implement minimal logic**

Create the new summary builder and runner only after watching the tests fail.

**Step 4: Run tests to verify they pass**

Run the same command and expect green.

### Task 2: Add immutable operations-health run storage

**Files:**
- Create: `src/lib/operations-health-run-schema.ts`
- Create: `src/lib/operations-health-run-store.ts`
- Create: `src/lib/operations-health-run-store-types.ts`
- Create: `src/lib/local-operations-health-run-store.ts`
- Create: `src/lib/firestore-operations-health-run-store.ts`
- Create: `src/lib/operations-health-run-store.test.ts`

**Step 1: Write the failing store test**

Verify create/list normalization and descending ordering expectations.

**Step 2: Run it to verify RED**

```bash
npm test -- src/lib/operations-health-run-store.test.ts
```

**Step 3: Implement the store**

Use the existing local/Firestore run-store pattern already used by GEO monitoring.

**Step 4: Re-run**

Expect green.

### Task 3: Add routes for scheduled and manual health runs

**Files:**
- Create: `src/app/api/internal/operations-health/run/route.ts`
- Create: `src/app/api/internal/operations-health/run/route.test.ts`
- Create: `src/app/api/admin/operations-health/run/route.ts`
- Create: `src/app/api/admin/operations-health/run/route.test.ts`

**Step 1: Write failing route tests**

Cover:

- scheduler-secret auth for internal route
- admin auth for manual route
- successful runner response envelopes

**Step 2: Run tests**

```bash
npm test -- src/app/api/internal/operations-health/run/route.test.ts src/app/api/admin/operations-health/run/route.test.ts
```

**Step 3: Implement routes**

Keep routes thin and delegate to the shared runner.

**Step 4: Re-run route tests**

Expect green.

### Task 4: Add the Operations Health admin page

**Files:**
- Modify: `src/app/admin/editorial/editorial-admin-tabs.tsx`
- Create: `src/app/admin/editorial/operations-health/page.tsx`
- Create: `src/app/admin/editorial/operations-health/page.test.tsx`
- Create: `src/app/admin/editorial/operations-health/operations-health-panel.tsx`

**Step 1: Write the failing page test**

Assert the new tab/page renders:

- overall health
- alert summary
- remediation evidence
- run-now action

**Step 2: Run page test**

```bash
npm test -- src/app/admin/editorial/operations-health/page.test.tsx
```

**Step 3: Implement page and panel**

Use the same editorial admin visual language already used by GEO Copilot and Users.

**Step 4: Re-run**

Expect green.

### Task 5: Add scheduler configuration and final verification

**Files:**
- Modify: `scripts/configure-daily-brief-scheduler.sh`
- Modify: `README.md` if scheduler/operator docs need updating

**Step 1: Add the new scheduler job**

Schedule `operations-health` after growth reconciliation and GEO monitoring.

**Step 2: Run targeted verification**

```bash
npm test -- src/lib/operations-health.test.ts src/lib/operations-health-runner.test.ts src/lib/operations-health-run-store.test.ts src/app/api/internal/operations-health/run/route.test.ts src/app/api/admin/operations-health/run/route.test.ts src/app/admin/editorial/operations-health/page.test.tsx
npm run lint -- src/lib/operations-health.ts src/lib/operations-health-runner.ts src/lib/operations-health-run-schema.ts src/lib/operations-health-run-store.ts src/lib/local-operations-health-run-store.ts src/lib/firestore-operations-health-run-store.ts src/app/api/internal/operations-health/run/route.ts src/app/api/admin/operations-health/run/route.ts src/app/admin/editorial/operations-health/page.tsx src/app/admin/editorial/operations-health/operations-health-panel.tsx src/app/admin/editorial/editorial-admin-tabs.tsx scripts/configure-daily-brief-scheduler.sh
npm test
npm run build
```

**Step 3: Commit**

```bash
git add docs/plans/2026-04-06-operations-health-reliability-design.md docs/plans/2026-04-06-operations-health-reliability.md src/lib src/app/api/internal/operations-health src/app/api/admin/operations-health src/app/admin/editorial/operations-health src/app/admin/editorial/editorial-admin-tabs.tsx scripts/configure-daily-brief-scheduler.sh README.md
git commit -m "feat: add operations health reliability workflow"
```

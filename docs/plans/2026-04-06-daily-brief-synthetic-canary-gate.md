# Daily Brief Synthetic Canary Gate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a synthetic pre-delivery canary gate for production Daily Brief delivery, with automatic retry, hold-and-release behavior, and admin override controls.

**Architecture:** Extend the existing `DailyBriefHistoryRecord` with immutable synthetic canary evidence, run the gate inside the production deliver route, and expose admin release / rerun actions through a dedicated admin route and detail-panel UI.

**Tech Stack:** Next.js app routes, React server/client components, Vitest, local/Firestore history stores, Daily Brief ops alerts, Goodnotes delivery helper.

---

### Task 1: Add failing tests for the production gate

**Files:**
- Modify: `src/app/api/internal/daily-brief/deliver/route.test.ts`

**Step 1: Write the failing test**

Cover:

- synthetic canary runs before production delivery
- failed first attempt triggers one automatic retry
- second failure blocks the wave and skips official family delivery
- blocked brief stores canary evidence

**Step 2: Run the test to verify RED**

```bash
npm test -- src/app/api/internal/daily-brief/deliver/route.test.ts
```

**Step 3: Implement minimal gate logic**

Only after confirming the failure.

**Step 4: Re-run**

Expect green.

### Task 2: Add synthetic canary state to Daily Brief history

**Files:**
- Modify: `src/lib/daily-brief-history-schema.ts`
- Modify: `src/lib/daily-brief-history-store.ts`
- Modify: `src/lib/local-daily-brief-history-store.ts`
- Modify: `src/lib/firestore-daily-brief-history-store.ts`
- Create: `src/lib/daily-brief-synthetic-canary.ts`

**Step 1: Extend the schema**

Add immutable canary evidence fields:

- status
- target recipients
- attempt counters
- failure reason
- receipts / render audit snapshot
- release metadata

**Step 2: Normalize store reads/writes**

Ensure local and Firestore stores both persist and hydrate the new shape.

**Step 3: Implement helper**

Create a shared helper that:

- resolves healthy canary targets
- performs the canary send
- retries once
- returns the updated canary state

### Task 3: Add admin release / rerun controls

**Files:**
- Create: `src/app/api/admin/daily-brief-synthetic-canary-action/route.ts`
- Create: `src/app/api/admin/daily-brief-synthetic-canary-action/route.test.ts`
- Create: `src/app/admin/editorial/daily-briefs/[briefId]/synthetic-canary-panel.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/page.tsx`

**Step 1: Write failing route and page tests**

Cover:

- authenticated `release`
- authenticated `rerun`
- blocked-by-canary detail visibility
- list badge visibility

**Step 2: Run tests**

```bash
npm test -- src/app/api/admin/daily-brief-synthetic-canary-action/route.test.ts 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'
```

**Step 3: Implement UI + route**

Add:

- detail panel
- rerun button
- release button with note
- list badge and blocked summary line

**Step 4: Re-run**

Expect green.

### Task 4: Final verification and rollout

**Files:**
- Add docs:
  - `docs/plans/2026-04-06-daily-brief-synthetic-canary-gate-design.md`
  - `docs/plans/2026-04-06-daily-brief-synthetic-canary-gate.md`

**Step 1: Run targeted verification**

```bash
npm test -- src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/admin/daily-brief-synthetic-canary-action/route.test.ts 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'
npm run lint -- src/lib/daily-brief-history-schema.ts src/lib/daily-brief-history-store.ts src/lib/local-daily-brief-history-store.ts src/lib/firestore-daily-brief-history-store.ts src/lib/daily-brief-synthetic-canary.ts src/app/api/internal/daily-brief/deliver/route.ts src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/admin/daily-brief-synthetic-canary-action/route.ts src/app/api/admin/daily-brief-synthetic-canary-action/route.test.ts 'src/app/admin/editorial/daily-briefs/[briefId]/page.tsx' 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx' 'src/app/admin/editorial/daily-briefs/[briefId]/synthetic-canary-panel.tsx' src/app/admin/editorial/daily-briefs/page.tsx
npm test
npm run build
```

**Step 2: Commit**

```bash
git add docs/plans/2026-04-06-daily-brief-synthetic-canary-gate-design.md docs/plans/2026-04-06-daily-brief-synthetic-canary-gate.md src/lib/daily-brief-history-schema.ts src/lib/daily-brief-history-store.ts src/lib/local-daily-brief-history-store.ts src/lib/firestore-daily-brief-history-store.ts src/lib/daily-brief-synthetic-canary.ts src/app/api/internal/daily-brief/deliver/route.ts src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/internal/daily-brief/run/route.test.ts src/app/api/admin/daily-brief-synthetic-canary-action/route.ts src/app/api/admin/daily-brief-synthetic-canary-action/route.test.ts 'src/app/admin/editorial/daily-briefs/[briefId]/page.tsx' 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx' 'src/app/admin/editorial/daily-briefs/[briefId]/synthetic-canary-panel.tsx' src/app/admin/editorial/daily-briefs/page.tsx
git commit -m "feat: add daily brief synthetic canary gate"
```

# Notebook Weekly Recap Delivery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add scheduled weekly recap generation, parent recap email delivery, and dashboard recap history on top of the persisted weekly notebook recap model.

**Architecture:** Extend the existing weekly recap store with generation and email delivery metadata, then add a shared recap delivery service that both manual routes and the new scheduled route can reuse. Surface persisted recap history in the dashboard by loading multiple weekly recap records and rendering a list/detail history view next to the current-week recap card.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Cloud Scheduler internal routes, Nodemailer transactional email, existing Notion sync helpers.

---

### Task 1: Write the design and implementation docs

**Files:**
- Create: `docs/plans/2026-04-08-notebook-weekly-recap-delivery-design.md`
- Create: `docs/plans/2026-04-08-notebook-weekly-recap-delivery.md`

**Step 1: Write the design doc**

Capture:

- Sunday 18:00 Hong Kong schedule
- parent-only lightweight recap email
- persisted history and single-source-of-truth recap model
- scheduler, Notion, and dashboard behavior

**Step 2: Write this implementation plan**

Document the TDD execution path so a fresh engineer can implement safely.

### Task 2: Add failing tests for recap email, scheduler delivery, and dashboard history

**Files:**
- Create: `src/lib/daily-brief-notebook-weekly-recap-email.test.ts`
- Create: `src/lib/daily-brief-notebook-weekly-recap-delivery.test.ts`
- Create: `src/app/api/internal/notebook/weekly-recap/run/route.test.ts`
- Modify: `src/app/dashboard/dashboard-form.test.tsx`
- Modify: `src/app/dashboard/page.test.tsx`

**Step 1: Write the failing email builder test**

Assert the recap email includes:

- week label
- summary lines
- retrieval prompts
- dashboard CTA

**Step 2: Write the failing delivery service test**

Assert the shared service:

- skips when no entries exist
- persists recap content
- preserves retrieval responses across refresh
- syncs Notion when connected
- sends email only once for the week on successful send

**Step 3: Write the failing scheduler route test**

Assert the internal route:

- rejects missing scheduler auth
- processes active `MYP / DP` profiles only
- returns delivery summary counts

**Step 4: Extend the dashboard tests**

Assert the dashboard renders:

- `Recap history`
- a history list row
- history detail metadata

**Step 5: Run tests to verify RED**

```bash
npm test -- src/lib/daily-brief-notebook-weekly-recap-email.test.ts src/lib/daily-brief-notebook-weekly-recap-delivery.test.ts src/app/api/internal/notebook/weekly-recap/run/route.test.ts src/app/dashboard/dashboard-form.test.tsx src/app/dashboard/page.test.tsx
```

Expected: FAIL because the email builder, delivery service, route, and history UI do not exist yet.

### Task 3: Extend weekly recap persistence for scheduled delivery metadata

**Files:**
- Modify: `src/lib/daily-brief-notebook-weekly-recap-store-schema.ts`
- Modify: `src/lib/daily-brief-notebook-weekly-recap-store-types.ts`
- Modify: `src/lib/daily-brief-notebook-weekly-recap-store.ts`
- Modify: `src/lib/local-daily-brief-notebook-weekly-recap-store.ts`
- Modify: `src/lib/firestore-daily-brief-notebook-weekly-recap-store.ts`

**Step 1: Add recap delivery metadata fields**

Add:

- `generationSource`
- `emailLastSentAt`
- `emailLastStatus`
- `emailLastMessageId`
- `emailLastErrorMessage`

**Step 2: Add helper updates**

Add focused helpers to update:

- Notion sync metadata
- recap email delivery metadata

**Step 3: Re-run the store tests**

```bash
npm test -- src/lib/daily-brief-notebook-weekly-recap-store.test.ts
```

Expected: PASS after store normalization and metadata persistence are wired in.

### Task 4: Implement recap email and shared weekly delivery service

**Files:**
- Create: `src/lib/daily-brief-notebook-weekly-recap-email.ts`
- Create: `src/lib/daily-brief-notebook-weekly-recap-delivery.ts`
- Modify: `src/lib/daily-brief-notebook-notion-sync.ts`
- Modify: `src/app/api/notebook/weekly-recap/save/route.ts`
- Modify: `src/app/api/notebook/weekly-recap/sync/route.ts`

**Step 1: Implement the recap email builder and sender**

Use the shared notification email design system to create a lightweight parent-facing recap email.

**Step 2: Implement the shared delivery service**

It should:

- load notebook entries
- build the recap
- persist or refresh the recap
- optionally sync Notion
- optionally send recap email with dedupe

**Step 3: Reuse the service in manual save/sync routes**

Keep manual routes behavior-compatible while removing duplicated recap-building logic.

**Step 4: Re-run targeted tests**

```bash
npm test -- src/lib/daily-brief-notebook-weekly-recap-email.test.ts src/lib/daily-brief-notebook-weekly-recap-delivery.test.ts src/app/api/notebook/weekly-recap/save/route.test.ts src/app/api/notebook/weekly-recap/sync/route.test.ts
```

Expected: PASS.

### Task 5: Add scheduled recap delivery route and scheduler job wiring

**Files:**
- Create: `src/app/api/internal/notebook/weekly-recap/run/route.ts`
- Modify: `scripts/configure-daily-brief-scheduler.sh`
- Modify: `src/lib/programme-availability-policy.ts` only if a helper is needed for active recap programmes

**Step 1: Add the protected internal route**

Use the existing scheduler secret pattern and run recap delivery for active profiles.

**Step 2: Add the scheduler job spec**

Configure a new weekly job at Sunday 18:00 `Asia/Hong_Kong`.

**Step 3: Re-run route tests**

```bash
npm test -- src/app/api/internal/notebook/weekly-recap/run/route.test.ts
```

Expected: PASS.

### Task 6: Add dashboard recap history list/detail view

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/dashboard-form.tsx`
- Create: `src/app/dashboard/weekly-recap-history.ts`
- Modify: `src/app/dashboard/dashboard-form.test.tsx`
- Modify: `src/app/dashboard/page.test.tsx`

**Step 1: Load recap history records**

Fetch multiple persisted recap records in the server page loader.

**Step 2: Add history helper**

Create a small helper to sort records and resolve the selected recap.

**Step 3: Render list/detail history UI**

Show:

- history list
- selected recap detail
- email and Notion status metadata
- latest recap selected by default

**Step 4: Re-run dashboard tests**

```bash
npm test -- src/app/dashboard/dashboard-form.test.tsx src/app/dashboard/page.test.tsx
```

Expected: PASS.

### Task 7: Run verification and commit

**Files:**
- Create: `docs/plans/2026-04-08-notebook-weekly-recap-delivery-design.md`
- Create: `docs/plans/2026-04-08-notebook-weekly-recap-delivery.md`
- Create: `src/lib/daily-brief-notebook-weekly-recap-email.ts`
- Create: `src/lib/daily-brief-notebook-weekly-recap-email.test.ts`
- Create: `src/lib/daily-brief-notebook-weekly-recap-delivery.ts`
- Create: `src/lib/daily-brief-notebook-weekly-recap-delivery.test.ts`
- Create: `src/app/api/internal/notebook/weekly-recap/run/route.ts`
- Create: `src/app/api/internal/notebook/weekly-recap/run/route.test.ts`
- Create: `src/app/dashboard/weekly-recap-history.ts`
- Modify: `src/lib/daily-brief-notebook-weekly-recap-store-schema.ts`
- Modify: `src/lib/daily-brief-notebook-weekly-recap-store-types.ts`
- Modify: `src/lib/daily-brief-notebook-weekly-recap-store.ts`
- Modify: `src/lib/local-daily-brief-notebook-weekly-recap-store.ts`
- Modify: `src/lib/firestore-daily-brief-notebook-weekly-recap-store.ts`
- Modify: `src/lib/daily-brief-notebook-notion-sync.ts`
- Modify: `src/app/api/notebook/weekly-recap/save/route.ts`
- Modify: `src/app/api/notebook/weekly-recap/sync/route.ts`
- Modify: `scripts/configure-daily-brief-scheduler.sh`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/dashboard-form.tsx`
- Modify: `src/app/dashboard/dashboard-form.test.tsx`
- Modify: `src/app/dashboard/page.test.tsx`

**Step 1: Run targeted verification**

```bash
npm test -- src/lib/daily-brief-notebook-weekly-recap-email.test.ts src/lib/daily-brief-notebook-weekly-recap-delivery.test.ts src/app/api/internal/notebook/weekly-recap/run/route.test.ts src/app/dashboard/dashboard-form.test.tsx src/app/dashboard/page.test.tsx
npm run lint -- src/lib/daily-brief-notebook-weekly-recap-email.ts src/lib/daily-brief-notebook-weekly-recap-email.test.ts src/lib/daily-brief-notebook-weekly-recap-delivery.ts src/lib/daily-brief-notebook-weekly-recap-delivery.test.ts src/app/api/internal/notebook/weekly-recap/run/route.ts src/app/api/internal/notebook/weekly-recap/run/route.test.ts src/app/dashboard/page.tsx src/app/dashboard/dashboard-form.tsx src/app/dashboard/weekly-recap-history.ts src/app/dashboard/dashboard-form.test.tsx src/app/dashboard/page.test.tsx
```

**Step 2: Run full verification**

```bash
npm test
npm run build
```

**Step 3: Commit**

```bash
git add docs/plans/2026-04-08-notebook-weekly-recap-delivery-design.md docs/plans/2026-04-08-notebook-weekly-recap-delivery.md src/lib/daily-brief-notebook-weekly-recap-email.ts src/lib/daily-brief-notebook-weekly-recap-email.test.ts src/lib/daily-brief-notebook-weekly-recap-delivery.ts src/lib/daily-brief-notebook-weekly-recap-delivery.test.ts src/app/api/internal/notebook/weekly-recap/run/route.ts src/app/api/internal/notebook/weekly-recap/run/route.test.ts src/app/dashboard/weekly-recap-history.ts src/lib/daily-brief-notebook-weekly-recap-store-schema.ts src/lib/daily-brief-notebook-weekly-recap-store-types.ts src/lib/daily-brief-notebook-weekly-recap-store.ts src/lib/local-daily-brief-notebook-weekly-recap-store.ts src/lib/firestore-daily-brief-notebook-weekly-recap-store.ts src/lib/daily-brief-notebook-notion-sync.ts src/app/api/notebook/weekly-recap/save/route.ts src/app/api/notebook/weekly-recap/sync/route.ts scripts/configure-daily-brief-scheduler.sh src/app/dashboard/page.tsx src/app/dashboard/dashboard-form.tsx src/app/dashboard/dashboard-form.test.tsx src/app/dashboard/page.test.tsx
git commit -m "feat: automate weekly notebook recap delivery"
```

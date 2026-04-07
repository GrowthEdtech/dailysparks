# Operations Health Handoff Summary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a client-side shift-handoff summary to the Operations Health page with copy-to-clipboard and TXT download actions.

**Architecture:** Introduce a shared handoff-summary builder that derives a Markdown/TXT memo from the current `OperationsHealthSnapshot`, latest immutable run, recent alerts, and recent remediation actions. Render that output in the existing client panel and attach light client-side actions for copy and download.

**Tech Stack:** Next.js client components, TypeScript helpers, Vitest, browser clipboard/download APIs.

---

### Task 1: Write the handoff summary design and implementation docs

**Files:**
- Create: `docs/plans/2026-04-07-operations-health-handoff-design.md`
- Create: `docs/plans/2026-04-07-operations-health-handoff.md`

**Step 1: Write the design doc**

Capture:

- why operators need a one-click handoff
- the client-side export recommendation
- the summary structure
- non-goals and success criteria

**Step 2: Write this implementation plan**

Make the execution path explicit for a fresh engineer.

### Task 2: Add failing tests for the handoff summary

**Files:**
- Create: `src/app/admin/editorial/operations-health/operations-health-handoff.test.ts`
- Modify: `src/app/admin/editorial/operations-health/page.test.tsx`

**Step 1: Write the failing helper test**

Assert the generated summary includes:

- header with status and run date
- Daily Brief / alert / billing / GEO snapshot lines
- recent alert titles
- recent remediation actions
- a recommended handoff note

**Step 2: Extend the page test**

Assert the page renders:

- `Shift handoff summary`
- `Copy Markdown`
- `Download TXT`

**Step 3: Run tests to verify RED**

```bash
npm test -- src/app/admin/editorial/operations-health/operations-health-handoff.test.ts src/app/admin/editorial/operations-health/page.test.tsx
```

Expected: FAIL because the helper and UI do not exist yet.

### Task 3: Implement the handoff builder and UI actions

**Files:**
- Create: `src/app/admin/editorial/operations-health/operations-health-handoff.ts`
- Modify: `src/app/admin/editorial/operations-health/operations-health-panel.tsx`

**Step 1: Implement the summary builder**

Export a function that accepts:

- snapshot
- latest run

and returns a Markdown/TXT handoff summary string.

**Step 2: Implement the UI**

Add a new `Shift handoff summary` card that:

- previews the generated summary
- copies it to clipboard
- downloads it as `.txt`

**Step 3: Re-run the targeted tests**

```bash
npm test -- src/app/admin/editorial/operations-health/operations-health-handoff.test.ts src/app/admin/editorial/operations-health/page.test.tsx
```

Expected: PASS.

### Task 4: Run verification and commit

**Files:**
- Create: `docs/plans/2026-04-07-operations-health-handoff-design.md`
- Create: `docs/plans/2026-04-07-operations-health-handoff.md`
- Create: `src/app/admin/editorial/operations-health/operations-health-handoff.ts`
- Create: `src/app/admin/editorial/operations-health/operations-health-handoff.test.ts`
- Modify: `src/app/admin/editorial/operations-health/operations-health-panel.tsx`
- Modify: `src/app/admin/editorial/operations-health/page.test.tsx`

**Step 1: Run targeted verification**

```bash
npm test -- src/app/admin/editorial/operations-health/operations-health-handoff.test.ts src/app/admin/editorial/operations-health/page.test.tsx
npm run lint -- src/app/admin/editorial/operations-health/operations-health-panel.tsx src/app/admin/editorial/operations-health/operations-health-handoff.ts src/app/admin/editorial/operations-health/operations-health-handoff.test.ts src/app/admin/editorial/operations-health/page.test.tsx
```

**Step 2: Run full verification**

```bash
npm test
npm run build
```

**Step 3: Commit**

```bash
git add docs/plans/2026-04-07-operations-health-handoff-design.md docs/plans/2026-04-07-operations-health-handoff.md src/app/admin/editorial/operations-health/operations-health-panel.tsx src/app/admin/editorial/operations-health/operations-health-handoff.ts src/app/admin/editorial/operations-health/operations-health-handoff.test.ts src/app/admin/editorial/operations-health/page.test.tsx
git commit -m "feat: add operations health handoff summary"
```

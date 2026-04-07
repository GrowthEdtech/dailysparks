# Operations Health Stabilization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a production stabilization checklist, ops drill plan, and incident runbook quick-entry section to the Operations Health admin page, with full reference docs stored in `docs/plans`.

**Architecture:** Keep the new operating guidance content in a shared typed helper near the Operations Health page. Render a new `Ops readiness` section in the existing panel so operators can scan the guidance next to live health signals. Preserve the canonical design and implementation docs in `docs/plans` and keep the UI content intentionally concise.

**Tech Stack:** Next.js app router, React client components, TypeScript, Vitest, existing admin editorial UI patterns.

---

### Task 1: Add the design docs for stabilization, drills, and runbook guidance

**Files:**
- Create: `docs/plans/2026-04-07-operations-health-stabilization-design.md`
- Create: `docs/plans/2026-04-07-operations-health-stabilization.md`

**Step 1: Write the design doc**

Document:

- why the operator layer is needed now
- the recommended `docs + admin quick entry` approach
- the 3-card `Ops readiness` scope
- non-goals and success criteria

**Step 2: Write this implementation plan**

Make the plan explicit enough that a fresh engineer could execute it without prior session context.

### Task 2: Add a failing page test for the new Ops readiness section

**Files:**
- Modify: `src/app/admin/editorial/operations-health/page.test.tsx`

**Step 1: Write the failing assertions**

Assert that the Operations Health page renders:

- `Ops readiness`
- `Production stabilization checklist`
- `Ops drill plan`
- `Incident runbook / SOP`
- at least one concrete action/evidence line from each card

**Step 2: Run the targeted test to verify RED**

```bash
npm test -- src/app/admin/editorial/operations-health/page.test.tsx
```

Expected: FAIL because the new section does not exist yet.

### Task 3: Implement shared readiness content and render the admin quick-entry cards

**Files:**
- Create: `src/app/admin/editorial/operations-health/operations-health-readiness.ts`
- Modify: `src/app/admin/editorial/operations-health/operations-health-panel.tsx`

**Step 1: Add the shared readiness content**

Create typed content for:

- checklist
- drills
- runbook

Include:

- title
- purpose
- 4-6 short bullet items
- canonical docs path label

**Step 2: Implement the UI**

Add a new `Ops readiness` section below the existing summary cards and before the lower evidence grid.

Render:

- one card per readiness module
- compact action bullets
- doc path reference

**Step 3: Re-run the page test**

```bash
npm test -- src/app/admin/editorial/operations-health/page.test.tsx
```

Expected: PASS.

### Task 4: Verify the full slice and commit

**Files:**
- Modify: `src/app/admin/editorial/operations-health/page.test.tsx`
- Modify: `src/app/admin/editorial/operations-health/operations-health-panel.tsx`
- Create: `src/app/admin/editorial/operations-health/operations-health-readiness.ts`
- Create: `docs/plans/2026-04-07-operations-health-stabilization-design.md`
- Create: `docs/plans/2026-04-07-operations-health-stabilization.md`

**Step 1: Run targeted verification**

```bash
npm test -- src/app/admin/editorial/operations-health/page.test.tsx
npm run lint -- src/app/admin/editorial/operations-health/page.tsx src/app/admin/editorial/operations-health/page.test.tsx src/app/admin/editorial/operations-health/operations-health-panel.tsx src/app/admin/editorial/operations-health/operations-health-readiness.ts
```

**Step 2: Run full verification**

```bash
npm test
npm run build
```

**Step 3: Commit**

```bash
git add docs/plans/2026-04-07-operations-health-stabilization-design.md docs/plans/2026-04-07-operations-health-stabilization.md src/app/admin/editorial/operations-health/page.test.tsx src/app/admin/editorial/operations-health/operations-health-panel.tsx src/app/admin/editorial/operations-health/operations-health-readiness.ts
git commit -m "feat: add operations health readiness guides"
```

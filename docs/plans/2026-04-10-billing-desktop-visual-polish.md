# Billing Desktop Visual Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the authenticated desktop `/billing` page feel visually balanced by aligning card heights, plan CTAs, and header rhythm.

**Architecture:** Keep the existing three-card desktop billing board and refine it with layout-only changes. Update shared billing style constants, adjust the billing form markup to support flex-based card structure, and lock the new desktop rhythm with focused tests before running the full verification loop.

**Tech Stack:** Next.js App Router, React, Tailwind utility classes, Vitest

---

### Task 1: Document the desktop polish target

**Files:**
- Create: `docs/plans/2026-04-10-billing-desktop-visual-polish-design.md`
- Create: `docs/plans/2026-04-10-billing-desktop-visual-polish.md`

**Step 1: Write the design summary**

Capture the desktop-only goals: equalized card rhythm, bottom-aligned CTAs, and a more intentional header baseline.

**Step 2: Write the implementation plan**

Describe the style constants, component markup, tests, verification, and deploy steps in small actions.

**Step 3: Save the docs**

Keep the plan in `docs/plans` alongside the earlier billing desktop docs.

### Task 2: Write the failing desktop layout tests

**Files:**
- Modify: `src/app/billing/billing-form.test.tsx`
- Modify: `src/app/billing/billing-form.styles.test.ts`

**Step 1: Write the failing style assertions**

Assert that the desktop header shell uses centered alignment and a desktop min-height, and that the desktop pricing board exposes stretch/equal-height behavior.

**Step 2: Write the failing markup assertions**

Assert that the rendered billing markup includes flex-column desktop card structure and bottom-aligned plan CTA placement.

**Step 3: Run focused tests to verify failure**

Run:

```bash
npm test -- src/app/billing/billing-form.test.tsx src/app/billing/billing-form.styles.test.ts
```

Expected: failing assertions around new header/card alignment classes.

### Task 3: Implement the desktop visual polish

**Files:**
- Modify: `src/app/billing/billing-form.styles.ts`
- Modify: `src/app/billing/billing-form.tsx`

**Step 1: Update shared billing shell classes**

Add desktop-centered header rhythm, a stronger desktop board stretch rule, and any helper class changes needed for the refined layout.

**Step 2: Refine the billing form markup**

Convert desktop cards into full-height flex columns, let the content area expand, and anchor plan buttons to the bottom.

**Step 3: Keep behavior intact**

Do not alter billing copy, Stripe actions, or invoice logic while restructuring the markup.

### Task 4: Verify the polish

**Files:**
- Modify: `src/app/billing/billing-form.test.tsx`
- Modify: `src/app/billing/billing-form.styles.test.ts`

**Step 1: Run focused billing tests**

Run:

```bash
npm test -- src/app/billing/billing-form.test.tsx src/app/billing/billing-form.styles.test.ts
```

Expected: PASS

**Step 2: Run full verification**

Run:

```bash
npm test
npm run build
```

Expected: PASS, with only the known Turbopack NFT warning.

### Task 5: Release from the isolated billing worktree

**Files:**
- Modify: `src/app/billing/billing-form.tsx`
- Modify: `src/app/billing/billing-form.styles.ts`
- Modify: `src/app/billing/billing-form.test.tsx`
- Modify: `src/app/billing/billing-form.styles.test.ts`
- Create: `docs/plans/2026-04-10-billing-desktop-visual-polish-design.md`
- Create: `docs/plans/2026-04-10-billing-desktop-visual-polish.md`

**Step 1: Commit**

```bash
git add docs/plans/2026-04-10-billing-desktop-visual-polish-design.md \
        docs/plans/2026-04-10-billing-desktop-visual-polish.md \
        src/app/billing/billing-form.tsx \
        src/app/billing/billing-form.styles.ts \
        src/app/billing/billing-form.test.tsx \
        src/app/billing/billing-form.styles.test.ts
git commit -m "fix: polish billing desktop rhythm"
```

**Step 2: Push**

```bash
git push origin codex/billing-desktop-layout
git push origin codex/billing-desktop-layout:main
```

**Step 3: Deploy**

```bash
bash scripts/deploy-cloud-run.sh
```

**Step 4: Smoke**

Run:

```bash
curl -sSI https://dailysparks.geledtech.com/login
curl -sSI https://dailysparks.geledtech.com/billing
```

Expected: `/login` returns `200`, `/billing` redirects to `/login` when unauthenticated.

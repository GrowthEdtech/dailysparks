# Billing Desktop Balance Pass 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebalance the desktop `/billing` layout so the main subscription summary and two pricing plans sit in one three-card row, reducing unused right-side space.

**Architecture:** Keep billing logic untouched and only rework the responsive page shell. Update the render regression first, widen the desktop shell, replace the two-column summary/plan split with a single three-column board, then verify with targeted tests and a production build.

**Tech Stack:** Next.js App Router, React, Tailwind utility classes, Vitest

---

### Task 1: Update the failing render regression

**Files:**
- Modify: `/tmp/dailysparks-web-billing-desktop/src/app/billing/billing-form.test.tsx`

**Step 1: Write the failing expectations**

- Assert the desktop billing page now renders:
  - `max-w-7xl`
  - `xl:grid-cols-3`
- Remove the old sticky sidebar expectation.

**Step 2: Run the focused test**

Run: `npm test -- src/app/billing/billing-form.test.tsx`

Expected: FAIL until the layout constants and component structure are updated.

### Task 2: Update responsive layout constants

**Files:**
- Modify: `/tmp/dailysparks-web-billing-desktop/src/app/billing/billing-form.styles.ts`
- Modify: `/tmp/dailysparks-web-billing-desktop/src/app/billing/billing-form.styles.test.ts`

**Step 1: Replace the old desktop shell constants**

- Increase header/main shell width to `max-w-7xl`
- Replace the old split-grid constants with a single desktop board constant

**Step 2: Run focused tests**

Run: `npm test -- src/app/billing/billing-form.test.tsx src/app/billing/billing-form.styles.test.ts`

Expected: still failing until the component uses the new constants.

### Task 3: Rework the billing component structure

**Files:**
- Modify: `/tmp/dailysparks-web-billing-desktop/src/app/billing/billing-form.tsx`

**Step 1: Move alerts above the board**

- Keep canceled/error messages visible before the primary billing cards.

**Step 2: Build the three-card board**

- Render `Current subscription`, `Monthly`, and `Yearly` in one desktop grid.
- Keep invoice delivery below the board.
- Keep the back CTA below the content stack.

**Step 3: Run focused tests**

Run: `npm test -- src/app/billing/billing-form.test.tsx src/app/billing/billing-form.styles.test.ts`

Expected: PASS

### Task 4: Full verification

**Files:**
- Modify: none unless verification exposes regressions

**Step 1: Run focused tests**

Run: `npm test -- src/app/billing/billing-form.test.tsx src/app/billing/billing-form.styles.test.ts`

Expected: PASS

**Step 2: Run production build**

Run: `npm run build`

Expected: PASS

### Task 5: Commit

```bash
git add docs/plans/2026-04-10-billing-desktop-balance-pass-2-design.md docs/plans/2026-04-10-billing-desktop-balance-pass-2.md src/app/billing/billing-form.tsx src/app/billing/billing-form.styles.ts src/app/billing/billing-form.styles.test.ts src/app/billing/billing-form.test.tsx
git commit -m "fix: rebalance billing desktop layout"
```

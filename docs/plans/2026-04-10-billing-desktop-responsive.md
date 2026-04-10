# Billing Desktop Responsive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the `/billing` page so desktop viewports use a responsive two-column subscription layout instead of the current mobile-width single column.

**Architecture:** Keep the current billing business logic intact and limit this change to the page shell. Introduce reusable layout class constants for the billing page, lock the expected desktop structure with a render test, then swap the page shell to a wider responsive grid with a dedicated summary sidebar and pricing area.

**Tech Stack:** Next.js App Router, React, Tailwind utility classes, Vitest, React server-side markup tests

---

### Task 1: Add the failing desktop layout regression test

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/billing/billing-form.test.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/billing/billing-form.styles.ts`

**Step 1: Write the failing test**

- Render `BillingForm` with a realistic trial profile.
- Assert the markup includes the planned desktop shell classes for:
  - widened header shell
  - widened main shell
  - desktop two-column grid
  - desktop pricing grid

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/billing/billing-form.test.tsx`

Expected: FAIL because the current page still uses `max-w-md` mobile-only layout classes.

### Task 2: Add responsive billing layout class constants

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/billing/billing-form.styles.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/billing/billing-form.styles.test.ts`

**Step 1: Write minimal implementation**

- Add named class constants for:
  - header shell
  - main shell
  - content grid
  - summary sidebar
  - pricing grid

**Step 2: Run focused tests**

Run: `npm test -- src/app/billing/billing-form.test.tsx src/app/billing/billing-form.styles.test.ts`

Expected: The new render test still fails until the component uses the new layout constants.

### Task 3: Switch the billing page to the new responsive shell

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/billing/billing-form.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/billing/billing-form.test.tsx`

**Step 1: Update the header container**

- Replace the narrow `max-w-md` wrapper with the new desktop-friendly shell.

**Step 2: Update the main content layout**

- Move the summary cards and back link into a summary column.
- Move the plan cards into a pricing column.
- Apply responsive desktop grid classes without changing billing logic.

**Step 3: Run focused tests**

Run: `npm test -- src/app/billing/billing-form.test.tsx src/app/billing/billing-form.styles.test.ts`

Expected: PASS.

### Task 4: Verify broader safety

**Files:**
- Modify: none unless verification exposes regressions

**Step 1: Run billing-related tests**

Run: `npm test -- src/app/billing/billing-form.test.tsx src/app/billing/billing-form.styles.test.ts`

Expected: PASS

**Step 2: Run full test suite**

Run: `npm test`

Expected: PASS

**Step 3: Run production build**

Run: `npm run build`

Expected: PASS

### Task 5: Commit

**Step 1: Commit verified changes**

```bash
git add docs/plans/2026-04-10-billing-desktop-responsive-design.md docs/plans/2026-04-10-billing-desktop-responsive.md src/app/billing/billing-form.tsx src/app/billing/billing-form.styles.ts src/app/billing/billing-form.styles.test.ts src/app/billing/billing-form.test.tsx
git commit -m "fix: improve billing desktop layout"
```

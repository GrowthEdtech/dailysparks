# Billing Success CTA Contrast Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure the “Back to billing” CTA on `/billing/success` is always readable with a fixed dark text color.

**Architecture:** A styling-only change to the shared `SECONDARY_SUCCESS_CTA_CLASSNAME`. No layout or behavioral changes.

**Tech Stack:** Next.js, Tailwind CSS, Vitest.

---

### Task 1: Update CTA style token

**Files:**
- Modify: `src/app/billing/success/success-panel.styles.ts`
- Test: `src/app/billing/success/success-panel.styles.test.ts` (if present)

**Step 1: Write the failing test (if applicable)**

If there is a style test for the success panel, add a case asserting the secondary CTA includes a dark text color class.

**Step 2: Run test to verify it fails**

Run:

```bash
./node_modules/.bin/vitest run src/app/billing/success/success-panel.styles.test.ts
```

Expected: FAIL if the class is not yet present.

**Step 3: Write minimal implementation**

Update `SECONDARY_SUCCESS_CTA_CLASSNAME` to include a fixed dark text class (e.g. `text-[#0f172a]`), and keep hover states readable.

**Step 4: Run test to verify it passes**

Run:

```bash
./node_modules/.bin/vitest run src/app/billing/success/success-panel.styles.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/billing/success/success-panel.styles.ts src/app/billing/success/success-panel.styles.test.ts
git commit -m "fix: darken billing success secondary cta"
```

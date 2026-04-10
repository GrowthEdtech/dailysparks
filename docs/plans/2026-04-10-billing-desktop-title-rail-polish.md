# Billing Desktop Title Rail Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the desktop `/billing` page feel more unified by giving the summary card and plan cards a shared title rail pattern.

**Architecture:** Keep the existing three-card desktop board and CTA alignment, but introduce a common top wrapper for all cards. Update style constants, lightly restructure the card markup, and lock the new title rail behavior with tests before releasing from the isolated billing worktree.

**Tech Stack:** Next.js App Router, React, Tailwind utility classes, Vitest

---

### Task 1: Record the shared title rail design

**Files:**
- Create: `docs/plans/2026-04-10-billing-desktop-title-rail-polish-design.md`
- Create: `docs/plans/2026-04-10-billing-desktop-title-rail-polish.md`

**Step 1: Save the design**

Document the shared desktop title rail, summary badge placement, and plan-card badge alignment.

**Step 2: Save the implementation plan**

List the exact files, tests, and release steps for the polish pass.

### Task 2: Write the failing tests

**Files:**
- Modify: `src/app/billing/billing-form.test.tsx`
- Modify: `src/app/billing/billing-form.styles.test.ts`

**Step 1: Add style assertions**

Assert the billing styles expose a desktop title rail with minimum height and a divider.

**Step 2: Add markup assertions**

Assert the rendered billing markup includes the shared title rail class, and that the summary card now places its primary status badge in the title row structure.

**Step 3: Run focused tests to verify failure**

Run:

```bash
npm test -- src/app/billing/billing-form.test.tsx src/app/billing/billing-form.styles.test.ts
```

Expected: FAIL because the title rail classes and summary title-row badge do not exist yet.

### Task 3: Implement the shared title rail

**Files:**
- Modify: `src/app/billing/billing-form.tsx`
- Modify: `src/app/billing/billing-form.styles.ts`

**Step 1: Add shared style constants**

Create constants for the card title rail, title row, and consistent badge treatment.

**Step 2: Restructure summary and plan card headers**

Wrap the card tops in the shared title rail, move the summary status badge into the title row, and keep the plan badge geometry stable across selected and unselected cards.

**Step 3: Preserve billing behavior**

Do not change plan selection, Stripe actions, invoice logic, or mobile flow.

### Task 4: Verify locally

**Files:**
- Modify: `src/app/billing/billing-form.test.tsx`
- Modify: `src/app/billing/billing-form.styles.test.ts`

**Step 1: Run focused tests**

```bash
npm test -- src/app/billing/billing-form.test.tsx src/app/billing/billing-form.styles.test.ts
```

Expected: PASS

**Step 2: Run full verification**

```bash
npm test
npm run build
```

Expected: PASS, with only the known Turbopack NFT warning.

### Task 5: Release from the isolated worktree

**Files:**
- Create: `docs/plans/2026-04-10-billing-desktop-title-rail-polish-design.md`
- Create: `docs/plans/2026-04-10-billing-desktop-title-rail-polish.md`
- Modify: `src/app/billing/billing-form.tsx`
- Modify: `src/app/billing/billing-form.styles.ts`
- Modify: `src/app/billing/billing-form.test.tsx`
- Modify: `src/app/billing/billing-form.styles.test.ts`

**Step 1: Commit**

```bash
git add docs/plans/2026-04-10-billing-desktop-title-rail-polish-design.md \
        docs/plans/2026-04-10-billing-desktop-title-rail-polish.md \
        src/app/billing/billing-form.tsx \
        src/app/billing/billing-form.styles.ts \
        src/app/billing/billing-form.test.tsx \
        src/app/billing/billing-form.styles.test.ts
git commit -m "fix: unify billing desktop card headers"
```

**Step 2: Push**

```bash
git push origin codex/billing-desktop-layout
git push origin codex/billing-desktop-layout:main
```

**Step 3: Deploy and smoke**

```bash
bash scripts/deploy-cloud-run.sh
curl -sSI https://dailysparks.geledtech.com/login
curl -sSI https://dailysparks.geledtech.com/billing
```

Expected: deploy succeeds, `/login` returns `200`, and unauthenticated `/billing` redirects to `/login`.

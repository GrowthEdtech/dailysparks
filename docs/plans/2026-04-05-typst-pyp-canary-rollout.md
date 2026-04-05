# Typst PYP Canary Rollout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Roll PYP canary/test delivery defaults onto Typst while keeping `pdf-lib` as the production fallback and preserving a fast rollback path.

**Architecture:** Add a shared renderer policy layer that resolves `auto` to an effective renderer from programme, attachment context, and environment defaults. Thread that policy through admin manual test/resend flows and expose both selected mode and resolved renderer in admin surfaces.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Vitest, existing `pdf-lib` and Typst renderers.

---

### Task 1: Add failing tests for policy-aware renderer defaults

**Files:**
- Modify: `src/app/api/admin/daily-brief-test-run/route.test.ts`
- Modify: `src/app/api/admin/daily-brief-resend/route.test.ts`
- Modify: `src/app/admin/editorial/daily-briefs/manual-test-run-summary.test.ts`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

**Step 1: Write failing tests**

Add tests proving:
- `renderer: "auto"` resolves to `typst` for PYP staged test runs
- `renderer: "auto"` resolves to `typst` for PYP test-brief resend
- route payloads return both selected mode and resolved renderer
- admin detail or summary surfaces the policy-aware label

**Step 2: Run focused tests to verify they fail**

Run:

```bash
npm test -- src/app/api/admin/daily-brief-test-run/route.test.ts src/app/api/admin/daily-brief-resend/route.test.ts src/app/admin/editorial/daily-briefs/manual-test-run-summary.test.ts 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'
```

**Step 3: Commit after green**

```bash
git add src/app/api/admin/daily-brief-test-run/route.test.ts src/app/api/admin/daily-brief-resend/route.test.ts src/app/admin/editorial/daily-briefs/manual-test-run-summary.test.ts 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'
git commit -m "test: cover typst pyp canary policy"
```

### Task 2: Add shared renderer policy with rollback defaults

**Files:**
- Create: `src/lib/daily-brief-renderer-policy.ts`
- Test: `src/lib/daily-brief-renderer-policy.test.ts`
- Modify: `src/lib/goodnotes-delivery.ts`

**Step 1: Write failing policy tests**

Cover:
- default PYP canary/test resolves to `typst`
- non-PYP and production resolve to `pdf-lib`
- environment rollback flips PYP canary back to `pdf-lib`

**Step 2: Run test and verify fail**

Run:

```bash
npm test -- src/lib/daily-brief-renderer-policy.test.ts
```

**Step 3: Implement minimal policy helper**

Add a helper that accepts:
- selected mode (`auto`, `pdf-lib`, `typst`)
- programme
- attachment mode / record context

Return:
- selected mode
- effective renderer
- policy label

**Step 4: Run test and verify pass**

Run:

```bash
npm test -- src/lib/daily-brief-renderer-policy.test.ts
```

### Task 3: Thread policy through admin manual flows

**Files:**
- Modify: `src/app/api/admin/daily-brief-test-run/route.ts`
- Modify: `src/app/api/admin/daily-brief-resend/route.ts`
- Modify: `src/lib/daily-brief-manual-delivery.ts`

**Step 1: Use policy helper in test run**

Resolve `auto` from target profile programme before calling staged delivery or fallback resend.

**Step 2: Use policy helper in manual resend**

Resolve `auto` from selected brief + record kind before delivery.

**Step 3: Return policy metadata**

Route responses should include:
- selected renderer mode
- effective renderer
- policy label

**Step 4: Run focused tests**

Run:

```bash
npm test -- src/app/api/admin/daily-brief-test-run/route.test.ts src/app/api/admin/daily-brief-resend/route.test.ts
```

### Task 4: Upgrade admin controls and verification surfaces

**Files:**
- Modify: `src/app/admin/editorial/daily-briefs/renderer-options.ts`
- Modify: `src/app/admin/editorial/daily-briefs/manual-test-run-panel.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/manual-test-run-summary.ts`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/manual-resend-panel.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`

**Step 1: Add `auto` option**

Show it as the default selection for manual flows.

**Step 2: Surface policy-aware messaging**

Display:
- selected mode
- resolved renderer
- current policy explanation

**Step 3: Keep receipt renderer unchanged**

Do not replace actual receipt renderer labels with policy labels; they must stay factual.

**Step 4: Run focused UI tests**

Run:

```bash
npm test -- src/app/admin/editorial/daily-briefs/manual-test-run-summary.test.ts 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'
```

### Task 5: Verify, commit, deploy

**Files:**
- Modify: `docs/plans/2026-04-05-typst-pyp-canary-rollout-design.md`
- Modify: `docs/plans/2026-04-05-typst-pyp-canary-rollout.md`

**Step 1: Run full verification**

```bash
npm run lint
npm test
npm run build
```

**Step 2: Commit**

```bash
git add src/lib/daily-brief-renderer-policy.ts src/lib/daily-brief-renderer-policy.test.ts src/app/api/admin/daily-brief-test-run/route.ts src/app/api/admin/daily-brief-test-run/route.test.ts src/app/api/admin/daily-brief-resend/route.ts src/app/api/admin/daily-brief-resend/route.test.ts src/app/admin/editorial/daily-briefs/renderer-options.ts src/app/admin/editorial/daily-briefs/manual-test-run-panel.tsx src/app/admin/editorial/daily-briefs/manual-test-run-summary.ts src/app/admin/editorial/daily-briefs/manual-test-run-summary.test.ts 'src/app/admin/editorial/daily-briefs/[briefId]/manual-resend-panel.tsx' 'src/app/admin/editorial/daily-briefs/[briefId]/page.tsx' 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx' docs/plans/2026-04-05-typst-pyp-canary-rollout-design.md docs/plans/2026-04-05-typst-pyp-canary-rollout.md
git commit -m "feat: default pyp canary briefs to typst"
```

**Step 3: Push and deploy**

```bash
git push origin main
./scripts/deploy-cloud-run.sh
```

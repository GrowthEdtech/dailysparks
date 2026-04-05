# Typst Daily Brief Spike Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a low-risk Typst prototype for Daily Brief PDFs so the team can evaluate layout quality and maintainability without replacing the live `pdf-lib` delivery chain.

**Architecture:** Reuse the existing outbound packet as the single content source, add a Typst source builder plus an optional Typst PDF compile helper, and expose the result through an admin-only prototype route. Keep live Goodnotes delivery on `pdf-lib` throughout the spike.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, existing outbound packet builder, Typst compiler for Node if supported, Cloud Run.

---

### Task 1: Add the spike design docs

**Files:**
- Create: `docs/plans/2026-04-05-typst-daily-brief-spike-design.md`
- Create: `docs/plans/2026-04-05-typst-daily-brief-spike.md`

**Step 1: Write the design doc**

- Capture:
  - why the spike exists
  - what stays on `pdf-lib`
  - what the Typst prototype will cover
  - success criteria and risks

**Step 2: Write the implementation plan**

- Capture:
  - exact files
  - TDD steps
  - rollout boundary

**Step 3: Commit**

```bash
git add docs/plans/2026-04-05-typst-daily-brief-spike-design.md docs/plans/2026-04-05-typst-daily-brief-spike.md
git commit -m "docs: plan typst daily brief spike"
```

### Task 2: Add failing tests for Typst source generation

**Files:**
- Create: `src/lib/outbound-daily-brief-typst.test.ts`
- Create: `src/lib/outbound-daily-brief-typst.ts`

**Step 1: Write the failing test**

Add tests that expect:

- headline, summary, metadata, and footer are present in Typst source
- `Words to know` vocabulary becomes structured Typst content
- `Talk about it at home` and `Big idea` appear with stable labels
- markdown artifacts do not appear in the Typst source

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/outbound-daily-brief-typst.test.ts`
Expected: FAIL because the Typst source builder does not exist yet.

**Step 3: Write minimal implementation**

- Create a source builder that:
  - consumes the shared outbound packet
  - escapes Typst-sensitive characters
  - emits a stable first-page editorial layout in Typst syntax

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/outbound-daily-brief-typst.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/outbound-daily-brief-typst.ts src/lib/outbound-daily-brief-typst.test.ts
git commit -m "feat: add typst daily brief source builder"
```

### Task 3: Add a Typst prototype compile layer

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/lib/outbound-daily-brief-typst.ts`
- Create: `src/lib/outbound-daily-brief-typst-compiler.test.ts`

**Step 1: Write the failing test**

Add tests that expect:

- compile helper reports `unavailable` cleanly when Typst runtime is missing
- compile helper returns a PDF `Uint8Array` when a compiler is injected

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/outbound-daily-brief-typst-compiler.test.ts`
Expected: FAIL because there is no compile helper yet.

**Step 3: Write minimal implementation**

- add a compiler wrapper with:
  - runtime feature detection
  - small injectable interface for tests
  - safe fallback behavior if Typst cannot compile in the current environment

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/outbound-daily-brief-typst-compiler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/outbound-daily-brief-typst.ts src/lib/outbound-daily-brief-typst-compiler.test.ts
git commit -m "feat: add typst prototype compiler wrapper"
```

### Task 4: Expose the Typst prototype in admin

**Files:**
- Create: `src/app/api/admin/daily-brief-typst/[briefId]/route.ts`
- Create: `src/app/api/admin/daily-brief-typst/[briefId]/route.test.ts`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

**Step 1: Write the failing tests**

Add tests that expect:

- the admin API route rejects unauthenticated requests
- the route returns a Typst prototype response for an existing brief
- the admin detail page surfaces a Typst prototype CTA or state block

**Step 2: Run test to verify it fails**

Run:
- `npm test -- src/app/api/admin/daily-brief-typst/[briefId]/route.test.ts`
- `npm test -- 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'`

Expected: FAIL because the route and admin surface do not exist yet.

**Step 3: Write minimal implementation**

- create the admin-only route
- return PDF when compile is available, otherwise return Typst source as text
- add a small admin panel showing prototype availability and download/open link

**Step 4: Run test to verify it passes**

Run:
- `npm test -- src/app/api/admin/daily-brief-typst/[briefId]/route.test.ts`
- `npm test -- 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/admin/daily-brief-typst/[briefId]/route.ts src/app/api/admin/daily-brief-typst/[briefId]/route.test.ts src/app/admin/editorial/daily-briefs/[briefId]/page.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx
git commit -m "feat: add admin typst brief prototype"
```

### Task 5: Run regression, deploy, and evaluate

**Files:**
- Modify: `README.md` if operator notes need updating

**Step 1: Run focused verification**

Run:
- `npm test -- src/lib/outbound-daily-brief-typst.test.ts src/lib/outbound-daily-brief-typst-compiler.test.ts src/app/api/admin/daily-brief-typst/[briefId]/route.test.ts 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'`
- `npm run lint -- src/lib/outbound-daily-brief-typst.ts src/lib/outbound-daily-brief-typst.test.ts src/app/api/admin/daily-brief-typst/[briefId]/route.ts src/app/api/admin/daily-brief-typst/[briefId]/route.test.ts 'src/app/admin/editorial/daily-briefs/[briefId]/page.tsx' 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'`

Expected: PASS

**Step 2: Run full verification**

Run:
- `npm test`
- `npm run build`

Expected: PASS with only known baseline warnings.

**Step 3: Deploy and smoke-test**

- deploy Cloud Run
- verify:
  - homepage
  - admin login
  - unauthenticated Typst route returns `401`

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: record typst spike rollout"
```

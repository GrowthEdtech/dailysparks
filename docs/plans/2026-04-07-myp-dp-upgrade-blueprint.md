# MYP DP Upgrade Blueprint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hide `PYP` from the public product surface, add programme-aware `MYP / DP` interest taxonomy to student preferences, and preserve legacy `PYP` data safely.

**Architecture:** Keep the internal editorial and delivery system fully `PYP / MYP / DP` aware, but introduce a new public preference layer that only exposes `MYP / DP`. Extend the student profile model with `interestTags[]`, validate tags through shared helpers, and update public marketing/dashboard surfaces to align with the new product scope.

**Tech Stack:** Next.js App Router, TypeScript, local/Firestore profile stores, Vitest, existing dashboard/profile API patterns.

---

### Task 1: Add programme and interest taxonomy helpers

**Files:**
- Create: `src/lib/student-interest-taxonomy.ts`
- Test: `src/lib/student-interest-taxonomy.test.ts`

**Step 1: Write the failing test**

Cover:
- public selectable programmes are `MYP` and `DP`
- default public programme is `MYP`
- `MYP` and `DP` each expose the expected interest tags
- incompatible tags are pruned when programme changes

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/student-interest-taxonomy.test.ts`

**Step 3: Write minimal implementation**

Add:
- public programme constants
- default public programme helpers
- programme-aware taxonomy helpers
- validation/pruning helpers for `interestTags`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/student-interest-taxonomy.test.ts`

**Step 5: Commit**

```bash
git add src/lib/student-interest-taxonomy.ts src/lib/student-interest-taxonomy.test.ts
git commit -m "feat: add student interest taxonomy helpers"
```

### Task 2: Extend the student preference model

**Files:**
- Modify: `src/lib/mvp-types.ts`
- Modify: `src/lib/local-profile-store.ts`
- Modify: `src/lib/firestore-profile-store.ts`
- Modify: `src/lib/mvp-store.test.ts`

**Step 1: Write the failing test**

Add tests showing:
- `updateStudentPreferences` persists `interestTags`
- invalid/incompatible tags are pruned on store write
- new public student records default to `MYP`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/mvp-store.test.ts`

**Step 3: Write minimal implementation**

Update:
- `StudentRecord`
- `UpdateStudentPreferencesInput`
- local and Firestore normalization
- student creation defaults for new public profiles

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/mvp-store.test.ts`

**Step 5: Commit**

```bash
git add src/lib/mvp-types.ts src/lib/local-profile-store.ts src/lib/firestore-profile-store.ts src/lib/mvp-store.test.ts
git commit -m "feat: persist student interest tags"
```

### Task 3: Update the public profile route

**Files:**
- Modify: `src/app/api/profile/route.ts`
- Modify: `src/app/api/auth-routes.test.ts`

**Step 1: Write the failing test**

Add tests showing:
- valid `MYP/DP` interest tags are accepted and returned
- incompatible tags are rejected with `400`
- legacy `PYP` can still round-trip safely when no public selection is involved

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/auth-routes.test.ts`

**Step 3: Write minimal implementation**

Add:
- request parsing for `interestTags`
- programme-aware validation via shared taxonomy helpers
- response payload includes updated student interests

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/auth-routes.test.ts`

**Step 5: Commit**

```bash
git add src/app/api/profile/route.ts src/app/api/auth-routes.test.ts
git commit -m "feat: validate public interest taxonomy updates"
```

### Task 4: Soft-hide PYP in the public dashboard

**Files:**
- Modify: `src/app/dashboard/dashboard-form.tsx`
- Modify: `src/app/dashboard/dashboard-form.test.tsx`

**Step 1: Write the failing test**

Add tests showing:
- the public programme selector only renders `MYP` and `DP`
- the dashboard renders an `Interest focus` section
- legacy `PYP` profiles render a clear legacy-mode note

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/dashboard/dashboard-form.test.tsx`

**Step 3: Write minimal implementation**

Update the dashboard to:
- use public programme helpers
- show `MYP/DP` taxonomy chips
- keep legacy `PYP` visible only as current state, not as a public option

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/dashboard/dashboard-form.test.tsx`

**Step 5: Commit**

```bash
git add src/app/dashboard/dashboard-form.tsx src/app/dashboard/dashboard-form.test.tsx
git commit -m "feat: hide pyp in public dashboard flow"
```

### Task 5: Update public marketing copy

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Write the failing test**

If the homepage has existing snapshot/string coverage, extend it; otherwise rely on targeted string assertions in an existing page test or add one if needed.

**Step 2: Run test to verify it fails**

Run: `npm test -- <homepage test path if added>`

**Step 3: Write minimal implementation**

Update public copy so the homepage reflects:
- `MYP + DP`
- academic reading and thinking habits
- no public `PYP` positioning

**Step 4: Run test to verify it passes**

Run: `npm test -- <homepage test path if added>`

**Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: align public marketing with myp and dp focus"
```

### Task 6: Verify the whole slice

**Files:**
- No new files required

**Step 1: Run focused tests**

Run:

```bash
npm test -- src/lib/student-interest-taxonomy.test.ts src/lib/mvp-store.test.ts src/app/api/auth-routes.test.ts src/app/dashboard/dashboard-form.test.tsx
```

**Step 2: Run lint**

Run:

```bash
npm run lint -- src/lib/student-interest-taxonomy.ts src/lib/student-interest-taxonomy.test.ts src/lib/mvp-types.ts src/lib/local-profile-store.ts src/lib/firestore-profile-store.ts src/app/api/profile/route.ts src/app/api/auth-routes.test.ts src/app/dashboard/dashboard-form.tsx src/app/dashboard/dashboard-form.test.tsx src/app/page.tsx
```

**Step 3: Run full suite**

Run:

```bash
npm test
npm run build
```

**Step 4: Commit**

```bash
git add docs/plans/2026-04-07-myp-dp-upgrade-blueprint-design.md docs/plans/2026-04-07-myp-dp-upgrade-blueprint.md src/lib/student-interest-taxonomy.ts src/lib/student-interest-taxonomy.test.ts src/lib/mvp-types.ts src/lib/local-profile-store.ts src/lib/firestore-profile-store.ts src/app/api/profile/route.ts src/app/api/auth-routes.test.ts src/app/dashboard/dashboard-form.tsx src/app/dashboard/dashboard-form.test.tsx src/app/page.tsx
git commit -m "feat: start myp and dp public product transition"
```

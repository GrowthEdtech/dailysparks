# Users Admin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a read-only `Users` admin module that shows parent registration timing, derived user type, billing state, student programme, and delivery readiness inside the existing admin workspace.

**Architecture:** Extend the existing profile store with broad listing and lookup-by-parent-id capabilities, then render a new `Users` tab with a list page and a detail page in the current password-protected admin shell. Reuse existing profile and billing fields rather than introducing new admin-only persistence.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Firestore Admin SDK, local JSON persistence

---

### Task 1: Add the failing profile listing tests

**Files:**
- Modify: `src/lib/mvp-store.test.ts`
- Modify: `src/lib/profile-store.ts`
- Modify: `src/lib/mvp-store.ts`

**Step 1: Write the failing tests**

Cover:

- `listParentProfiles()` returns all parent profiles sorted by newest registration first
- `getProfileByParentId()` returns the matching profile
- `getProfileByParentId()` returns `null` for unknown IDs

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/mvp-store.test.ts`

Expected: FAIL because the new methods do not exist yet.

**Step 3: Write minimal implementation**

Add the new store contract methods and thin `mvp-store` exports.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/mvp-store.test.ts`

Expected: PASS

### Task 2: Implement local and Firestore profile listing support

**Files:**
- Modify: `src/lib/local-profile-store.ts`
- Modify: `src/lib/firestore-profile-store.ts`

**Step 1: Add local listing support**

Implement:

- list all parent/student profile pairs
- sort newest first
- lookup by `parentId`

**Step 2: Add Firestore listing support**

Implement the same semantics using parent and student collections.

**Step 3: Re-run profile tests**

Run: `npm test -- src/lib/mvp-store.test.ts`

Expected: PASS

### Task 3: Add the failing admin UI tests for the Users module

**Files:**
- Modify: `src/app/admin/editorial/editorial-admin-tabs.test.tsx`
- Create: `src/app/admin/editorial/users/page.test.tsx`
- Create: `src/app/admin/editorial/users/[parentId]/page.test.tsx`

**Step 1: Write the failing tests**

Cover:

- admin tabs render `Users`
- users list page shows an honest empty state
- users list page renders registration date, user type, programme, and billing info
- users detail page renders account, student, billing, and delivery sections

**Step 2: Run targeted tests to verify they fail**

Run: `npm test -- src/app/admin/editorial/editorial-admin-tabs.test.tsx src/app/admin/editorial/users/page.test.tsx 'src/app/admin/editorial/users/[parentId]/page.test.tsx'`

Expected: FAIL because the new tab and pages do not exist yet.

### Task 4: Implement the Users list page and detail page

**Files:**
- Modify: `src/app/admin/editorial/editorial-admin-tabs.tsx`
- Modify: `src/app/admin/editorial/layout.tsx`
- Create: `src/app/admin/editorial/users/page.tsx`
- Create: `src/app/admin/editorial/users/[parentId]/page.tsx`

**Step 1: Add the new tab**

Label:

- `Users`

Description:

- `Registration, billing, programme, delivery status`

**Step 2: Implement the list page**

Behavior:

- load all parent profiles
- show empty state when none exist
- render derived user type and billing/delivery summary
- sort by newest registration

**Step 3: Implement the detail page**

Behavior:

- load by `parentId`
- call `notFound()` when missing
- render read-only sections for overview, student profile, billing, and delivery

**Step 4: Run targeted UI tests**

Run: `npm test -- src/app/admin/editorial/editorial-admin-tabs.test.tsx src/app/admin/editorial/users/page.test.tsx 'src/app/admin/editorial/users/[parentId]/page.test.tsx'`

Expected: PASS

### Task 5: Full verification and release

**Files:**
- Modify: any touched files above

**Step 1: Run focused tests**

Run: `npm test -- src/lib/mvp-store.test.ts src/app/admin/editorial/editorial-admin-tabs.test.tsx src/app/admin/editorial/users/page.test.tsx 'src/app/admin/editorial/users/[parentId]/page.test.tsx'`

**Step 2: Run full tests**

Run: `npm test`

**Step 3: Run focused lint**

Run: `npm run lint -- src/lib/mvp-store.ts src/lib/profile-store.ts src/lib/local-profile-store.ts src/lib/firestore-profile-store.ts src/app/admin/editorial/editorial-admin-tabs.tsx src/app/admin/editorial/users/page.tsx 'src/app/admin/editorial/users/[parentId]/page.tsx' src/app/admin/editorial/users/page.test.tsx 'src/app/admin/editorial/users/[parentId]/page.test.tsx'`

**Step 4: Run production build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add docs/plans src/lib src/app/admin/editorial
git commit -m "feat: add admin users module"
```

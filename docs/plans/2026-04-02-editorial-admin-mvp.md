# Editorial Admin MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a lightweight admin-only source registry for Daily Sparks editorial operations.

**Architecture:** Use a shared editorial source store interface with local JSON and Firestore implementations. Gate the route with an admin email allowlist and expose one internal admin page plus a small admin-only API surface.

**Tech Stack:** Next.js app router, TypeScript, Vitest, local JSON storage, Firestore

---

### Task 1: Add failing tests for admin config and source registry store

**Files:**
- Create: `src/lib/editorial-admin.test.ts`
- Create: `src/lib/editorial-source-store.test.ts`

**Step 1: Write the failing tests**

Require:

- allowlisted emails are recognized as admins
- source registry seeds from editorial policy in local mode
- source create and update operations persist

**Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/editorial-admin.test.ts src/lib/editorial-source-store.test.ts
```

### Task 2: Implement admin config and source registry store

**Files:**
- Create: `src/lib/editorial-admin.ts`
- Create: `src/lib/editorial-source-store.ts`
- Create: `src/lib/local-editorial-source-store.ts`
- Create: `src/lib/firestore-editorial-source-store.ts`

**Step 1: Add minimal implementation**

Implement:

- admin email parsing and matching
- registry record types
- backend switching
- local JSON persistence
- Firestore persistence
- policy seeding

**Step 2: Run tests to verify they pass**

```bash
npm test -- src/lib/editorial-admin.test.ts src/lib/editorial-source-store.test.ts
```

### Task 3: Add failing API tests

**Files:**
- Create: `src/app/api/admin/editorial-sources/route.test.ts`

**Step 1: Write tests**

Require:

- unauthorized users are rejected
- admins can list sources
- admins can create a source
- admins can update a source

**Step 2: Run tests to verify failure**

```bash
npm test -- src/app/api/admin/editorial-sources/route.test.ts
```

### Task 4: Implement the admin API route

**Files:**
- Create: `src/app/api/admin/editorial-sources/route.ts`

**Step 1: Add route handlers**

Implement:

- session check
- admin check
- GET / POST / PUT
- validation helpers

**Step 2: Run tests to verify pass**

```bash
npm test -- src/app/api/admin/editorial-sources/route.test.ts
```

### Task 5: Build the admin page

**Files:**
- Create: `src/app/admin/editorial/page.tsx`
- Create: `src/app/admin/editorial/editorial-admin-panel.tsx`
- Modify: `src/app/dashboard/dashboard-form.tsx`

**Step 1: Add server route and client panel**

Implement:

- admin-only page access
- source create form
- source edit cards
- save interactions through the admin API
- optional dashboard link for admin users

**Step 2: Add lightweight render coverage if practical**

Add a small static render test if the page shape becomes large enough to regress.

### Task 6: Run full verification

```bash
npm test
npm run lint -- src/lib/editorial-admin.ts src/lib/editorial-source-store.ts src/lib/local-editorial-source-store.ts src/lib/firestore-editorial-source-store.ts src/app/api/admin/editorial-sources/route.ts src/app/admin/editorial/page.tsx src/app/admin/editorial/editorial-admin-panel.tsx src/app/dashboard/dashboard-form.tsx
npm run build
```

### Task 7: Commit

```bash
git add docs/plans/2026-04-02-editorial-admin-mvp-design.md docs/plans/2026-04-02-editorial-admin-mvp.md src/lib/editorial-admin.ts src/lib/editorial-source-store.ts src/lib/local-editorial-source-store.ts src/lib/firestore-editorial-source-store.ts src/lib/editorial-admin.test.ts src/lib/editorial-source-store.test.ts src/app/api/admin/editorial-sources/route.ts src/app/api/admin/editorial-sources/route.test.ts src/app/admin/editorial/page.tsx src/app/admin/editorial/editorial-admin-panel.tsx src/app/dashboard/dashboard-form.tsx
git commit -m "feat: add editorial admin registry"
```

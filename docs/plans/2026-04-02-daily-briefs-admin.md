# Daily Briefs Admin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a read-only `Daily Briefs` admin tab with a real history store, empty state, list page, and detail page.

**Architecture:** Reuse the existing editorial admin shell and backend-selection pattern. Add a new history store with local JSON and Firestore implementations, then render server-driven list and detail pages inside the existing authenticated admin routes. Keep the MVP read-only and truthful by showing an empty state when no records exist.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Firestore Admin SDK, local JSON file persistence

---

### Task 1: Add the failing history store tests

**Files:**
- Create: `src/lib/daily-brief-history-store.test.ts`
- Create: `src/lib/daily-brief-history-schema.ts`
- Create: `src/lib/daily-brief-history-store-types.ts`
- Create: `src/lib/daily-brief-history-store.ts`

**Step 1: Write the failing tests**

Cover:

- empty local store returns `[]`
- creating a history entry persists it
- list returns newest-first order
- get-by-id returns the stored record

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/daily-brief-history-store.test.ts`

**Step 3: Add minimal schema and store implementation**

Include:

- record types
- filter types
- local/firestore backend selection
- `list`, `get`, and `create`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/daily-brief-history-store.test.ts`

### Task 2: Add local and Firestore history store implementations

**Files:**
- Create: `src/lib/local-daily-brief-history-store.ts`
- Create: `src/lib/firestore-daily-brief-history-store.ts`
- Modify: `README.md`

**Step 1: Add local store**

Store path:

- `data/daily-brief-history.json`
- optional env override `DAILY_SPARKS_DAILY_BRIEF_STORE_PATH`

**Step 2: Add Firestore store**

Collection:

- `editorialDailyBriefHistory`

**Step 3: Document the new store path**

Add a short README note for the new local override and the purpose of the history store.

**Step 4: Re-run store test**

Run: `npm test -- src/lib/daily-brief-history-store.test.ts`

### Task 3: Add the failing page tests for the new admin tab

**Files:**
- Modify: `src/app/admin/editorial/editorial-admin-tabs.tsx`
- Create: `src/app/admin/editorial/daily-briefs/page.test.tsx`
- Create: `src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`
- Modify: `src/app/admin/editorial/layout.test.tsx`

**Step 1: Add failing tests**

Cover:

- admin tabs render `Daily Briefs`
- list page empty state
- list page populated state
- detail page renders a stored brief
- detail page triggers not-found when missing

**Step 2: Run targeted tests to see them fail**

Run: `npm test -- src/app/admin/editorial/layout.test.tsx src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

### Task 4: Implement the admin pages and UI

**Files:**
- Modify: `src/app/admin/editorial/editorial-admin-tabs.tsx`
- Create: `src/app/admin/editorial/daily-briefs/page.tsx`
- Create: `src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`

**Step 1: Add the third tab**

Label:

- `Daily Briefs`

Description:

- `History, sources, prompt traceability`

**Step 2: Implement list page**

Behavior:

- read from history store
- support simple query-param filters for `programme` and `status`
- render empty state when no records match
- link each record to its detail page

**Step 3: Implement detail page**

Behavior:

- fetch by `briefId`
- render source list, metadata, and markdown body
- call `notFound()` if missing

**Step 4: Run targeted tests**

Run: `npm test -- src/app/admin/editorial/layout.test.tsx src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

### Task 5: Full verification and release

**Files:**
- Modify: any touched files above

**Step 1: Run full tests**

Run: `npm test`

**Step 2: Run focused lint**

Run: `npm run lint -- src/lib/daily-brief-history-schema.ts src/lib/daily-brief-history-store-types.ts src/lib/daily-brief-history-store.ts src/lib/local-daily-brief-history-store.ts src/lib/firestore-daily-brief-history-store.ts src/lib/daily-brief-history-store.test.ts src/app/admin/editorial/editorial-admin-tabs.tsx src/app/admin/editorial/daily-briefs/page.tsx src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx src/app/admin/editorial/layout.test.tsx README.md`

**Step 3: Run production build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add docs/plans/2026-04-02-daily-briefs-admin-design.md docs/plans/2026-04-02-daily-briefs-admin.md README.md src/lib/daily-brief-history-schema.ts src/lib/daily-brief-history-store-types.ts src/lib/daily-brief-history-store.ts src/lib/local-daily-brief-history-store.ts src/lib/firestore-daily-brief-history-store.ts src/lib/daily-brief-history-store.test.ts src/app/admin/editorial/editorial-admin-tabs.tsx src/app/admin/editorial/daily-briefs/page.tsx src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx src/app/admin/editorial/layout.test.tsx
git commit -m "feat: add daily brief admin history"
```

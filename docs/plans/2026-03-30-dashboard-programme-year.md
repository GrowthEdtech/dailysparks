# Dashboard Programme and Year Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace dashboard subject selection with a programme-and-year model that generates an IB-aligned weekly reading plan and Sunday special.

**Architecture:** Move the student preference model from `ibSubjects[]` to `programme + programmeYear`, normalize legacy local JSON records in the store, validate the new fields in the profile API, and render the dashboard from generated weekly-plan helpers instead of manual subject chips.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, local JSON store, Tailwind CSS v4

---

### Task 1: Lock the new persistence contract with failing tests

**Files:**
- Modify: `src/lib/mvp-store.test.ts`
- Modify: `src/app/api/auth-routes.test.ts`

**Step 1: Write the failing tests**

Cover:

- default student profiles now receive `programme: "PYP"` and `programmeYear: 5`
- legacy student records without the new fields are normalized on read
- profile updates now validate `programme` and `programmeYear`

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/mvp-store.test.ts src/app/api/auth-routes.test.ts`
Expected: FAIL because the old store and route contracts still expect `ibSubjects`

**Step 3: Keep the tests focused**

Do not add UI tests in this task. Only lock the data and route contract.

**Step 4: Re-run after implementation**

Run: `npm test -- --run src/lib/mvp-store.test.ts src/app/api/auth-routes.test.ts`
Expected: PASS

### Task 2: Replace the student preference model in the store

**Files:**
- Modify: `src/lib/mvp-types.ts`
- Modify: `src/lib/mvp-store.ts`
- Create: `src/lib/weekly-plan.ts`

**Step 1: Implement the new typed fields**

Add:

- `programme`
- `programmeYear`
- allowed programme constants
- year-range helpers

**Step 2: Add legacy normalization**

Ensure old student records can still be loaded and are upgraded in memory with default values.

**Step 3: Add weekly plan generation**

Create a small helper that derives:

- title/description
- Monday to Saturday entries
- Sunday special

from `programme + programmeYear`.

**Step 4: Verify with tests**

Run: `npm test -- --run src/lib/mvp-store.test.ts`
Expected: PASS

### Task 3: Update the profile API contract

**Files:**
- Modify: `src/app/api/profile/route.ts`
- Modify: `src/app/api/auth-routes.test.ts`

**Step 1: Switch validation to the new fields**

The profile update body should accept:

- `programme`
- `programmeYear`
- `goodnotesEmail`

**Step 2: Remove the old subject validation**

Subject chip validation is no longer part of the save flow.

**Step 3: Verify route behavior**

Run: `npm test -- --run src/app/api/auth-routes.test.ts`
Expected: PASS

### Task 4: Replace the dashboard UI

**Files:**
- Modify: `src/app/dashboard/dashboard-form.tsx`

**Step 1: Replace the subject chip card**

Build a `Learning Stage` card with:

- programme selector
- year selector
- helper copy

**Step 2: Add a generated `Weekly Reading Plan` card**

Render:

- Monday to Saturday rows
- highlighted Sunday special

**Step 3: Keep save and delivery behavior**

Saving should persist:

- programme
- programmeYear
- GoodNotes email

**Step 4: Verify locally**

Run: `npm run lint`
Expected: PASS

### Task 5: Full verification

**Files:**
- Verify only

**Step 1: Run all tests**

Run: `npm test -- --run`
Expected: PASS

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Run production build**

Run: `npm run build`
Expected: PASS

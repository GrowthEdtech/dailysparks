# Firestore Store Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current file-only MVP store with a Firestore-ready repository layer while keeping the existing login and dashboard APIs stable.

**Architecture:** Add a small storage abstraction that can resolve either a local JSON-backed repository or a Firestore-backed repository at runtime. Keep route handlers unchanged at their public boundary so the UI continues working without a rewrite. Firestore activates only when `DAILY_SPARKS_STORE_BACKEND=firestore` is set, and authentication uses Google Application Default Credentials.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Firebase Admin SDK, Google ADC, local JSON fallback

---

### Task 1: Add backend selection tests

**Files:**
- Create: `src/lib/profile-store-config.test.ts`
- Reference: `src/lib/mvp-store.test.ts`

**Step 1: Write the failing test**

Add tests that describe:

- local backend is selected by default
- Firestore backend is selected when the backend env is explicitly enabled

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/profile-store-config.test.ts`

Expected: FAIL because the config resolver does not exist yet.

**Step 3: Write minimal implementation**

Create a small config helper that reads the store backend flag and Firestore project id.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/profile-store-config.test.ts`

Expected: PASS

### Task 2: Extract the local JSON store into a repository

**Files:**
- Create: `src/lib/local-profile-store.ts`
- Modify: `src/lib/mvp-store.ts`
- Reference: `src/lib/mvp-types.ts`

**Step 1: Write the failing test**

Update the existing store tests to continue importing from `mvp-store.ts` and verify the behavior still works after the extraction.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/mvp-store.test.ts`

Expected: FAIL during the extraction until the wrapper is restored.

**Step 3: Write minimal implementation**

Move the current file-backed implementation into `local-profile-store.ts` and turn `mvp-store.ts` into a thin facade that delegates to the selected backend.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/mvp-store.test.ts`

Expected: PASS

### Task 3: Add Firestore-backed repository

**Files:**
- Create: `src/lib/firebase-admin.ts`
- Create: `src/lib/firestore-profile-store.ts`
- Modify: `src/lib/mvp-store.ts`
- Modify: `src/lib/mvp-types.ts`

**Step 1: Write the failing test**

Add or extend a test that expects the store facade to resolve the Firestore backend when the backend env is enabled.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/profile-store-config.test.ts`

Expected: FAIL because no Firestore path exists yet.

**Step 3: Write minimal implementation**

Add a server-only Firestore repository using Firebase Admin SDK with:

- lazy singleton initialization
- Application Default Credentials
- parent lookup by normalized email
- student lookup by `parentId`
- create-or-update behavior that matches the current MVP semantics

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/profile-store-config.test.ts`

Expected: PASS

### Task 4: Document configuration

**Files:**
- Modify: `README.md`

**Step 1: Write the failing check**

Identify the missing setup guidance for Firebase Admin credentials and fallback behavior.

**Step 2: Write minimal documentation**

Document:

- `DAILY_SPARKS_STORE_BACKEND=firestore`
- `FIREBASE_PROJECT_ID`
- `gcloud auth application-default login`
- local JSON fallback behavior

**Step 3: Verify documentation is accurate**

Cross-check the documented vars against the actual code.

### Task 5: Full verification

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `npm test -- --run src/lib/profile-store-config.test.ts src/lib/mvp-store.test.ts src/app/api/auth-routes.test.ts`

Expected: PASS

**Step 2: Run the full test suite**

Run: `npm test -- --run`

Expected: PASS

**Step 3: Run lint**

Run: `npm run lint`

Expected: PASS

**Step 4: Run production build**

Run: `npm run build`

Expected: PASS, with only the existing known NFT warning unless separately addressed.

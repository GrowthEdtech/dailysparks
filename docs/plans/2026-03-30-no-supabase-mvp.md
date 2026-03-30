# No-Supabase MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working Daily Sparks MVP without Supabase by adding a local JSON data store, cookie-based session flow, and real login/dashboard persistence.

**Architecture:** Use a file-backed store in `src/lib` for parent and student records, Route Handlers for login/profile/logout mutations, and App Router pages that read session state on the server while submitting updates from the client. Keep the data layer isolated so the app can later migrate to a real database without rewriting the page flow.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Vitest, Node `fs/promises`, `next/headers`, `next/navigation`

---

### Task 1: Add a test runner

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Add the failing test command dependency**

Install `vitest` as a dev dependency and add a `test` script.

**Step 2: Run test command to verify the setup fails before tests exist**

Run: `npm test -- --run`
Expected: non-zero exit or "No test files found"

**Step 3: Keep the setup minimal**

Do not add browser or DOM test dependencies yet. Start with Node environment tests only.

**Step 4: Re-run after adding tests in later tasks**

Run: `npm test -- --run`
Expected: test runner executes the added test files

### Task 2: Add the local store and its tests

**Files:**
- Create: `src/lib/mvp-store.ts`
- Create: `src/lib/mvp-types.ts`
- Create: `src/lib/mvp-store.test.ts`
- Create: `src/data/.gitkeep`

**Step 1: Write the failing tests**

Cover:

- creating a parent on first login
- auto-creating a default student
- updating student preferences

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/mvp-store.test.ts`
Expected: FAIL because the store module does not exist or methods are not implemented

**Step 3: Write minimal implementation**

Implement:

- typed store schema
- JSON file path helper
- read/write helpers
- `getOrCreateParentProfile`
- `getProfileByEmail`
- `updateStudentPreferences`

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/mvp-store.test.ts`
Expected: PASS

### Task 3: Add session helpers and route tests

**Files:**
- Create: `src/lib/session.ts`
- Create: `src/app/api/login/route.ts`
- Create: `src/app/api/profile/route.ts`
- Create: `src/app/api/logout/route.ts`
- Create: `src/app/api/auth-routes.test.ts`

**Step 1: Write the failing tests**

Cover:

- rejecting invalid login input
- creating session cookie on login
- returning profile for the active session
- rejecting invalid profile updates

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/api/auth-routes.test.ts`
Expected: FAIL because the routes and helpers do not exist or return the wrong shape

**Step 3: Write minimal implementation**

Implement:

- cookie constants and helpers in `src/lib/session.ts`
- `POST /api/login`
- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/logout`

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/app/api/auth-routes.test.ts`
Expected: PASS

### Task 4: Replace the fake login page with a real flow

**Files:**
- Modify: `src/app/login/page.tsx`

**Step 1: Write the failing test manually through route coverage**

Use the existing route tests as the red phase for login submission behavior and add UI state only after the route contract is stable.

**Step 2: Implement the minimal page**

Build a client login form that:

- captures email, parent name, student name
- posts to `/api/login`
- shows inline errors
- redirects to `/dashboard` on success

**Step 3: Verify behavior**

Run: `npm run lint`
Expected: PASS

### Task 5: Convert the dashboard into a real authenticated editor

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/dashboard-form.tsx`

**Step 1: Write the failing test manually through route coverage**

Use the profile route tests as the red phase for saved dashboard behavior.

**Step 2: Implement the minimal page split**

Server page:

- reads the session from cookies
- loads the profile directly from the store
- redirects to `/login` when unauthenticated

Client form:

- renders the current student preferences
- updates subjects and GoodNotes email
- saves with `PUT /api/profile`
- exposes logout with `POST /api/logout`

**Step 3: Verify behavior**

Run: `npm run lint`
Expected: PASS

### Task 6: Connect the landing page and app shell polish

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Make the MVP reachable**

Update home CTAs to point into the live flow and clean up metadata.

**Step 2: Keep visual consistency**

Preserve the current mobile-first direction, but use shared color variables and app naming.

**Step 3: Verify behavior**

Run: `npm run lint`
Expected: PASS

### Task 7: Full verification

**Files:**
- Verify only

**Step 1: Run the targeted tests**

Run: `npm test -- --run`
Expected: PASS

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Run production build**

Run: `npm run build`
Expected: PASS

**Step 4: Manual spot-check**

Run: `npm run dev`
Expected:

- `/login` can create a session
- `/dashboard` loads saved data
- save persists after refresh
- logout returns the user to `/login`

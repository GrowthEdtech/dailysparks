# Google-Only Login Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current Daily Sparks email form login with a Google-only authentication flow backed by Firebase ID token verification and a secure server session cookie.

**Architecture:** Keep the existing Next.js App Router and Firestore-backed profile store, but replace the raw-email cookie with a Firebase session cookie. The browser will sign in with Firebase Web Auth and post the ID token to `/api/login`; the server will verify the token, create the session cookie, and continue using email-based profile lookup internally. If the child name is still missing after first login, the dashboard will collect it in a compact onboarding card.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Firebase Web SDK, Firebase Admin SDK, Cloud Run

---

### Task 1: Add auth route tests for Google token exchange

**Files:**
- Modify: `src/app/api/auth-routes.test.ts`
- Reference: `src/app/api/login/route.ts`
- Reference: `src/lib/session.ts`

**Step 1: Write the failing test**

Add tests that describe:

- `/api/login` rejects requests without a Firebase ID token
- `/api/login` creates a secure session cookie after a valid token exchange
- `/api/profile` accepts a verified session cookie
- `/api/profile` can update `studentName` as part of onboarding

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/api/auth-routes.test.ts`

Expected: FAIL because the current route still expects `email` and `studentName`, and profile updates do not support `studentName`.

**Step 3: Write minimal implementation**

Mock Firebase Admin Auth in the route test and update the route logic to follow the new contract.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/app/api/auth-routes.test.ts`

Expected: PASS

### Task 2: Add session utility tests for Firebase-backed cookies

**Files:**
- Create: `src/lib/session.test.ts`
- Modify: `src/lib/session.ts`
- Modify: `src/lib/firebase-admin.ts`

**Step 1: Write the failing test**

Add tests that describe:

- exchanging an ID token returns a session cookie header and decoded email
- invalid decoded tokens without email are rejected
- verified session cookies return the decoded session identity

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/session.test.ts`

Expected: FAIL because the current session helper only serializes raw email cookies.

**Step 3: Write minimal implementation**

Add Firebase Admin Auth helpers and rewrite the session utility to:

- create Firebase session cookies
- verify Firebase session cookies
- expose async helpers for requests and page cookies

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/session.test.ts`

Expected: PASS

### Task 3: Update the profile store contract for dashboard onboarding

**Files:**
- Modify: `src/lib/mvp-types.ts`
- Modify: `src/lib/profile-store.ts`
- Modify: `src/lib/mvp-store.ts`
- Modify: `src/lib/local-profile-store.ts`
- Modify: `src/lib/firestore-profile-store.ts`
- Modify: `src/app/api/profile/route.ts`
- Modify: `src/lib/mvp-store.test.ts`

**Step 1: Write the failing test**

Extend store and route tests to expect `studentName` updates to persist.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/mvp-store.test.ts src/app/api/auth-routes.test.ts`

Expected: FAIL because the update flow does not yet persist `studentName`.

**Step 3: Write minimal implementation**

Add `studentName` to the student preference update contract and persist it in both local and Firestore repositories.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/mvp-store.test.ts src/app/api/auth-routes.test.ts`

Expected: PASS

### Task 4: Replace the login page with Google-only UI

**Files:**
- Modify: `package.json`
- Modify: `src/app/login/login-form.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Create: `src/lib/firebase-client.ts`

**Step 1: Write the failing check**

Identify the current form fields and raw cookie redirect logic that are incompatible with the Google-only flow.

**Step 2: Write minimal implementation**

Install the Firebase Web SDK and:

- initialize a client-side Firebase app
- present a single `Continue with Google` CTA
- exchange the ID token with `/api/login`
- redirect authenticated users based on verified server sessions

**Step 3: Verify manually and with tests**

Run the focused tests again and confirm `/login` still renders in a production build.

### Task 5: Add dashboard onboarding and logout cleanup

**Files:**
- Modify: `src/app/dashboard/dashboard-form.tsx`
- Modify: `src/app/api/logout/route.ts`

**Step 1: Write the failing check**

Identify the current header and save flow gaps for first-time Google users without a child name.

**Step 2: Write minimal implementation**

Update the dashboard to:

- show a compact onboarding card when `studentName` is missing or placeholder-like
- allow `studentName` to be saved alongside the current programme and Goodnotes fields
- sign out the client Firebase session on logout to avoid stale browser auth state

**Step 3: Verify manually**

Confirm the dashboard wording and onboarding card behave correctly for incomplete profiles.

### Task 6: Update deployment/docs and run full verification

**Files:**
- Modify: `README.md`
- Modify: `scripts/deploy-cloud-run.sh`

**Step 1: Write the failing check**

Identify missing Firebase Web Auth configuration and production auth setup notes.

**Step 2: Write minimal documentation and deployment updates**

Document or configure:

- required Firebase Web config
- Google provider enablement
- authorized domains for `localhost` and `dailysparks.geledtech.com`
- Cloud Run deployment env assumptions

**Step 3: Run focused verification**

Run: `npm test -- --run src/lib/session.test.ts src/lib/mvp-store.test.ts src/app/api/auth-routes.test.ts`

Expected: PASS

**Step 4: Run the full suite**

Run: `npm test -- --run`

Expected: PASS

**Step 5: Run lint**

Run: `npm run lint`

Expected: PASS

**Step 6: Run production build**

Run: `npm run build`

Expected: PASS

**Step 7: Smoke test locally**

Run the local app and verify:

- `/login` loads
- Google CTA renders
- protected dashboard redirects work without a valid session

**Step 8: Deploy and verify production**

Deploy to Cloud Run, then verify:

- `https://dailysparks.geledtech.com/login` returns `200`
- login page renders the Google CTA
- production site stays healthy behind the load balancer

# Custom Firebase Auth Domain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Switch Daily Sparks Firebase web auth to the custom production domain and proxy Firebase helper routes through the Next.js app.

**Architecture:** Extract Firebase web config into a reusable helper, change the default auth domain to `dailysparks.geledtech.com`, and add Next.js rewrites for `/__/auth/*` and `/__/firebase/*` to the project helper origin on `gen-lang-client-0586185740.firebaseapp.com`. Keep Firebase Authentication and Identity Platform as the auth backend, but make the product domain the browser-visible helper domain.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Firebase Web SDK, Identity Platform, Google Cloud Run

---

### Task 1: Lock the auth domain and helper proxy contract with tests

**Files:**
- Create: `src/lib/firebase-web-config.test.ts`
- Create: `src/lib/firebase-web-config.ts`
- Modify: `next.config.ts`

**Step 1: Write the failing test**

Add tests that expect:

- the default Firebase auth domain is `dailysparks.geledtech.com`
- the helper origin defaults to `https://gen-lang-client-0586185740.firebaseapp.com`
- rewrites exist for `/__/auth/:path*` and `/__/firebase/:path*`

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/firebase-web-config.test.ts`

Expected: FAIL because no shared config helper or rewrites exist yet.

**Step 3: Write minimal implementation**

Create a shared config helper and import it into both the Firebase client module and `next.config.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/firebase-web-config.test.ts`

Expected: PASS

### Task 2: Switch the Firebase client to the custom auth domain

**Files:**
- Modify: `src/lib/firebase-client.ts`
- Reference: `src/app/login/login-form.tsx`

**Step 1: Use the shared config**

Replace the inline Firebase web config with the shared helper so the browser always defaults to the custom auth domain.

**Step 2: Verify login page compatibility**

Run: `npm test -- --run src/app/api/auth-routes.test.ts src/lib/session.test.ts`

Expected: PASS because the browser config change should not break route/session behavior.

### Task 3: Update deployment and operational docs

**Files:**
- Modify: `README.md`
- Modify: `scripts/deploy-cloud-run.sh`

**Step 1: Document the new redirect contract**

Add the required Google OAuth redirect URI:

- `https://dailysparks.geledtech.com/__/auth/handler`

Document that Cloud Run serves the helper endpoints through the app domain proxy.

**Step 2: Keep deploy config aligned**

Ensure the deployment path still works with the custom auth domain defaults.

### Task 4: Verify, deploy, and smoke test

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `npm test -- --run src/lib/firebase-web-config.test.ts src/app/api/auth-routes.test.ts src/lib/session.test.ts`

Expected: PASS

**Step 2: Run full verification**

Run:

- `npm test -- --run`
- `npm run lint`
- `npm run build`

Expected: PASS

**Step 3: Update Google OAuth redirect**

Ensure the active Web OAuth client allows:

- `https://dailysparks.geledtech.com/__/auth/handler`

**Step 4: Deploy**

Run: `./scripts/deploy-cloud-run.sh`

**Step 5: Smoke test**

Verify:

- `https://dailysparks.geledtech.com/login` returns `200`
- `https://dailysparks.geledtech.com/__/auth/handler` responds through the custom domain
- Google login no longer fails with `redirect_uri_mismatch`

# Editorial Admin Password Login Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the editorial admin email-allowlist flow with a dedicated password login and independent admin session cookie.

**Architecture:** Keep the Firebase parent session untouched for `/login` and `/dashboard`. Add a separate editorial-admin auth helper that signs and verifies a lightweight admin cookie, then move `/admin/editorial` and `/api/admin/*` to that cookie.

**Tech Stack:** Next.js app router, TypeScript, Vitest, Node crypto, local JSON / Firestore editorial source store

---

### Task 1: Add failing tests for editorial admin password auth

**Files:**
- Create: `src/lib/editorial-admin-auth.test.ts`
- Modify: `src/app/api/admin/editorial-sources/route.test.ts`
- Modify: `src/app/admin/editorial/editorial-admin-panel.test.tsx`

**Step 1: Write the failing tests**

Require:

- admin auth requires configured password and session secret
- valid password creates a signed admin session cookie
- invalid password is rejected
- admin API rejects requests without admin cookie
- admin API accepts requests with valid admin cookie

**Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/editorial-admin-auth.test.ts src/app/api/admin/editorial-sources/route.test.ts src/app/admin/editorial/editorial-admin-panel.test.tsx
```

### Task 2: Implement editorial admin auth helpers

**Files:**
- Create: `src/lib/editorial-admin-auth.ts`

**Step 1: Add minimal implementation**

Implement:

- password lookup from env
- session secret lookup from env
- constant-time password comparison
- signed cookie creation
- cookie clearing
- request and cookie-store session verification

**Step 2: Run tests to verify they pass**

```bash
npm test -- src/lib/editorial-admin-auth.test.ts
```

### Task 3: Add failing route tests for admin login and logout

**Files:**
- Modify: `src/app/api/auth-routes.test.ts`

**Step 1: Write tests**

Require:

- `POST /api/admin/login` sets the admin cookie on valid password
- invalid password returns `401`
- `POST /api/admin/logout` clears the admin cookie

**Step 2: Run tests to verify failure**

```bash
npm test -- src/app/api/auth-routes.test.ts
```

### Task 4: Implement admin login and logout routes

**Files:**
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/logout/route.ts`

**Step 1: Add route handlers**

Implement:

- request body validation
- password verification
- secure admin cookie response
- logout cookie clearing

**Step 2: Run tests to verify pass**

```bash
npm test -- src/app/api/auth-routes.test.ts
```

### Task 5: Move admin page and admin API to the new auth chain

**Files:**
- Modify: `src/app/admin/editorial/page.tsx`
- Modify: `src/app/api/admin/editorial-sources/route.ts`
- Modify: `src/app/api/admin/editorial-sources/route.test.ts`

**Step 1: Switch authorization**

Implement:

- `/admin/editorial` redirects unauthenticated admins to `/admin/login`
- admin API checks the editorial-admin cookie
- unauthorized admin API responses clear only the admin cookie

**Step 2: Run tests to verify pass**

```bash
npm test -- src/app/api/admin/editorial-sources/route.test.ts
```

### Task 6: Add the admin login UI and remove the parent-dashboard admin entry

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/admin-login-form.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/dashboard-form.tsx`

**Step 1: Implement the UI updates**

Implement:

- admin login form with password field and submit action
- redirect authed admins away from `/admin/login`
- remove the editorial-admin link from the parent dashboard

**Step 2: Add lightweight render coverage if needed**

Keep at least one render test around the admin panel and login messaging.

### Task 7: Update docs and environment guidance

**Files:**
- Modify: `README.md`

**Step 1: Document**

Document:

- `/admin/login`
- new env vars
- difference between parent login and admin login

### Task 8: Run full verification

```bash
npm test
npm run lint -- src/lib/editorial-admin-auth.ts src/lib/editorial-admin-auth.test.ts src/app/api/admin/login/route.ts src/app/api/admin/logout/route.ts src/app/api/admin/editorial-sources/route.ts src/app/api/admin/editorial-sources/route.test.ts src/app/api/auth-routes.test.ts src/app/admin/login/page.tsx src/app/admin/login/admin-login-form.tsx src/app/admin/editorial/page.tsx src/app/dashboard/page.tsx src/app/dashboard/dashboard-form.tsx README.md
npm run build
```

### Task 9: Commit

```bash
git add docs/plans/2026-04-02-editorial-admin-password-login-design.md docs/plans/2026-04-02-editorial-admin-password-login.md README.md src/lib/editorial-admin-auth.ts src/lib/editorial-admin-auth.test.ts src/app/api/admin/login/route.ts src/app/api/admin/logout/route.ts src/app/api/admin/editorial-sources/route.ts src/app/api/admin/editorial-sources/route.test.ts src/app/api/auth-routes.test.ts src/app/admin/login/page.tsx src/app/admin/login/admin-login-form.tsx src/app/admin/editorial/page.tsx src/app/dashboard/page.tsx src/app/dashboard/dashboard-form.tsx
git commit -m "feat: add password login for editorial admin"
```

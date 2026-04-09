# Login Transition Speed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make parent sign-in feel faster by redirecting successful logins through a lightweight opening-dashboard handoff screen.

**Architecture:** Add a dedicated transition route that only checks for an authenticated session and renders a minimal loading state. Update the login client so successful sign-ins navigate there immediately instead of waiting on the heavier dashboard transition.

**Tech Stack:** Next.js App Router, React client component, Vitest

---

### Task 1: Add a failing transition-page test

**Files:**
- Create: `src/app/opening-dashboard/page.test.tsx`
- Create: `src/app/opening-dashboard/page.tsx`

**Steps:**
1. Write a test that redirects unauthenticated parents from `/opening-dashboard` to `/login`
2. Write a test that renders a lightweight screen when a session exists
3. Run `npm test -- src/app/opening-dashboard/page.test.tsx` and verify it fails before implementation

### Task 2: Implement the transition route

**Files:**
- Create: `src/app/opening-dashboard/page.tsx`
- Create: `src/app/opening-dashboard/screen.tsx`

**Steps:**
1. Add metadata with `noindex`
2. Reuse session cookie validation already used by `/login` and `/dashboard`
3. Render a minimal success/loading handoff screen
4. Redirect the browser from the handoff screen to `/dashboard`

### Task 3: Update successful login navigation

**Files:**
- Modify: `src/app/login/login-form.tsx`

**Steps:**
1. Remove the heavy app-router transition after successful login
2. Navigate directly to `/opening-dashboard`
3. Keep error handling unchanged
4. Keep the Firebase client sign-out as a non-blocking cleanup step

### Task 4: Verify and ship

**Files:**
- Test: `src/app/opening-dashboard/page.test.tsx`
- Modify: `src/app/login/login-form.tsx`

**Steps:**
1. Run `npm test -- src/app/opening-dashboard/page.test.tsx`
2. Run `npm run lint -- src/app/login/login-form.tsx src/app/opening-dashboard/page.tsx src/app/opening-dashboard/screen.tsx src/app/opening-dashboard/page.test.tsx`
3. Run full `npm test`
4. Run `npm run build`

# Stripe Sandbox Checkout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder billing selection flow with real Stripe sandbox Checkout and a verified success return flow.

**Architecture:** Keep the existing billing page and parent session model, add a Stripe server helper plus authenticated Checkout and success handlers, then persist Stripe customer and subscription identifiers back into the parent record. The browser only receives redirect URLs, while Stripe secrets remain server-only.

**Tech Stack:** Next.js App Router, Firebase server sessions, Firestore/local profile store abstraction, Stripe Node SDK, Vitest

---

### Task 1: Add failing Stripe billing tests

**Files:**
- Modify: `src/app/api/auth-routes.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- rejecting unauthenticated checkout creation
- rejecting invalid checkout plans
- creating a Stripe Checkout session URL for a valid logged-in parent

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/api/auth-routes.test.ts`

Expected: FAIL because the checkout route and Stripe helper do not exist yet.

### Task 2: Extend the parent billing model

**Files:**
- Modify: `src/lib/mvp-types.ts`
- Modify: `src/lib/profile-store.ts`
- Modify: `src/lib/mvp-store.ts`
- Modify: `src/lib/local-profile-store.ts`
- Modify: `src/lib/firestore-profile-store.ts`
- Modify: `src/lib/mvp-store.test.ts`

**Step 1: Write the failing test**

Add store coverage for persisting:

- `stripeCustomerId`
- `stripeSubscriptionId`
- `subscriptionStatus`

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/mvp-store.test.ts`

Expected: FAIL because the store cannot yet persist Stripe billing fields.

**Step 3: Write minimal implementation**

Broaden the parent billing update input so server flows can save Stripe IDs and active status.

### Task 3: Add Stripe server helpers and checkout route

**Files:**
- Create: `src/lib/stripe.ts`
- Create: `src/app/api/billing/checkout/route.ts`

**Step 1: Implement configuration helpers**

Add helpers for:

- reading Stripe env vars
- detecting sandbox mode
- returning plan pricing metadata
- creating a server Stripe client

**Step 2: Implement Checkout Session creation**

Use hosted Checkout in subscription mode, keyed off the selected plan.

### Task 4: Upgrade the billing page to launch Checkout

**Files:**
- Modify: `src/app/billing/billing-form.tsx`
- Modify: `src/app/dashboard/dashboard-form.tsx`
- Modify: `src/lib/billing.ts`

**Step 1: Replace local save CTA**

Selecting a plan should:

- call the new checkout route
- redirect to the returned Stripe URL

**Step 2: Surface sandbox state clearly**

Show lightweight copy that billing is running in Stripe test mode when sandbox env is active.

### Task 5: Add a verified success page

**Files:**
- Create: `src/app/billing/success/page.tsx`
- Create: `src/app/billing/success/success-panel.tsx`

**Step 1: Retrieve and verify the Checkout Session**

Require an authenticated parent and confirm the returned session belongs to that parent.

**Step 2: Persist active billing state**

Update the parent record with:

- `subscriptionPlan`
- `subscriptionStatus = active`
- `stripeCustomerId`
- `stripeSubscriptionId`

### Task 6: Add docs and configuration notes

**Files:**
- Modify: `README.md`

Document:

- required Stripe env vars
- sandbox-first deployment guidance
- live-key rotation requirement before production billing

### Task 7: Verify and ship

**Files:**
- Verify all touched files

**Step 1: Run focused tests**

Run:

- `npm test -- --run src/lib/mvp-store.test.ts src/app/api/auth-routes.test.ts`

**Step 2: Run full verification**

Run:

- `npm test -- --run`
- `npm run lint`
- `npm run build`

**Step 3: Commit and deploy**

Commit with a focused message, push `main`, deploy Cloud Run, and smoke test:

- `/billing`
- `/billing/success`
- Stripe sandbox checkout redirect creation

# D2C Marketing Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a lightweight referral loop and internal marketing reporting dashboard for Daily Sparks while keeping GA4 ready for production activation once a real measurement id is provided.

**Architecture:** Add a dedicated referral invite store and thin API layer instead of expanding the parent profile schema. Reuse the existing starter-kit lead capture, login flow, and activation milestones so referral progress can be measured without introducing a new marketing backend.

**Tech Stack:** Next.js App Router, TypeScript, local JSON store + Firestore store pattern, Vitest, existing admin UI components.

---

### Task 1: Document the new Phase 2 architecture

**Files:**
- Create: `docs/plans/2026-04-10-d2c-marketing-phase-2-design.md`
- Create: `docs/plans/2026-04-10-d2c-marketing-phase-2.md`

**Step 1: Write the design doc**

Capture:

- referral trigger points
- referral lifecycle states
- marketing reporting dashboard scope
- GA config dependency note

**Step 2: Save the implementation plan**

List exact files, exact tests, and the TDD order for the implementation.

**Step 3: Commit documentation once implementation is complete**

Use a feature commit that covers the docs and code together.

### Task 2: Add the referral invite data model and store

**Files:**
- Create: `src/lib/marketing-referral-store-types.ts`
- Create: `src/lib/marketing-referral-store.ts`
- Create: `src/lib/local-marketing-referral-store.ts`
- Create: `src/lib/firestore-marketing-referral-store.ts`
- Test: `src/lib/marketing-referral-store.test.ts`

**Step 1: Write the failing tests**

Cover:

- upserting and listing invites
- deduping by referrer + invitee email
- updating invite lifecycle from sent to accepted to trial started

**Step 2: Run the targeted test and verify it fails**

Run:

```bash
npm test src/lib/marketing-referral-store.test.ts
```

**Step 3: Implement the minimal store layer**

Add:

- normalized referral record shape
- local JSON store
- Firestore store
- helper functions for send, accept, and trial-start transitions

**Step 4: Re-run the targeted test**

Run:

```bash
npm test src/lib/marketing-referral-store.test.ts
```

### Task 3: Add referral email delivery

**Files:**
- Create: `src/lib/marketing-referral-email.ts`
- Test: `src/lib/marketing-referral-email.test.ts`

**Step 1: Write the failing tests**

Cover:

- subject and body copy
- starter-kit referral link generation
- calm parent-facing language

**Step 2: Run the targeted test and verify it fails**

Run:

```bash
npm test src/lib/marketing-referral-email.test.ts
```

**Step 3: Implement the email builder and sender**

Reuse the existing transactional email delivery helper and notification design system.

**Step 4: Re-run the targeted test**

Run:

```bash
npm test src/lib/marketing-referral-email.test.ts
```

### Task 4: Add the parent referral API

**Files:**
- Create: `src/app/api/referrals/route.ts`
- Test: `src/app/api/referrals/route.test.ts`

**Step 1: Write the failing tests**

Cover:

- unauthenticated request returns `401`
- authenticated request stores an invite and attempts email delivery
- invalid invitee email returns `400`

**Step 2: Run the targeted test and verify it fails**

Run:

```bash
npm test src/app/api/referrals/route.test.ts
```

**Step 3: Implement the route**

Use session email auth, look up the current parent profile, create/update the invite, and send the referral email.

**Step 4: Re-run the targeted test**

Run:

```bash
npm test src/app/api/referrals/route.test.ts
```

### Task 5: Extend starter-kit capture and login flow for referral attribution

**Files:**
- Modify: `src/app/api/marketing/leads/route.ts`
- Modify: `src/app/api/marketing/leads/route.test.ts`
- Modify: `src/app/api/login/route.ts`
- Modify: `src/app/api/auth-routes.test.ts`
- Modify: `src/app/ib-parent-starter-kit/starter-kit-form.tsx`

**Step 1: Write the failing tests**

Cover:

- starter-kit submission with a valid referral token marks invite accepted
- starter-kit submission still succeeds when the referral token is invalid
- login with the invitee email marks the referral as `trial_started`

**Step 2: Run the targeted tests and verify they fail**

Run:

```bash
npm test src/app/api/marketing/leads/route.test.ts src/app/api/auth-routes.test.ts
```

**Step 3: Implement the minimal changes**

Add:

- `referralToken` support in starter-kit form and route payload
- acceptance update in the lead-capture route
- trial-start update in the login route after profile creation

**Step 4: Re-run the targeted tests**

Run:

```bash
npm test src/app/api/marketing/leads/route.test.ts src/app/api/auth-routes.test.ts
```

### Task 6: Add a lightweight dashboard referral card

**Files:**
- Modify: `src/app/dashboard/dashboard-form.tsx`
- Create: `src/app/api/dashboard/referrals/route.ts`
- Test: `src/app/api/dashboard/referrals/route.test.ts`
- Test: `src/app/dashboard/dashboard-form.test.tsx`

**Step 1: Write the failing tests**

Cover:

- referral card appears only after a value threshold
- referral card can load recent invites
- invite send success and error states render correctly

**Step 2: Run the targeted tests and verify they fail**

Run:

```bash
npm test src/app/api/dashboard/referrals/route.test.ts src/app/dashboard/dashboard-form.test.tsx
```

**Step 3: Implement the minimal UI and data route**

Keep dashboard performance safe by:

- loading referral data from a dedicated authenticated route
- rendering a compact referral form plus recent invite list

**Step 4: Re-run the targeted tests**

Run:

```bash
npm test src/app/api/dashboard/referrals/route.test.ts src/app/dashboard/dashboard-form.test.tsx
```

### Task 7: Add the marketing reporting summary layer

**Files:**
- Create: `src/lib/marketing-reporting.ts`
- Test: `src/lib/marketing-reporting.test.ts`

**Step 1: Write the failing tests**

Cover:

- lead counts
- delivered starter kits
- activation milestone counts
- referral sent / accepted / trial-started counts

**Step 2: Run the targeted test and verify it fails**

Run:

```bash
npm test src/lib/marketing-reporting.test.ts
```

**Step 3: Implement the reporting helper**

Aggregate from:

- marketing leads
- referral invites
- parent profiles and activation milestones

**Step 4: Re-run the targeted test**

Run:

```bash
npm test src/lib/marketing-reporting.test.ts
```

### Task 8: Add the internal marketing reporting page

**Files:**
- Create: `src/app/admin/editorial/marketing/page.tsx`
- Create: `src/app/admin/editorial/marketing/page.test.tsx`
- Modify: `src/app/admin/editorial/editorial-admin-tabs.tsx`
- Modify: `src/app/admin/editorial/editorial-admin-tabs.test.tsx`

**Step 1: Write the failing tests**

Cover:

- new admin tab renders
- page shows marketing funnel metrics
- recent leads and recent referrals render

**Step 2: Run the targeted tests and verify they fail**

Run:

```bash
npm test src/app/admin/editorial/marketing/page.test.tsx src/app/admin/editorial/editorial-admin-tabs.test.tsx
```

**Step 3: Implement the page**

Reuse:

- `UsersMetricCard`
- `UsersSectionHeader`
- existing admin shell and tab patterns

**Step 4: Re-run the targeted tests**

Run:

```bash
npm test src/app/admin/editorial/marketing/page.test.tsx src/app/admin/editorial/editorial-admin-tabs.test.tsx
```

### Task 9: Extend marketing analytics events

**Files:**
- Modify: `src/lib/marketing-analytics.ts`
- Modify: `src/app/ib-parent-starter-kit/starter-kit-form.tsx`
- Modify: `src/app/dashboard/dashboard-form.tsx`

**Step 1: Add the minimal event emissions**

Track:

- `referral_prompt_viewed`
- `referral_invite_sent`
- `starter_kit_referred_submitted`
- `trial_started`

**Step 2: Verify events still degrade safely without GA**

No runtime should fail when `window.gtag` is absent.

### Task 10: Verification and deployment

**Files:**
- Modify if needed: `scripts/deploy-cloud-run.sh`

**Step 1: Run focused tests during development**

Use the targeted commands above after each task.

**Step 2: Run full verification**

```bash
npm run lint
npm test
npm run build
```

**Step 3: Configure GA if the real measurement id is available**

Set:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

If the real value is still unavailable, leave the code deployed and note that GA is implementation-ready but not production-enabled yet.

**Step 4: Commit and deploy**

```bash
git add .
git commit -m "feat: add referral loop and marketing reporting"
git push origin main
```

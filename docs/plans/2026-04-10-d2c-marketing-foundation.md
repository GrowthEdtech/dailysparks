# Daily Sparks D2C Marketing Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship Phase 1 of the Daily Sparks D2C marketing foundation: shared positioning context, analytics instrumentation, lead magnet capture, and stronger activation lifecycle emails.

**Architecture:** Reuse the existing public site, transactional email system, and onboarding reminder scheduler instead of introducing a separate marketing stack. Add a narrow analytics layer, a dedicated marketing lead store, and a public lead magnet entrypoint that feeds lifecycle email and future reporting work.

**Tech Stack:** Next.js App Router, React, Vitest, existing local/Firestore stores, Nodemailer-based transactional delivery.

---

### Task 1: Product marketing context

**Files:**
- Create: `.agents/product-marketing-context.md`

**Steps:**
1. Draft the product marketing context for Daily Sparks.
2. Capture target parent audience, MYP / DP differentiation, objections, and goals.
3. Save the document in `.agents/`.

### Task 2: Analytics foundation

**Files:**
- Create: `src/components/google-analytics.tsx`
- Create: `src/lib/marketing-analytics.ts`
- Modify: `src/app/layout.tsx`
- Test: `src/app/layout.test.ts`

**Steps:**
1. Write tests for conditional GA rendering.
2. Add a GA component that only loads when a measurement id is present.
3. Add a client helper for tracked marketing events.
4. Verify metadata tests still pass.

### Task 3: Lead magnet storage and delivery

**Files:**
- Create: `src/lib/marketing-lead-store-types.ts`
- Create: `src/lib/marketing-lead-store.ts`
- Create: `src/lib/local-marketing-lead-store.ts`
- Create: `src/lib/firestore-marketing-lead-store.ts`
- Create: `src/lib/marketing-lead-email.ts`
- Test: `src/lib/marketing-lead-store.test.ts`
- Test: `src/lib/marketing-lead-email.test.ts`

**Steps:**
1. Write store-contract tests.
2. Add shared schema and store selector.
3. Add local and Firestore implementations.
4. Add starter-kit email builder and delivery helper.

### Task 4: Starter kit public flow

**Files:**
- Create: `src/app/ib-parent-starter-kit/page.tsx`
- Create: `src/app/ib-parent-starter-kit/starter-kit-form.tsx`
- Create: `src/app/api/marketing/leads/route.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/public-seo-pages-content.tsx`
- Test: `src/app/informational-pages.test.tsx`
- Test: `src/app/api/marketing/leads/route.test.ts`

**Steps:**
1. Write failing tests for the new public page and API.
2. Add the public starter kit page.
3. Add the lead capture route.
4. Update homepage and guide CTA split to trial vs starter kit.

### Task 5: Activation sequence upgrade

**Files:**
- Modify: `src/lib/onboarding-reminder-email.ts`
- Test: `src/lib/onboarding-reminder-email.test.ts`
- Review: `src/app/api/internal/onboarding-reminder/run/route.test.ts`

**Steps:**
1. Write failing tests for stage-specific activation copy.
2. Upgrade stage 1, 2, and 3 subject lines and content.
3. Keep scheduler timing and run history unchanged.

### Task 6: Verification and release

**Files:**
- Review: changed files above

**Steps:**
1. Run focused tests for layout, starter kit, lead store, and onboarding reminder email.
2. Run `npm test`.
3. Run `npm run build`.
4. Commit with a conventional commit.
5. Push and deploy.

# Planned Notification Rollout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the three planned notification families into live HTML notifications using the shared design system and the product's existing operational triggers.

**Architecture:** Add lightweight notification-tracking fields to parent records, centralize transactional email delivery, build three shared HTML notification builders, wire trial-ending and delivery-support sends into growth reconciliation, and wire billing-status sends into Stripe invoice events.

**Tech Stack:** Next.js App Router, TypeScript, Nodemailer, Vitest, local/Firestore profile stores, Stripe webhooks.

---

### Task 1: Promote Planned Notification Families To Live Policy

**Files:**
- Modify: `src/lib/notification-email-policy.ts`
- Modify: `src/lib/notification-email-policy.test.ts`

### Task 2: Add Parent Notification Tracking State

**Files:**
- Modify: `src/lib/mvp-types.ts`
- Modify: `src/lib/profile-store.ts`
- Modify: `src/lib/mvp-store.ts`
- Modify: `src/lib/local-profile-store.ts`
- Modify: `src/lib/firestore-profile-store.ts`

### Task 3: Build Shared Transactional Notification Delivery

**Files:**
- Create: `src/lib/notification-email-delivery.ts`
- Test: `src/lib/notification-email-delivery.test.ts`
- Modify: `src/lib/onboarding-reminder-email.ts`

### Task 4: Build Trial Ending / Billing Status / Delivery Support Email Families

**Files:**
- Create: `src/lib/planned-notification-emails.ts`
- Test: `src/lib/planned-notification-emails.test.ts`

### Task 5: Wire Trial Ending And Delivery Support Into Growth Reconciliation

**Files:**
- Modify: `src/lib/growth-reconciliation.ts`
- Create: `src/lib/growth-notification-runner.ts`
- Test: `src/lib/growth-notification-runner.test.ts`
- Modify: `src/app/api/internal/growth-reconciliation/run/route.ts`
- Modify: `src/app/api/internal/growth-reconciliation/run/route.test.ts`

### Task 6: Wire Billing Status Into Stripe Invoice Events

**Files:**
- Create: `src/lib/billing-status-notification.ts`
- Test: `src/lib/billing-status-notification.test.ts`
- Modify: `src/lib/stripe.ts`

### Task 7: Verify, Commit, Deploy

Run:
- `npm run lint`
- `npm test`
- `npm run build`

Deploy Cloud Run and smoke-test:
- onboarding reminder route
- growth reconciliation route
- Stripe webhook route contract

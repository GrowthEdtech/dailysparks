# Notification Email Policy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Formalize which Daily Sparks outbound emails should be lightweight HTML notifications versus PDF attachment transports, then land a shared HTML notification design system in production code.

**Architecture:** Introduce a typed policy layer to classify email families, add one reusable email-safe HTML renderer for parent-facing notifications, migrate the onboarding reminder onto it, and keep Goodnotes delivery flows explicitly categorized as Typst PDF transports.

**Tech Stack:** Next.js App Router, TypeScript, Nodemailer, Vitest, inline-style email HTML.

---

### Task 1: Record The Outbound Email Policy

**Files:**
- Create: `docs/plans/2026-04-05-notification-email-policy-design.md`
- Create: `docs/plans/2026-04-05-notification-email-policy.md`
- Create: `src/lib/notification-email-policy.ts`
- Test: `src/lib/notification-email-policy.test.ts`

**Step 1: Write the failing test**

- Add tests that lock:
  - onboarding reminders are `HTML notifications`
  - Goodnotes welcome note delivery remains `PDF attachment transport`
  - Daily Brief delivery remains `PDF attachment transport`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/notification-email-policy.test.ts`
Expected: FAIL because the policy module does not exist yet.

**Step 3: Write minimal implementation**

- Create a typed policy module with live families and planned notification
  families.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/notification-email-policy.test.ts`
Expected: PASS

### Task 2: Build The Shared HTML Notification Design System

**Files:**
- Create: `src/lib/notification-email-design-system.ts`
- Test: `src/lib/notification-email-design-system.test.ts`

**Step 1: Write the failing test**

- Add tests that lock:
  - table-based email-safe shell
  - hidden preview text
  - premium minimal palette
  - primary CTA and plain-text fallback generation

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/notification-email-design-system.test.ts`
Expected: FAIL because the renderer does not exist yet.

**Step 3: Write minimal implementation**

- Create the shared HTML + text builder with reusable panels, CTA, body
  paragraphs, and bullet sections.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/notification-email-design-system.test.ts`
Expected: PASS

### Task 3: Move Onboarding Reminder Onto The Shared Design System

**Files:**
- Modify: `src/lib/onboarding-reminder-email.ts`
- Modify: `src/lib/onboarding-reminder-email.test.ts`

**Step 1: Write the failing test**

- Extend reminder email tests to assert the shared shell markers and policy
  alignment.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/onboarding-reminder-email.test.ts`
Expected: FAIL because the reminder still uses its local renderer.

**Step 3: Write minimal implementation**

- Refactor onboarding reminder email generation to call the shared design
  system builder.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/onboarding-reminder-email.test.ts`
Expected: PASS

### Task 4: Keep PDF Delivery Explicitly Out Of The HTML Notification Path

**Files:**
- Modify: `src/lib/goodnotes-delivery.ts`
- Modify: `src/lib/goodnotes-delivery.test.ts`

**Step 1: Write the failing test**

- Add tests that assert Goodnotes welcome note and Daily Brief delivery stay in
  the `PDF attachment transport` bucket and do not accidentally become
  HTML-only notifications.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/goodnotes-delivery.test.ts`
Expected: FAIL because the policy assertions are not wired in yet.

**Step 3: Write minimal implementation**

- Import the policy module and expose the relevant policy entries so the
  transport role is explicit in code.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/goodnotes-delivery.test.ts`
Expected: PASS

### Task 5: Verify And Roll Out

**Files:**
- Modify: `README.md` (only if rollout notes are useful)

**Step 1: Run focused verification**

Run:
- `npm run lint -- src/lib/notification-email-policy.ts src/lib/notification-email-policy.test.ts src/lib/notification-email-design-system.ts src/lib/notification-email-design-system.test.ts src/lib/onboarding-reminder-email.ts src/lib/onboarding-reminder-email.test.ts src/lib/goodnotes-delivery.ts src/lib/goodnotes-delivery.test.ts`
- `npm test -- src/lib/notification-email-policy.test.ts src/lib/notification-email-design-system.test.ts src/lib/onboarding-reminder-email.test.ts src/lib/goodnotes-delivery.test.ts`

Expected: PASS

**Step 2: Run full verification**

Run:
- `npm run lint`
- `npm test`
- `npm run build`

Expected: PASS with only known baseline warnings.

**Step 3: Deploy and smoke-test**

- Deploy Cloud Run
- Verify the onboarding reminder route still works
- Verify Goodnotes welcome note / Daily Brief delivery routes remain healthy

**Step 4: Commit**

```bash
git add docs/plans/2026-04-05-notification-email-policy-design.md docs/plans/2026-04-05-notification-email-policy.md src/lib/notification-email-policy.ts src/lib/notification-email-policy.test.ts src/lib/notification-email-design-system.ts src/lib/notification-email-design-system.test.ts src/lib/onboarding-reminder-email.ts src/lib/onboarding-reminder-email.test.ts src/lib/goodnotes-delivery.ts src/lib/goodnotes-delivery.test.ts
git commit -m "feat: add notification email policy system"
```

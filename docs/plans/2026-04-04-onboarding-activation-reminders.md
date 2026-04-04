# Onboarding Activation Reminders Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Send a small, transactional activation reminder to families who have completed Google login but still do not have a dispatchable Goodnotes or Notion channel, then surface reminder status clearly in admin so operations can see who is still stuck in setup.

**Architecture:** Extend the parent profile model with reminder-attempt tracking, derive reminder eligibility from the existing access state and delivery readiness model, add one internal scheduler route that sends reminder emails in rolling local-time waves, and surface reminder state in the existing `Users` admin workspace. Reuse the current SMTP-based transactional email path, scheduler auth, and profile stores rather than adding a separate campaign system.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Vitest, Nodemailer, local/Firestore profile stores, Cloud Scheduler, existing admin editorial UI

---

### Task 1: Add reminder tracking fields to the parent profile model

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/mvp-types.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/profile-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/mvp-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/local-profile-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/firestore-profile-store.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/mvp-store.test.ts`

**Step 1: Write the failing tests**

Cover:
- new parent profiles default reminder tracking fields cleanly
- reminder tracking updates persist through the shared profile store
- list and get profile flows preserve the new fields for both local and Firestore-backed normalization

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/mvp-store.test.ts`

Expected: FAIL because the reminder fields and update API do not exist yet.

**Step 3: Write minimal implementation**

Add parent-level reminder tracking:
- `onboardingReminderCount`
- `onboardingReminderLastAttemptAt`
- `onboardingReminderLastSentAt`
- `onboardingReminderLastStage`
- `onboardingReminderLastStatus`
- `onboardingReminderLastMessageId`
- `onboardingReminderLastError`

Also add one store update method dedicated to reminder tracking.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/mvp-store.test.ts`

Expected: PASS

### Task 2: Add reminder policy and email template

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/onboarding-activation-reminder.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/onboarding-activation-reminder.test.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/onboarding-reminder-email.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/onboarding-reminder-email.test.ts`

**Step 1: Write the failing tests**

Cover:
- only `trial_active` or `active` families with meaningful student setup and no dispatchable channel become reminder candidates
- reminder stages follow the `T+24h`, `T+72h`, `T+7d` cadence
- families with healthy delivery channels or expired access are excluded
- the email template clearly leads with Goodnotes setup and keeps Notion secondary

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/onboarding-activation-reminder.test.ts src/lib/onboarding-reminder-email.test.ts`

Expected: FAIL because the reminder policy and email sender do not exist yet.

**Step 3: Write minimal implementation**

Add:
- a reusable reminder policy helper that derives whether a family is due now
- a transactional email sender that uses the existing SMTP transport configuration
- plain-text and HTML reminder copy with one primary CTA back to the dashboard

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/onboarding-activation-reminder.test.ts src/lib/onboarding-reminder-email.test.ts`

Expected: PASS

### Task 3: Add the internal reminder scheduler route

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/onboarding-reminder/run/route.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/onboarding-reminder/run/route.test.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/mvp-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/profile-store.ts`

**Step 1: Write the failing tests**

Cover:
- unauthenticated requests are rejected with the scheduler secret check
- due families receive a reminder and profile reminder tracking is updated
- non-due families are skipped with structured reasons
- failed sends do not spam continuously because recent attempts are throttled

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/onboarding-reminder/run/route.test.ts`

Expected: FAIL because the route does not exist yet.

**Step 3: Write minimal implementation**

Add:
- one internal scheduler route using the existing scheduler header auth
- profile enumeration plus reminder eligibility filtering
- transactional email sending
- summary response counts for checked, due, sent, failed, and skipped families

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/onboarding-reminder/run/route.test.ts`

Expected: PASS

### Task 4: Surface reminder state in admin users

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/users-admin-helpers.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/page.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/[parentId]/page.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/page.test.tsx`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/users/[parentId]/page.test.tsx`

**Step 1: Write the failing tests**

Cover:
- users list shows which families need activation reminders or have recently received one
- detail view shows reminder status, reminder count, last sent time, and latest send outcome
- admin copy distinguishes between “not yet reminded”, “reminder due”, and “already connected”

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/admin/editorial/users/page.test.tsx src/app/admin/editorial/users/[parentId]/page.test.tsx`

Expected: FAIL because admin currently has no reminder visibility.

**Step 3: Write minimal implementation**

Add:
- a derived reminder status label helper
- summary counts and badges in the `Users` list
- a dedicated reminder status section in the user detail page

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/admin/editorial/users/page.test.tsx src/app/admin/editorial/users/[parentId]/page.test.tsx`

Expected: PASS

### Task 5: Add scheduler support and document operator behavior

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/scripts/configure-daily-brief-scheduler.sh`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/README.md`

**Step 1: Write the failing verification**

Run: `bash -n scripts/configure-daily-brief-scheduler.sh`

Expected: PASS for syntax, but manual inspection will show there is no onboarding reminder job documented or configured.

**Step 2: Write minimal implementation**

Add:
- a half-hourly Cloud Scheduler job for the onboarding reminder route
- operator documentation for reminder cadence, SMTP requirements, and admin tracking expectations

**Step 3: Run verification**

Run:
- `bash -n scripts/configure-daily-brief-scheduler.sh`
- `rg -n "onboarding reminder|activation reminder" README.md scripts/configure-daily-brief-scheduler.sh`

Expected: PASS

### Task 6: Run verification and deploy safely

**Files:**
- Verify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web`

**Step 1: Run focused regression checks**

Run:
- `npm test -- src/lib/mvp-store.test.ts src/lib/onboarding-activation-reminder.test.ts src/lib/onboarding-reminder-email.test.ts src/app/api/internal/onboarding-reminder/run/route.test.ts src/app/admin/editorial/users/page.test.tsx src/app/admin/editorial/users/[parentId]/page.test.tsx`

Expected: PASS

**Step 2: Run full verification**

Run:
- `npm run lint`
- `npm test`
- `npm run build`

Expected: PASS

**Step 3: Commit and deploy**

```bash
git add docs/plans/2026-04-04-onboarding-activation-reminders.md src/ README.md scripts/configure-daily-brief-scheduler.sh
git commit -m "feat: add onboarding activation reminders"
git push origin main
./scripts/deploy-cloud-run.sh
./scripts/configure-daily-brief-scheduler.sh
```

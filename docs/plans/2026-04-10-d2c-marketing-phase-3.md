# D2C Marketing Phase 3 Implementation Plan

## Goal

Implement starter-kit lead nurture automation and surface its evidence in admin.

## Task 1: Extend marketing lead schema and stores

- Modify: `src/lib/marketing-lead-store-types.ts`
- Modify: `src/lib/marketing-lead-store.ts`
- Modify: `src/lib/local-marketing-lead-store.ts`
- Modify: `src/lib/firestore-marketing-lead-store.ts`
- Modify: `src/lib/marketing-lead-store.test.ts`

Add nurture state fields and helper methods for updating nurture delivery state.

## Task 2: Add nurture assessment logic

- Create: `src/lib/marketing-lead-nurture.ts`
- Create: `src/lib/marketing-lead-nurture.test.ts`

Model the 3-stage delay sequence and determine whether a lead is due based on:

- time since lead capture
- existing nurture stage progress
- whether a parent profile already exists for the lead email

## Task 3: Add nurture email builder and sender

- Create: `src/lib/marketing-lead-nurture-email.ts`
- Create: `src/lib/marketing-lead-nurture-email.test.ts`

Reuse the notification email design system and make each stage explicitly move the lead toward trial start.

## Task 4: Add internal scheduler route

- Create: `src/app/api/internal/marketing/lead-nurture/run/route.ts`
- Create: `src/app/api/internal/marketing/lead-nurture/run/route.test.ts`

Use existing scheduler auth conventions and return a structured run summary:

- checked
- eligible
- due
- sent
- failed
- skipped

## Task 5: Extend marketing reporting summary and admin page

- Modify: `src/lib/marketing-reporting.ts`
- Modify: `src/lib/marketing-reporting.test.ts`
- Modify: `src/app/admin/editorial/marketing/page.tsx`
- Modify: `src/app/admin/editorial/marketing/page.test.tsx`

Add nurture counts and recent nurture status into the existing admin marketing page.

## Task 6: Update scheduler config

- Modify: `scripts/configure-daily-brief-scheduler.sh`

Add a daily lead-nurture scheduler job using the same internal secret header pattern.

## Task 7: Verification

Run:

```bash
npm test -- \
  src/lib/marketing-lead-store.test.ts \
  src/lib/marketing-lead-nurture.test.ts \
  src/lib/marketing-lead-nurture-email.test.ts \
  src/app/api/internal/marketing/lead-nurture/run/route.test.ts \
  src/lib/marketing-reporting.test.ts \
  src/app/admin/editorial/marketing/page.test.tsx

npm run lint
npm test
npm run build
```

If green:

```bash
git add .
git commit -m "feat: add starter kit lead nurture sequence"
git push origin main
./scripts/deploy-cloud-run.sh
```

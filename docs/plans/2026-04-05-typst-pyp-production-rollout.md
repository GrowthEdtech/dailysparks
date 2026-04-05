# Typst PYP Production Rollout Implementation Plan

## Goal

Move `PYP production` into the Typst rollout while keeping `pdf-lib` as a rollback renderer and leaving `MYP / DP` on `pdf-lib`.

## Task 1: Add failing tests

Files:

- Modify: `src/lib/daily-brief-renderer-policy.test.ts`
- Modify: `src/app/api/internal/daily-brief/deliver/route.test.ts`
- Modify: `src/app/api/admin/daily-brief-resend/route.test.ts`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

Add tests proving:

- `PYP production + auto` resolves to `typst`
- `DAILY_BRIEF_PYP_PRODUCTION_RENDERER_DEFAULT=pdf-lib` rolls back production to `pdf-lib`
- production `deliver` route uses Typst for `PYP` when no explicit renderer is passed
- admin resend for a `PYP production` brief resolves `auto -> typst`
- admin detail rollout copy mentions both `PYP production default` and non-PYP fallback

Run:

```bash
npm test -- src/lib/daily-brief-renderer-policy.test.ts src/app/api/internal/daily-brief/deliver/route.test.ts src/app/api/admin/daily-brief-resend/route.test.ts 'src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx'
```

## Task 2: Extend shared renderer policy

Files:

- Modify: `src/lib/daily-brief-renderer-policy.ts`

Implement:

- `PYP production + auto` default -> `typst`
- new env override:
  - `DAILY_BRIEF_PYP_PRODUCTION_RENDERER_DEFAULT`

Keep:

- `PYP canary/test + auto` -> `typst`
- non-PYP defaults -> `pdf-lib`

## Task 3: Thread policy into automated production delivery

Files:

- Modify: `src/app/api/internal/daily-brief/deliver/route.ts`

Implement:

- request-level renderer mode can still explicitly force `pdf-lib` or `typst`
- when renderer is omitted, resolve `auto` per brief
- pass the resolved renderer to `deliverHistoryBriefToProfiles`

## Task 4: Update admin resend and rollout visibility

Files:

- Modify: `src/app/api/admin/daily-brief-resend/route.ts`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`

Implement:

- `PYP production brief + auto` resend -> Typst
- detail page rollout messaging:
  - `PYP canary default`
  - `PYP production default`
  - `MYP / DP production fallback`

## Task 5: Verify and release

Run:

```bash
npm run lint
npm test
npm run build
git push origin main
./scripts/deploy-cloud-run.sh
```

Smoke-check:

- `/api/admin/daily-brief-resend` unauthorized still `401`
- `/api/admin/daily-brief-typst` unauthorized still `401`
- Cloud Run revision updates successfully

# Typst PYP Canary Rollout Design

## Goal

Start the real Typst migration without forcing a full renderer switch. In this phase, PYP canary-style flows should default to Typst, while production delivery stays on `pdf-lib` unless an operator explicitly overrides it.

## Why this phase exists

The codebase now has three useful states:

- `pdf-lib` is stable in production.
- Typst is visually better for editorial PDFs, especially for PYP.
- Admin already has compare surfaces and manual renderer selection.

What is still missing is a safe default path that moves real usage toward Typst without turning the migration into an all-or-nothing cutover.

## Scope

This phase covers:

- PYP manual staged tests (`recordKind = test`, canary delivery)
- PYP manual resend/backfill when the selected brief is a `test` brief
- admin-visible status and policy labels
- a rollback flag that can push these paths back to `pdf-lib`

This phase does not change:

- automated production delivery defaults
- non-PYP default renderer selection
- email rendering
- Notion delivery

## Design

### Renderer policy layer

Add a shared policy helper that resolves the effective renderer from:

1. explicit admin override
2. programme + attachment context
3. environment-backed default

The important business rule for this phase:

- `PYP + canary/test` defaults to `Typst`
- everything else defaults to `pdf-lib`

The policy must remain overridable through environment so operators can roll back quickly without code changes.

### Rollback behavior

Use environment-backed string defaults rather than a boolean feature flag. That keeps the future rollout path clean.

Recommended env surface:

- `DAILY_BRIEF_PYP_CANARY_RENDERER_DEFAULT`
  - allowed values: `typst`, `pdf-lib`
  - default in code: `typst`
- `DAILY_BRIEF_PYP_PRODUCTION_RENDERER_DEFAULT`
  - allowed values: `typst`, `pdf-lib`
  - default in code: `pdf-lib`

This gives us a future production switch path without redesigning the policy layer later.

### Admin interaction model

Admin should no longer force a literal renderer selection by default. Instead, manual actions should support:

- `auto`
- `pdf-lib`
- `typst`

`auto` means “use the current rollout policy.”

This solves two problems:

- it lets PYP canary default to Typst without hiding the operator’s control
- it lets rollback happen centrally through environment rather than by retraining operators

### Admin visibility

Operators should be able to see both:

- the selected mode: `Auto`, `pdf-lib`, or `Typst`
- the resolved renderer actually used

The UI should explicitly call out when `auto` resolves to Typst because of the current PYP canary policy. That keeps the migration explainable.

Recommended labels:

- `Auto (PYP canary default: Typst)`
- `Auto (rollback active: pdf-lib)`
- `Resolved renderer: Typst prototype`

### Verification chain

We need evidence at three layers:

1. route response payloads include the resolved renderer and policy label
2. admin panels show the policy-aware summary
3. delivery receipts persist the actual renderer used

This keeps operational review honest even when the operator used `auto`.

## Files likely touched

- `src/lib/goodnotes-delivery.ts`
- `src/lib/daily-brief-renderer-policy.ts` (new)
- `src/app/api/admin/daily-brief-test-run/route.ts`
- `src/app/api/admin/daily-brief-resend/route.ts`
- `src/app/admin/editorial/daily-briefs/renderer-options.ts`
- `src/app/admin/editorial/daily-briefs/manual-test-run-panel.tsx`
- `src/app/admin/editorial/daily-briefs/[briefId]/manual-resend-panel.tsx`
- `src/app/admin/editorial/daily-briefs/manual-test-run-summary.ts`
- `src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`

## Success criteria

- PYP staged tests use Typst when the operator leaves renderer on `auto`
- PYP test-brief resend uses Typst when renderer is `auto`
- switching `DAILY_BRIEF_PYP_CANARY_RENDERER_DEFAULT=pdf-lib` flips the default without code changes
- admin UI shows both selected mode and resolved renderer
- receipts continue to record the actual renderer used

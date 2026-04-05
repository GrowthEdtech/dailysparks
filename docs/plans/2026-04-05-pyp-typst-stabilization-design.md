# PYP Typst Stabilization Design

## Goal

Turn the new `PYP production -> Typst` rollout into an observable, auditable, and rollback-friendly system before expanding Typst to `MYP`.

## Scope

This phase adds four operator-facing capabilities:

1. `renderer ops summary`
2. `PYP one-page compliance audit`
3. `Typst fallback visibility`
4. `MYP compare-only rollout plan`

## Design

### 1. Persist renderer audit at the brief level

Daily brief history currently stores renderer only at the delivery receipt level. That is not enough for operations because:

- one brief can have multiple receipts
- the admin list page needs per-brief rollout signals
- PYP one-page compliance needs a brief-level audit record

We will add a normalized `renderAudit` object to `DailyBriefHistoryRecord`:

- `renderer`
- `layoutVariant`
- `pageCount`
- `onePageCompliant`
- `auditedAt`

This will be written whenever a Goodnotes PDF is generated for delivery or manual resend.

### 2. Compute audit from the real rendered PDF

The audit should not be inferred from policy labels alone. We will derive it from the actual output:

- renderer comes from the selected renderer
- layout variant comes from `buildOutboundDailyBriefPacket`
- page count comes from loading the actual PDF bytes
- `onePageCompliant` is `true` only when:
  - programme is `PYP`
  - renderer is `typst`
  - page count is `1`

This keeps the compliance signal honest.

### 3. Add rollout summary on the Daily Briefs admin page

The list page should gain a compact `Renderer rollout` section that explains:

- `PYP production`: Typst default
- `Rollback`: pdf-lib remains available
- `MYP next`: compare-only

It should also surface counts from the current production run:

- `Typst delivered briefs`
- `PYP one-page compliant`
- `PYP pdf-lib fallback`
- `MYP compare-only pending`

### 4. Surface fallback visibility on list and detail

Operators should not need to inspect raw receipts to understand whether a brief used the expected renderer.

List/detail surfaces will show:

- `Typst verified`
- `PYP one-page`
- `pdf-lib fallback`
- `Rollback active`
- `Compare-only next`

These are derived from `renderAudit` plus current renderer policy.

### 5. Keep MYP compare-only explicit

We are not switching `MYP` production in this phase. Instead we make the next step visible in admin so the rollout remains intentional:

- `MYP compare-only` shown in rollout summary
- explicit note that MYP remains on `pdf-lib` in production

## Non-goals

- No `MYP` production default change
- No `DP` rollout changes
- No email renderer migration
- No removal of `pdf-lib`

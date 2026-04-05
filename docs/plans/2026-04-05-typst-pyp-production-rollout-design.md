# Typst PYP Production Rollout Design

## Objective

Extend the existing Typst rollout from `PYP canary/test` into `PYP production`, while keeping `pdf-lib` available as a fast rollback path and leaving `MYP / DP` untouched.

## Why this is the right next step

We already proved three things in phase 1:

- Typst is visually stronger for PYP briefs
- admin-only compare and canary/test workflows are stable
- the renderer policy layer can expose `selected mode`, `resolved renderer`, and `rollback state`

That means the next safest expansion is not a full renderer switch. It is a **programme-scoped production rollout**:

- `PYP` moves to Typst by default
- `MYP / DP` stay on `pdf-lib`
- operators keep an explicit override
- env-backed rollback stays available

## Scope

### In scope

- shared renderer policy defaults `PYP production` to Typst
- internal production deliver route resolves renderer **per brief**
- manual resend for `PYP production` also resolves `auto -> Typst`
- admin detail page shows rollout state for:
  - `PYP canary`
  - `PYP production`
  - non-PYP fallback

### Out of scope

- switching `MYP / DP` production to Typst
- removing `pdf-lib`
- changing email rendering
- changing non-PDF flows

## Design decisions

### 1. Policy stays central

The single source of truth remains `daily-brief-renderer-policy.ts`.

New defaults:

- `PYP + canary/test + auto` -> `typst`
- `PYP + production + auto` -> `typst`
- everything else + `auto` -> `pdf-lib`

### 2. Rollback stays env-driven

Two env knobs define the rollout:

- `DAILY_BRIEF_PYP_CANARY_RENDERER_DEFAULT`
- `DAILY_BRIEF_PYP_PRODUCTION_RENDERER_DEFAULT`

Both accept:

- `typst`
- `pdf-lib`

Code defaults should be:

- canary -> `typst`
- production -> `typst`

If production needs rollback, operators can set:

```bash
DAILY_BRIEF_PYP_PRODUCTION_RENDERER_DEFAULT=pdf-lib
```

without reverting code.

### 3. Production delivery resolves per brief, not per request

The internal `deliver` route may process multiple briefs in one run. Because a single run can include:

- `PYP`
- `MYP`
- `DP`

the renderer cannot stay a single request-wide default. It must resolve **inside the brief loop** so that:

- PYP production briefs use Typst
- MYP / DP briefs continue using pdf-lib

### 4. Admin language should reflect rollout reality

The current rollout card says:

- `PYP canary default`
- `Production fallback`

That becomes inaccurate once PYP production also moves to Typst.

The detail page should instead explain:

- `PYP canary default -> Typst prototype`
- `PYP production default -> Typst prototype`
- `MYP / DP production default -> pdf-lib live`

This keeps the rollout understandable for operators.

## Risks

### Risk: production route starts applying Typst too broadly

Mitigation:

- resolve policy per brief using `programme + attachmentMode`
- lock behavior with deliver-route tests for PYP and non-PYP

### Risk: admin copy says Typst but actual production uses pdf-lib after rollback

Mitigation:

- renderer card must be driven by the same policy helper
- policy labels must mention rollback when env is active

### Risk: resend path drifts from automated production delivery

Mitigation:

- manual resend stays on the same shared policy helper
- add explicit tests for `PYP production brief + auto`

## Success criteria

- `PYP production` auto resolves to Typst
- `PYP production` can be rolled back via env to pdf-lib
- production `deliver` route uses Typst for PYP and pdf-lib for non-PYP in the same release
- admin detail page explains the rollout accurately
- tests and build stay green

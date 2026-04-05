# MYP Typst Compare-Only Rollout Design

## Goal
Use the stabilized PYP Typst rollout as proof that the PDF pipeline is ready for the next stage, then introduce `MYP compare-only` without changing `MYP production` delivery defaults.

## Recommended Approach
1. Keep `MYP production` on `pdf-lib`.
2. Make `MYP canary/test` resolve to `Typst` by default under `auto`.
3. Add a dedicated `MYP compare-only` content budget and page policy in the shared outbound packet and Typst template.
4. Expose MYP validation progress in admin so operators can see:
   - how many MYP briefs are still compare-only,
   - how many MYP Typst audits exist,
   - how many MYP Typst renders stayed within the compare page budget.
5. Make the admin test/resend surfaces explain the validation path clearly so operators know when `auto` stays on `pdf-lib` and when they should choose Typst explicitly.

## Scope
- Renderer policy for `MYP canary/test`
- MYP packet and Typst layout policy
- Render audit expansion for MYP page-policy compliance
- Daily Briefs list/detail compare metrics and operator messaging
- Manual test / resend validation path for MYP

## Non-Goals
- Switching `MYP production` to Typst
- Changing `DP` rollout
- Replacing the current `PYP` rollout metrics

## Business Semantics
- `PYP`: production Typst-first, rollback visible
- `MYP`: compare-only, validate Typst through canary/test and optional manual resend override
- `DP`: unchanged

## Admin UX Principles
- Show rollout state as an operator-readable system, not as hidden policy logic.
- Separate:
  - `live production default`
  - `compare-only validation path`
  - `page-policy compliance`
- Keep `auto` safe:
  - `MYP canary/test` → Typst
  - `MYP production` → pdf-lib

## Validation Standard
- MYP Typst compare-only should target `<= 2 pages`
- Admin should show both:
  - audited count
  - compliance ratio
- Manual resend on a production MYP brief should keep `auto` on `pdf-lib`, but the UI should explicitly tell operators to pick `Typst prototype` when they want compare-only validation.

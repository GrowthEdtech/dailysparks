# 2026-04-05 Daily Brief Typst Full Cutover

## Goal

Move the active `Daily Brief` PDF chain for `PYP`, `MYP`, and `DP` to Typst across:

- production delivery
- canary/test runs
- manual resend/backfill
- admin renderer messaging and audit visibility

Keep `pdf-lib` readable only as a legacy historical renderer for existing receipts,
render audits, and thumbnails on old records.

## Decision

Adopt a single live renderer policy for new `Daily Brief` delivery:

- `auto` => `typst`
- manual override => `typst`
- no active operator path exposes `pdf-lib`

`pdf-lib` is no longer a live rollout choice for new `Daily Brief` output.

## Implementation

1. Renderer policy
- Remove `pdf-lib` from active `Daily Brief` renderer modes
- Resolve all `auto` Daily Brief renderer decisions to Typst
- Update policy labels from `Typst prototype` to `Typst live`

2. Delivery defaults
- Default `sendBriefToGoodnotes`, stage delivery, and manual resend to Typst
- Remove Typst prototype suffixes from live filenames
- Mark any historical `pdf-lib` output with a legacy-only filename suffix when regenerated for audit

3. Admin/operator surfaces
- Remove `pdf-lib` from manual test and resend selectors
- Replace compare-only / rollback wording with Typst-live wording
- Show `Legacy pdf-lib` only when a stored record already contains old receipts or audits

4. Ops summary
- Replace rollout metrics tied to `PYP fallback` and `MYP compare-only`
- Track:
  - Typst delivered briefs
  - Typst audited briefs
  - PYP one-page compliance
  - MYP two-page compliance
  - legacy pdf-lib records

## Verification

- `npm run lint`
- `npm test`
- `npm run build`

Expected build caveat remains the existing Turbopack NFT warning already seen in prior releases.

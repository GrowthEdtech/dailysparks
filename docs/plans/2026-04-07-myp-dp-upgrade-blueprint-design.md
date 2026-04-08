# MYP DP Upgrade Blueprint Design

## Goal

Reframe Daily Sparks from a three-stage public offering into a `MYP + DP` dual-tier academic reading system while preserving the existing shared editorial spine, operational stability, and historical `PYP` records.

## Why This Change

The current system already has strong foundations:

- one shared daily topic and source-selection spine
- programme-aware generation for `PYP`, `MYP`, and `DP`
- mature delivery, monitoring, notification, and admin operations

What it does not yet have is a product surface that matches the new `MYP + DP` positioning:

- public onboarding still exposes `PYP`
- new profiles still default to `PYP`
- students cannot yet express subject-interest preferences
- the current prompt/output contract is still too generic for a true `MYP` bridge tier and `DP` academic tier

## Product Decision

Daily Sparks should keep the existing shared editorial spine, but the public-facing product should now center on:

- `MYP` as the bridge tier for structured analytical reading
- `DP` as the academic tier for evidence, argument, and independent thinking

`PYP` should move into legacy mode:

- hidden from public onboarding and public marketing
- preserved in admin, history, delivery, and existing records
- not expanded with new feature work in this phase

## Scope Of This Phase

This phase should land the first two upgrade steps:

1. `PYP soft-hide`
2. `Interest taxonomy`

This phase does **not** yet implement:

- the full `MYP / DP content model v2`
- the weekend delivery policy
- the knowledge-bank product layer

Those should follow after the public-facing preference model is stable.

## Decision 1: PYP Soft-Hide

`PYP` should be hidden on public-facing surfaces without being removed from the system.

### Public-Side Behavior

- The marketing homepage should no longer position Daily Sparks as a `PYP + MYP` product.
- Public onboarding and dashboard profile selection should only expose `MYP` and `DP`.
- New profiles created through the normal login/signup path should default to `MYP`, not `PYP`.

### Legacy Safety Rules

- Existing `PYP` student records must remain valid and readable.
- Admin surfaces, historical delivery records, render audits, and operations views must continue to support `PYP`.
- Public profile update APIs may continue accepting `PYP` for legacy records, but the public UI should not present it as a selectable option.

### Why Soft-Hide Instead Of Delete

Deleting `PYP` now would create unnecessary risk because `PYP` is deeply embedded in:

- brief history
- Typst packet variants
- render audits
- synthetic canary evidence
- admin reporting and GEO traces

Soft-hide gives the product a clean `MYP + DP` public story while preserving operational continuity and historical integrity.

## Decision 2: Interest Taxonomy

Student preferences should expand from `programme + programmeYear` into:

- `programme`
- `programmeYear`
- `interestTags[]`

### MYP Taxonomy

- `Tech & Innovation`
- `Earth & Environment`
- `Society & Culture`
- `History & Individuals`

### DP Taxonomy

- `Economics`
- `Global Politics`
- `Psychology`
- `Science & Technology`
- `History`
- `Philosophy`
- `Law`
- `TOK`

### Preference Rules

- Taxonomy must be programme-aware.
- `MYP` should only save `MYP` tags.
- `DP` should only save `DP` tags.
- `PYP` should carry an empty interest list in this phase.
- Programme changes should prune incompatible tags automatically.

### UX Rules

- The dashboard should show an `Interest focus` section after `Learning stage`.
- Users should be encouraged to choose `2–3` focus areas, but the model should allow `0+` so legacy records and progressive onboarding remain safe.
- Legacy `PYP` users should see that `PYP` is in legacy mode while still being able to move into `MYP` or `DP`.

## Architecture

### Data Model

The student record should add:

- `interestTags: string[]`

This must be normalized in both local and Firestore stores.

### Preference Helpers

The repo should centralize public-programme and taxonomy logic in one place so the dashboard, profile route, and future delivery policy use the same rules.

That helper layer should expose:

- public programme options
- default public programme
- programme-aware interest options
- validation and pruning helpers

### Public Flow Boundary

The public dashboard and marketing pages should read from the public helper set, not from the full internal `IB_PROGRAMMES` list.

Internal delivery, admin, and history logic should continue using the full `IB_PROGRAMMES` set.

## Testing Strategy

This phase should lock behavior at four levels:

1. taxonomy helper tests
- public programmes are `MYP` and `DP`
- new-profile defaults resolve to `MYP`
- tag validation/pruning is programme-aware

2. profile store persistence tests
- `interestTags` persist through `updateStudentPreferences`
- programme switches prune incompatible tags

3. profile route tests
- valid `interestTags` are accepted
- invalid programme/tag combinations are rejected

4. dashboard rendering tests
- public selector hides `PYP`
- `Interest focus` renders the correct taxonomy
- legacy `PYP` profiles show a legacy-mode explanation

## Risks

### Hidden Default Drift

If the system keeps creating new public profiles with `PYP`, the product story and dashboard UI will drift immediately. New-profile defaults must therefore be changed as part of this phase.

### Legacy Data Confusion

If old `PYP` records are silently remapped to `MYP`, historical meaning is lost. Legacy records must remain `PYP`.

### Taxonomy Drift

If interest options are hardcoded separately in UI and API, prompt and delivery logic will diverge later. The taxonomy must live in one reusable helper module.

## Deliverables

This phase should land:

- a design doc in `docs/plans`
- an implementation plan in `docs/plans`
- a reusable programme/taxonomy helper module
- updated student preference model and stores
- updated public dashboard/profile route
- updated public homepage positioning
- automated tests that lock the new public-facing behavior

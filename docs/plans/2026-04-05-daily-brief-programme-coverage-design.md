# Daily Brief Programme Coverage Design

## Problem

`/admin/editorial/daily-briefs` currently only shows programmes that already have generated history records. The generation pipeline, in turn, only generates briefs for programmes that have `delivery-eligible` families. This couples three different concepts into one decision:

- audience coverage
- dispatch readiness
- editorial generation scope

The result is confusing operator behavior. If a cohort has active `MYP` or `DP` families but none of them currently have healthy delivery channels, those programmes disappear from `Daily Briefs` entirely. Operators cannot tell whether a programme was intentionally skipped, had no audience, or simply has delivery-readiness issues.

## Goal

Make programme coverage visible and honest:

- generation should be based on active audience coverage, not healthy delivery readiness
- dispatch should continue to depend on delivery readiness
- the `Daily Briefs` admin page should show why a programme is or is not present for today

## Recommended Approach

### 1. Decouple generation scope from dispatch readiness

Introduce a shared coverage helper that classifies families in three layers:

- `active audience` — families whose access state is `active` or `trial_active`
- `dispatchable audience` — active families with at least one healthy delivery channel
- `generated` — whether today already has a brief history record for that programme/cohort

`generateDailyBriefDrafts()` should use the active-audience layer to decide which programmes to generate for a cohort. Delivery routes remain unchanged and continue to use dispatchable/healthy channel logic.

This preserves cost-awareness while making editorial coverage truthful: if `MYP` has active families in `APAC`, it can have a brief even when today’s dispatchable audience is `0`.

### 2. Add a programme coverage summary to `Daily Briefs`

Add a compact admin summary for today that shows programme coverage per cohort. For each `programme x cohort`, surface:

- active family count
- dispatchable family count
- whether a brief exists for today
- a human-readable status label

Recommended status set:

- `Generated`
- `No active families`
- `No healthy delivery channel`
- `Awaiting generation`

This gives operators a clean answer to “why do I only see PYP?” without needing to inspect raw profiles or infer pipeline behavior.

## Why This Approach

This is the smallest change that fixes the business confusion without creating a second editorial mode or requiring schema changes.

- It improves operator visibility immediately.
- It keeps dispatch safety rules intact.
- It avoids generating briefs for programmes with literally no audience.
- It creates a clean future seam if we later want an `editorial-only / no live audience` mode.

## Non-Goals

This change does not:

- change dispatch readiness or delivery routing rules
- create new history record types
- force generation for programmes with zero active families
- implement `blocked by selection policy` as a separate coverage state yet

## Validation

We should prove:

- `generateDailyBriefDrafts()` generates for active families even when channels are not dispatchable
- programmes with no active families still do not generate
- the `Daily Briefs` page shows today’s programme coverage summary with accurate labels
- existing history list, filters, and ops summary continue to work

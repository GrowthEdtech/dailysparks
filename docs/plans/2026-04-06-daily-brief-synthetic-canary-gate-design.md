# Daily Brief Synthetic Canary Gate Design

## Goal

Add a pre-delivery gate for production Daily Brief waves so the platform verifies the real delivery chain before sending content to families.

## Why now

Recent production misses showed that the current reliability layer is still mostly reactive:

- detect after users do not receive content
- retry after the fact
- alert operations after a production miss already happened

We need to move one step earlier and block unsafe waves before they reach real users.

## Recommended approach

Introduce a `synthetic canary gate` inside production delivery.

For each `cohort / programme` production brief:

1. run a real synthetic canary delivery to configured canary recipients
2. if the first attempt fails, automatically retry once
3. if the retry still fails, hold the production wave
4. emit a critical ops alert
5. expose explicit release and rerun controls in admin

This is better than a detached monitor because:

- it validates the actual renderer + attachment + Goodnotes transport path
- it prevents unsafe production sends instead of only reporting them
- it gives operations a visible hold-and-release workflow

## Scope

### 1. Synthetic canary execution

For `production` briefs only:

- use the resolved renderer for that brief
- send with `attachmentMode: "canary"`
- target configured healthy canary recipients
- persist immutable canary evidence on the brief history record

### 2. Hold-and-release policy

If the canary attempt and one automatic retry both fail:

- mark the brief `syntheticCanary.status = "blocked"`
- skip official family delivery for that wave
- keep the brief visible in admin as blocked by canary
- emit a critical Daily Brief ops alert

### 3. Admin override workflow

Add an authenticated admin action route that supports:

- `rerun` — rerun the canary manually
- `release` — unblock the brief for production delivery with an explicit note

### 4. Admin visibility

Expose synthetic canary state in:

- Daily Brief detail page
- Daily Brief list badges / summaries

Operators should be able to see:

- current canary status
- recipients
- attempts / auto-retries
- latest failure reason
- release note and release actor

## Data model

Add `syntheticCanary` to `DailyBriefHistoryRecord` with:

- `status`
- `targetParentEmails`
- attempt / success / failure counters
- `autoRetryCount`
- timestamps for latest attempt, pass, block, release
- failure evidence
- delivery receipts and render audit snapshot

This becomes the single source of truth for canary gate evidence.

## Route design

Add:

- admin action route: `/api/admin/daily-brief-synthetic-canary-action`

Keep production gating inside the existing production deliver route so the canary decision is part of the real delivery workflow.

## Non-goals

This phase does not:

- create a separate canary history table
- replace the current production deliver route
- run canaries for `test` or `manual resend` flows
- automatically release blocked waves without ops input

## Success criteria

- every production brief is gated by a real synthetic canary before family delivery
- failed canaries hold the wave instead of silently missing users
- operators can see exactly why a wave is blocked
- operators can rerun or explicitly release a blocked brief from admin

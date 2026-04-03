# Delivery Readiness Hardening

Date: 2026-04-03

## Goal

Unify delivery readiness into a single executable model so the automation pipeline no longer treats every "connected" channel as equally sendable.

## Model

Channels now follow this progression:

1. `configured`
2. `verified`
3. `healthy`
4. `dispatchable`

Operationally:

- `dispatchable` means the channel is healthy enough for normal automated sends.
- `retryable` means the channel was previously verified, so a targeted recovery attempt is still allowed even if the latest status is currently failed.

## Business Rules

- Normal delivery waves only target `dispatchable` channels.
- Pending-target math only counts `dispatchable` channels.
- Retry delivery targets `retryable` channels, not every "connected" channel.
- Dispatch eligibility is now separate from broader delivery setup state.
- Briefs are no longer failed just because a programme temporarily has no healthy delivery channels; if active families still exist, the brief stays ready for later recovery.

## Key Files

- `src/lib/delivery-readiness.ts`
- `src/lib/daily-brief-stage-delivery.ts`
- `src/lib/daily-brief-delivery-progress.ts`
- `src/app/api/internal/daily-brief/deliver/route.ts`
- `src/app/api/internal/daily-brief/retry-delivery/route.ts`
- `src/lib/delivery-health-rollup.ts`

## Follow-up

This hardening improves delivery correctness, but it does not solve the broader global SLA gap by itself. If Daily Sparks needs to guarantee "09:00 local" worldwide, editorial generation must move earlier or become multi-batch rather than staying a single Hong Kong morning generation window.

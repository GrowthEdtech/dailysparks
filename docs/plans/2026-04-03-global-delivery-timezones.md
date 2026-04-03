# 2026-04-03 Global Delivery Timezones

## Objective

Evolve Daily Sparks from a Hong Kong-only dispatch model to a global delivery model where:

- parents choose a country/region in the product UI
- the system stores and schedules by IANA time zone
- operators can review locale-aware delivery preferences and delivery windows in admin
- staged delivery routes dispatch by due local delivery windows instead of one global 09:00 Hong Kong wave

## Scope

1. Profile schema and persistence
   - add `countryCode`
   - add `deliveryTimeZone`
   - add `preferredDeliveryLocalTime`
2. Parent dashboard
   - add a dedicated delivery timing card
   - auto-detect browser time zone
   - prefill country/time zone/time with sensible defaults
   - allow manual edits
3. Admin users
   - show country/region
   - show IANA time zone
   - show local delivery time
4. Staged delivery
   - select due recipients by local time zone window
   - stop treating the first successful delivery batch as globally complete
   - make deliver/retry safe for multi-time-zone batches
5. Daily Briefs and ops
   - show local delivery windows and locale-aware skipped states

## Product decisions

- UI entry point: `countryCode`
- scheduling source of truth: `deliveryTimeZone`
- default local delivery time: `09:00`
- supported scheduling granularity for now: `30-minute` slots
- if a brief becomes ready after a family's preferred local time has already passed, dispatch on the next available scheduler wave

## Delivery semantics

The existing one-wave `published` meaning is too coarse for global dispatch. A brief may have:

- already delivered families
- remaining future time-zone families
- retry-needed families

Implementation should therefore:

- keep briefs deliverable across multiple scheduler waves
- mark them `published` only once all eligible recipients for that programme and run date have been processed successfully
- keep retry-needed entries visible without blocking later time-zone waves

## Rollout order

1. schema, stores, APIs, and locale helpers
2. dashboard settings card
3. admin users locale display
4. delivery window selection, route changes, and scheduler script changes
5. Daily Briefs and ops summary locale-aware display

## Risks to watch

- brief state regression in staged delivery routes
- country/time zone defaults drifting between client and server
- current production scheduler jobs still assuming one Hong Kong delivery wave
- families without explicit locale settings requiring stable fallbacks

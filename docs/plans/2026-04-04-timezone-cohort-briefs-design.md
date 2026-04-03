# Timezone Cohort Briefs Design

## Goal

Upgrade Daily Sparks from a single global daily edition into a
`same-topic, multi-edition` model where each timezone cohort receives its own
brief edition while the editorial team still controls one global topic story
for the day.

## Decision

Daily Sparks will use three editorial cohorts:

- `APAC`
- `EMEA`
- `AMER`

Each cohort shares the same locked global topic for the business day, but each
cohort receives its own generated brief edition. This allows later cohorts to
benefit from later editorial generation windows without diverging into
completely different story choices.

## Core business rules

1. Daily topic selection remains global for the business day.
2. The first successful cohort generation wave locks the selected topic inside
   the candidate snapshot.
3. Later cohort generation waves reuse the locked topic rather than reselecting
   a new one.
4. Each cohort gets separate history records per programme.
5. Delivery routes may only dispatch a brief to profiles whose local timezone
   maps to the same editorial cohort as the brief.
6. Admin history, detail views, and manual test runs must show and preserve the
   cohort dimension.

## Cohort mapping

The system uses the family delivery timezone as the source of truth and maps it
into one of these editorial cohorts:

- `APAC`: UTC offsets `+07:00` through `+14:00`
- `EMEA`: UTC offsets `-01:00` through `+06:00`
- `AMER`: UTC offsets `-10:00` through `-02:00`

This is intentionally operational rather than political geography. The cohort
exists to decide which editorial production wave should create and deliver that
family's brief.

## Data model changes

### Candidate snapshot

Candidate snapshots gain a locked-topic artifact:

- `selectedTopic`
  - `clusterKey`
  - `headline`
  - `summary`
  - `sourceReferences`
  - `candidateCount`
  - `selectedAt`
  - `selectedByCohort`

This lets later cohort waves reuse the same topic without relying on exact feed
candidate matches.

### Daily brief history

Daily brief history gains:

- `editorialCohort`

This becomes part of the operational identity of a brief together with:

- `scheduledFor`
- `programme`
- `recordKind`

## Route behavior

### Ingest

- still refreshes the candidate snapshot for the business day
- must not overwrite a frozen snapshot or an already locked selected topic

### Generate

- accepts `editorialCohort`
- reuses a locked selected topic when available
- if no selected topic is locked yet, selects and locks one
- creates one draft per eligible programme inside that cohort
- idempotency is now per `scheduledFor + programme + editorialCohort + recordKind`

### Preflight

- accepts `editorialCohort`
- only advances briefs for that cohort

### Deliver / retry-delivery

- only match profiles whose derived cohort equals the brief cohort
- keep local delivery-window rules inside each cohort

### Manual admin test run

- defaults to a cohort derived from the target parent or accepts an override
- preserves `recordKind = test`

## Scheduler shape

The old early/backstop wave becomes explicit cohort production:

- `APAC` generation and preflight earlier
- `EMEA` generation and preflight in the middle of the business day
- `AMER` generation and preflight later

Rolling deliver and retry jobs continue, but now they operate on cohort-specific
briefs instead of a single edition.

## Admin / ops impact

- `Daily Briefs` list and detail views must show cohort badges
- filters should support cohort
- ops summary should aggregate by cohort where useful
- delivery receipts and follow-up views should preserve cohort context

## Non-goals for this slice

- different topics per cohort
- cohort-specific prompt policies
- cohort-specific source allowlists
- region-specific language variants

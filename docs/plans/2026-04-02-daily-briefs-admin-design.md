# Daily Briefs Admin Design

## Goal

Add a read-only `Daily Briefs` admin surface so operators can review what Daily Sparks has generated each day without pretending the generation pipeline already exists.

## Why This Matters

The current editorial admin covers:

- source whitelist and ingestion preferences
- AI connection registry and default model endpoint

What is still missing is the output layer: a place to review the generated daily briefs themselves. Without that layer, the admin can manage inputs and infrastructure, but cannot inspect results, trace source usage, or understand what the system actually produced.

## Recommended MVP

Ship a read-only `Daily Briefs` history tab with:

- a real persistence layer
- an empty state when no generation records exist
- a list page for history review
- a detail page for a single brief

Do not seed example data. Do not add approval or publishing controls yet.

## Information Architecture

The editorial admin should now have three tabs:

1. `Sources`
2. `AI Connections`
3. `Daily Briefs`

`Daily Briefs` should sit inside the same authenticated `/admin/editorial` shell and use a dedicated child route:

- `/admin/editorial/daily-briefs`
- `/admin/editorial/daily-briefs/[briefId]`

## Data Model

Each stored history record should include:

- `id`
- `scheduledFor`
- `headline`
- `summary`
- `programme`
- `status`
- `topicTags`
- `sourceReferences`
- `aiConnectionId`
- `aiConnectionName`
- `aiModel`
- `promptVersion`
- `repetitionRisk`
- `repetitionNotes`
- `adminNotes`
- `briefMarkdown`
- `createdAt`
- `updatedAt`

### Nested source reference shape

Each source reference should include:

- `sourceId`
- `sourceName`
- `sourceDomain`
- `articleTitle`
- `articleUrl`

## Storage Strategy

Follow the same backend switch already used by the rest of the app:

- local JSON for local development
- Firestore for production

Add a new history store with:

- `listDailyBriefHistory(filters?)`
- `getDailyBriefHistoryEntry(id)`
- `createDailyBriefHistoryEntry(input)`

The create helper is for future generation pipeline integration, even though this admin MVP remains read-only.

## List Page UX

The list page should show:

- top summary copy explaining that generated briefs will appear here once the generation pipeline writes records
- filter chips or links for:
  - all programmes
  - all statuses
- a compact history list showing:
  - scheduled date
  - headline
  - programme badge
  - status badge
  - source count
  - primary source
  - AI connection / model
  - repetition risk
  - link to detail page

When empty, the UI should clearly say:

- no daily briefs have been recorded yet
- this tab will populate when generation writes history entries
- future records will include source, model, and prompt traceability

## Detail Page UX

The detail page should show:

- headline
- summary
- programme and status
- scheduled date
- AI connection and model
- prompt version
- topic tags
- repetition notes
- admin notes
- source references with outgoing links
- full generated brief content

If the record does not exist, the route should use the Next.js not-found flow.

## What This MVP Explicitly Does Not Include

- seeded sample records
- approval or publish buttons
- regenerate actions
- inline editing
- audit logs
- analytics dashboards

## Testing Strategy

Add tests for:

- history store create/list/get behavior
- admin tabs include `Daily Briefs`
- daily-briefs list page empty state
- daily-briefs list page populated state
- daily-brief detail page render
- daily-brief detail page not-found behavior

## Success Criteria

This MVP is complete when:

- the admin shell shows `Daily Briefs` as a third tab
- `/admin/editorial/daily-briefs` renders a real empty state with no sample data
- history records can be created and queried via the new store
- `/admin/editorial/daily-briefs/[briefId]` renders a real detail page
- the full test suite, lint, and build all pass

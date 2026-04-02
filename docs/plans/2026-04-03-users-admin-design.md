# Users Admin Design

## Goal

Add a dedicated `Users` admin surface so operators can review parent account
status, registration timing, programme details, and billing readiness without
opening individual family-facing pages.

## Why This Matters

The current admin covers:

- editorial source policy
- AI connections
- prompt policy
- daily brief history

What is still missing is an operational view of who is actually in the system.
Support and operations need a fast way to answer questions like:

- when did this family register?
- is this family on trial, active, canceled, or free?
- which programme is the student in?
- is Goodnotes or Notion connected?
- is there a latest invoice on file?

Without this module, profile and billing state exists, but only behind
family-facing pages or raw storage.

## Recommended MVP

Ship a read-only `Users` tab with:

- a searchable user list
- status and programme filters
- billing and delivery summary badges
- a linked detail page per family

Do not add inline editing, subscription mutation, or auth-role management in
this MVP.

## Information Architecture

The editorial admin should become a broader operations workspace with five
tabs:

1. `Sources`
2. `AI Connections`
3. `Prompt Policy`
4. `Daily Briefs`
5. `Users`

Recommended routes:

- `/admin/editorial/users`
- `/admin/editorial/users/[parentId]`

This keeps the new module inside the existing password-protected admin shell and
reuses the current tab navigation.

## Read-Only Scope

This MVP should only expose information already stored in the profile and
billing domain:

- parent full name
- parent email
- registration timestamp
- subscription status
- subscription plan
- latest invoice summary
- student name
- programme and programme year
- Goodnotes connection state
- Notion connection state

No write controls should be shown yet. This avoids accidental changes to Stripe,
Goodnotes, or Notion-linked state.

## User Type Strategy

Do not introduce a new persistent `userType` column yet.

Instead, derive a display label from `subscriptionStatus`:

- `trial -> Trial family`
- `active -> Active family`
- `canceled -> Canceled family`
- `free -> Free family`

This gives operators the user-type language they need without adding a second
state source that could drift from billing truth.

## List Page UX

The list page should show:

- page intro explaining that this tab is the operations view of family accounts
- a small summary bar with total families and counts by subscription state
- filter pills for:
  - `All`
  - `Trial`
  - `Active`
  - `Canceled`
  - `Free`
- a user list with one card or row per family

Each list item should show:

- parent full name
- parent email
- registration date
- derived user type label
- billing badge:
  - plan cadence if available
  - invoice status if available
- student name
- programme
- delivery badges:
  - `Goodnotes ready`
  - `Notion ready`
- link to detail page

## Detail Page UX

The detail page should show:

- back link to `Users`
- parent identity block
- account status card
- student profile card
- billing snapshot card
- delivery readiness card

Recommended sections:

1. `Family overview`
2. `Student profile`
3. `Billing snapshot`
4. `Delivery channels`

This page should stay read-only and operationally useful.

## Data Model Changes

The current profile store only supports:

- fetch by email
- list eligible delivery profiles
- update flows

The new module needs a broad listing method:

- `listParentProfiles(): Promise<ParentProfile[]>`
- `getProfileByParentId(parentId: string): Promise<ParentProfile | null>`

These should be added to:

- `src/lib/profile-store.ts`
- `src/lib/local-profile-store.ts`
- `src/lib/firestore-profile-store.ts`
- `src/lib/mvp-store.ts`

## Sorting and Filtering

Default sort should be:

- newest registration first

The first release only needs server-side status filtering and optional search by
name or email on the page itself if inexpensive. If search adds too much scope,
ship status filtering only.

## Empty and Error States

If there are no stored profiles, the page should show an honest empty state like
`No families have registered yet`.

If a detail page requests a missing parent ID, it should return `notFound()`,
matching the existing daily brief detail behavior.

## Testing Strategy

Add tests for:

- profile store listing and lookup by parent ID
- admin tabs rendering the new `Users` entry
- users list page empty state
- users list page rendering key profile fields
- users detail page rendering billing and delivery state

## What This MVP Explicitly Does Not Include

- editing subscription state
- editing programme or student details
- deleting users
- impersonation or login-as-user
- export CSV
- advanced analytics

## Success Criteria

This module is successful when an operator can open `/admin/editorial/users` and
immediately answer:

- who registered recently?
- which families are active vs trial?
- which programme each student belongs to?
- whether Goodnotes or Notion is connected?
- whether the family has invoice/payment information on file?

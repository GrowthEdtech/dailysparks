# Editorial Admin MVP Design

## Goal

Add a lightweight internal admin surface so Daily Sparks can register and manage editorial source channels without requiring a code deploy for every whitelist change.

## Why This Matters

The new editorial policy foundation defines:

- source whitelist v1
- programme-aware source fit
- repetition-control rules

That foundation is useful, but still static. As soon as the team needs to:

- pause a source
- add a new publication
- adjust programme fit
- change which sections are harvested

the product needs an internal management surface.

## Product Decision

The first admin release should not be a full CMS.

It should focus on the single highest-value module:

- `Source Registry`

This page will let an authorized admin:

- view the current source registry
- add a new source
- edit source metadata
- toggle a source active or inactive
- manage source roles, programme fit, and target sections

## Scope

### Included In This MVP

- admin-only route for editorial source management
- admin gate using configured email allowlist
- persistent source registry store
- source create and update APIs
- seeded registry based on editorial whitelist v1
- editable metadata:
  - source name
  - domain
  - homepage
  - source roles
  - usage tiers
  - recommended programmes
  - sections / channels
  - ingestion mode
  - active state
  - notes

### Not Included Yet

- article candidate queue
- topic clustering review UI
- prompt template editor
- repetition monitor dashboard
- delete operations
- multi-user roles

## Access Model

Use a simple internal access model:

- authenticated user must be logged in
- authenticated user email must appear in `DAILY_SPARKS_ADMIN_EMAILS`

This keeps the MVP simple and avoids building role management too early.

## Storage Model

The source registry should follow the current project storage philosophy:

- local JSON when running in local backend mode
- Firestore when the app uses the Firestore backend

This keeps the admin data aligned with the existing profile-store setup and avoids inventing a third persistence model.

## Seed Model

The registry should bootstrap from `editorial-policy.ts`.

On first read:

- if no admin-managed records exist, seed the registry from the source whitelist v1
- derive recommended programme arrays from the programme selector helpers
- mark seeded records so future code can distinguish policy defaults from admin-managed records

## Data Shape

Each editorial source record should include:

- `id`
- `name`
- `domain`
- `homepage`
- `roles`
- `usageTiers`
- `recommendedProgrammes`
- `sections`
- `ingestionMode`
- `active`
- `notes`
- `seededFromPolicy`
- `createdAt`
- `updatedAt`

## UI Shape

### Route

- `/admin/editorial`

### Layout

The page should feel like an internal operations view rather than a marketing surface.

Top section:

- title
- short explanation of what the registry controls
- policy badges for whitelist size and repetition windows

Middle section:

- create-source card

Main section:

- existing source cards
- each card shows the source state and an editable form

## API Shape

Use an admin-only API route:

- `GET /api/admin/editorial-sources`
- `POST /api/admin/editorial-sources`
- `PUT /api/admin/editorial-sources`

The route should validate:

- required strings
- allowed roles
- allowed usage tiers
- allowed programmes

## Testing Strategy

Automated coverage should verify:

- admin allowlist logic
- source store seeding in local mode
- source create and update behavior
- admin API authorization and validation
- admin page route access control at least through server-side behavior or route tests

## Delivery Notes

This MVP is meant to unlock editorial operations, not replace future ingestion tooling.

Once this lands, the next natural step is:

- candidate ingestion queue
- repetition monitor
- prompt policy editor

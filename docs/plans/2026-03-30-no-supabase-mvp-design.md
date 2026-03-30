# No-Supabase MVP Design

## Goal

Convert the current UI-only prototype into a working MVP that does not depend on Supabase. The app should support a simple email-based login flow, persist one parent's profile and student preferences locally, and let the dashboard read and update real data.

## Product Scope

This MVP is intentionally narrow:

- No third-party auth providers
- No passwords
- No database server
- No multi-tenant admin features
- No billing integration

The supported flow is:

1. A parent enters their email on `/login`
2. The app creates or reuses a local parent profile
3. The app stores a session cookie
4. `/dashboard` loads the active profile from local storage
5. The parent updates subjects and delivery preferences
6. The app saves those preferences back to local storage

## Architecture

The app will use three layers:

- A file-backed data layer that reads and writes a JSON file on disk
- Route Handlers that validate input, manage session cookies, and update profile data
- App Router pages that render authenticated state on the server and submit mutations from the client

This keeps the MVP simple while preserving a clean seam for a future move to SQLite, Postgres, Auth.js, or another auth provider.

## Data Model

The local store will keep a small JSON document shaped like:

- `parents[]`
- `students[]`

Each parent record will include:

- `id`
- `email`
- `fullName`
- `subscriptionStatus`
- `createdAt`
- `updatedAt`

Each student record will include:

- `id`
- `parentId`
- `studentName`
- `curriculumLevel`
- `ibSubjects`
- `goodnotesEmail`
- `notionConnected`
- `createdAt`
- `updatedAt`

The initial implementation will auto-create a default student profile when a new parent logs in.

## Session Strategy

Session management will use a secure-ish MVP cookie:

- Cookie name: `daily-sparks-session`
- Cookie value: parent email
- Cookie flags: `httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` only in production

This is not production-grade authentication, but it is appropriate for a local demo and gives us a straightforward upgrade path later.

## Route Design

The app will expose these endpoints:

- `POST /api/login`
  - validates email and optional parent/student names
  - creates or reuses the parent record
  - ensures a default student exists
  - sets the session cookie
- `GET /api/profile`
  - returns the active parent and student from the session cookie
- `PUT /api/profile`
  - updates the active student's IB subjects and delivery settings
- `POST /api/logout`
  - clears the session cookie

## Page Behavior

### `/login`

- Replace fake Google/Apple buttons with a real email-based login form
- Capture email, parent name, and student name
- Submit to `POST /api/login`
- Redirect to `/dashboard` on success
- Show inline validation and loading states

### `/dashboard`

- Read the session on the server
- Redirect unauthenticated users to `/login`
- Hydrate the client form with stored profile data
- Save changes through `PUT /api/profile`
- Provide a logout action

### `/`

- Keep the landing page, but update CTAs so the MVP flow is reachable

## Validation and Error Handling

Validation rules for the MVP:

- parent email must be present and valid
- student name must be non-empty on first login
- GoodNotes email is optional, but if present must be a valid email
- at least one IB subject must remain selected before save

Errors will be returned as JSON from Route Handlers and surfaced as friendly inline messages in the UI.

## Testing Strategy

The MVP will add a lightweight automated test setup focused on business logic:

- store creation and update behavior
- login route validation and session creation
- profile update validation

UI polish and end-to-end behavior will be verified with lint/build plus manual browser checks in this round.

## Future Upgrade Path

When the MVP is validated, the following pieces can be swapped independently:

- file store -> SQLite/Postgres
- cookie-by-email session -> Auth.js or hosted auth
- local profile loading -> real multi-user authorization

Because the data access and session logic will live in `src/lib`, the page components will not need a large rewrite.

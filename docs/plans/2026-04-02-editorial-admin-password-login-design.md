# Editorial Admin Password Login Design

## Goal

Replace the current Google-session-based editorial admin access model with a dedicated password login flow for `/admin/*`, while keeping the parent-facing login and dashboard unchanged.

## Problem

The current editorial admin route depends on:

- a valid parent Google / Firebase session
- an approved email in `DAILY_SPARKS_ADMIN_EMAILS`

That model creates unnecessary friction for internal admin use:

- the admin must first complete parent registration
- admin access is tied to the family workflow identity model
- `/admin/editorial` redirects to `/login`, which is designed for parents instead of operators

The user requirement is simpler:

- admins should not need registration
- admins should be able to enter a password and access the editorial backend directly

## Product Decision

Use a separate admin-only password login flow.

Keep the existing parent auth model exactly as-is for:

- `/login`
- `/dashboard`
- billing
- profile and delivery APIs

Add a new editorial-admin auth chain only for:

- `/admin/login`
- `/admin/editorial`
- `/api/admin/*`

## Recommended Approach

### 1. Separate admin auth from parent auth

Do not reuse the Firebase session cookie for editorial admin.

Instead:

- create a dedicated admin session cookie
- scope it to the editorial admin experience
- validate it independently of parent login

This avoids coupling the internal tooling to the parent-facing identity system.

### 2. Password-only login

The admin login form should ask for only one field:

- password

No registration, no Google popup, no account creation.

### 3. Stateless signed admin session

Use an HMAC-signed cookie payload with:

- role marker
- issued-at timestamp
- expiry timestamp

The cookie should be:

- `httpOnly`
- `sameSite=lax`
- `secure` in production

This keeps the flow lightweight and avoids introducing a database-backed admin user store.

## Environment Variables

Add two admin-specific secrets:

- `DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD`
- `DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET`

Notes:

- both values must live in environment / deployment secrets
- neither value should ever be hardcoded
- the session secret should be a long random string independent of the password

## Route Changes

### New routes

- `GET /admin/login`
- `POST /api/admin/login`
- `POST /api/admin/logout`

### Updated routes

- `/admin/editorial`
  - requires the admin session cookie
  - redirects unauthenticated users to `/admin/login`

- `/api/admin/editorial-sources`
  - requires the admin session cookie
  - no longer depends on parent session email

## UI Changes

### Admin login page

The page should feel operational and minimal:

- title
- short internal-use explanation
- one password field
- one sign-in button
- concise error state

### Dashboard

Remove the editorial-admin badge / link from the parent dashboard.

Reason:

- the parent dashboard is not the right mental model for admin entry
- admin access should be direct through `/admin/login`
- this avoids confusing parents with an internal tool affordance

## Security Notes

- use constant-time password comparison
- return generic invalid-credentials messaging
- clear invalid admin cookies on unauthorized admin API access
- keep admin logout separate from parent logout
- do not reuse Firebase client logout behavior for admin logout

## Testing Strategy

Automated coverage should verify:

- admin password config validation
- admin session cookie creation and verification
- admin login route success and failure cases
- admin logout clears the admin cookie
- admin API rejects requests without the admin cookie
- admin API accepts requests with a valid admin cookie
- `/admin/editorial` redirects to `/admin/login` when admin auth is missing

## Out of Scope

- multiple admin accounts
- username + password support
- password reset flow
- role matrix or per-admin audit trail
- replacing parent auth with password auth

## Delivery Notes

This design intentionally solves the smallest real problem:

- make editorial administration reachable without registration
- avoid breaking the parent dashboard
- keep the implementation auditable and easy to operate

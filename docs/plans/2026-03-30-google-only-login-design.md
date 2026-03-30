# Google-Only Login Design

## Goal

Replace the current email-and-child-name login form with a Google-only sign-in flow that feels simpler for parents while preserving the existing Daily Sparks dashboard and Firestore-backed profile model.

## Why This Change

The current `/login` flow still feels like an internal MVP:

- parents type an email manually
- parents type setup details before they see value
- the login route creates a session using a plain email cookie

For a production-facing experience, Google sign-in is a better fit:

- less friction at login
- more trustworthy account identity
- simpler re-entry for returning parents

## Product Decision

`/login` should only show a Google login action.

If the parent signs in for the first time and Daily Sparks does not yet have a real child name, the app should not block them on the login page. Instead:

- complete the Google sign-in
- create or load the parent profile
- redirect to `/dashboard`
- show a short onboarding prompt near the top of the dashboard asking for the child name

This keeps login clean while still collecting the minimum data the product needs.

## Scope

This change covers:

- Google-only login UI on `/login`
- Firebase Web Auth in the browser
- server-side verification of Firebase ID tokens
- creation of a secure server session cookie
- redirect protection for `/login`, `/dashboard`, and `/api/profile`
- dashboard onboarding to collect a missing child name
- local and production deployment updates required by the new auth flow

This change does not cover:

- Apple login
- password login
- Firebase client-side direct Firestore access
- subscription checkout

## Architecture

The login flow will use Firebase in two layers:

### Browser layer

- initialize Firebase Web SDK in a client-only helper
- use `GoogleAuthProvider` with `signInWithPopup()`
- fetch a Firebase ID token from the signed-in user
- send the ID token to the existing `/api/login` route

### Server layer

- verify the ID token with `firebase-admin`
- create a Firebase session cookie
- store that session cookie in the existing `daily-sparks-session` cookie slot
- use the decoded token email and display name to create or load the parent profile

The app should continue using Daily Sparks server sessions as the source of truth for pages and APIs.

## Session Model

The current cookie stores a raw email string. That is too weak for production Google login.

The cookie should now store a Firebase session cookie instead. Server code should:

- parse the cookie
- verify it with Firebase Admin Auth
- extract `email`, `uid`, and optional name from the decoded session

This allows the current App Router pages and route handlers to keep a cookie-based model while upgrading the security of the session itself.

## Dashboard Onboarding

When a profile has no meaningful child name yet, the dashboard should show a compact onboarding card above the main settings:

- headline explaining that one last setup detail is needed
- child name field
- save action using the existing profile update route

The header should avoid awkward fallback wording like `Student's reading profile`. If the name is incomplete, it should use a neutral label such as `Your child`.

## Error Handling

The login page should handle these cases clearly:

- popup blocked or cancelled
- Firebase config missing
- Google login succeeds but backend token exchange fails
- session invalid or expired on protected routes

Protected APIs should continue clearing the cookie when a session is invalid.

## Testing Strategy

Because real Google OAuth requires interactive browser approval, automated verification should focus on the parts we can fully control:

- route tests for token exchange and session cookie creation
- route tests for profile reads and updates with a verified session
- dashboard onboarding save behavior in route/store tests
- lint and production build

Manual smoke verification should confirm:

- `/login` renders the Google-only CTA
- a successful sign-in can reach `/dashboard`
- first-time profiles can save a child name

## Deployment Notes

Production requires the Firebase Auth project to support the app domain.

At minimum:

- Google provider must be enabled in Firebase Authentication
- `dailysparks.geledtech.com` must be added as an authorized domain
- `localhost` should remain authorized for development

## Success Criteria

- `/login` only offers Google sign-in
- the server no longer trusts a raw email cookie
- authenticated users reach `/dashboard` through a verified Firebase session
- first-time users can finish child-name setup in the dashboard
- tests, lint, build, and production deployment all succeed

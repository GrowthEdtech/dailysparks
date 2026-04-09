# Login Transition Speed Design

## Goal

Reduce the perceived wait on the parent login screen by moving successful sign-ins onto a lightweight handoff screen before the heavier dashboard render begins.

## Problem

The login screen currently keeps the user on the same card while the app completes:

- Google popup sign-in
- `/api/login` server session creation
- navigation into a dashboard route that immediately loads profile, brief, notebook, and recap data

Even when the backend is healthy, that makes the login card feel slower than it is.

## Recommended approach

Add a lightweight `/opening-dashboard` transition page and change successful login navigation to go there first.

### Why this is the best fit

- It improves perceived speed without rewriting the dashboard data layer.
- It keeps the login flow emotionally clear: sign-in succeeded, dashboard is opening.
- It is low-risk because it does not change the existing authenticated dashboard logic.

## UX behavior

1. Parent clicks `Continue with Google`
2. Google sign-in completes and `/api/login` returns a valid session cookie
3. Client immediately navigates to `/opening-dashboard`
4. Transition page confirms sign-in success and redirects to `/dashboard`

## Technical notes

- `/opening-dashboard` should be `noindex`
- The page should require an existing session and redirect back to `/login` if missing
- The login form should no longer wait on client Firebase sign-out before navigating

## Validation

- Add a page test for the new transition route
- Confirm unauthenticated access redirects to `/login`
- Confirm authenticated access renders the lightweight handoff screen

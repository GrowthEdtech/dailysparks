# Firestore Store Design

## Goal

Move Daily Sparks from a file-backed local JSON store to a Firestore-ready persistence layer without forcing a rewrite of the current login, dashboard, or route handler flow.

## Why This Change

The current MVP data model is already close to a document-store shape:

- one parent profile
- one or more student profiles
- lightweight preference fields
- simple subscription state

That makes Firestore a better next step than adding a relational database right now. It gives the product a real multi-user persistence layer while keeping the current App Router and cookie-based login flow intact.

## Scope

This migration covers:

- replacing the current file-only store implementation with a repository layer
- adding a Firestore-backed repository for parent and student records
- preserving the existing route contract used by `/api/login` and `/api/profile`
- keeping a local JSON fallback when Firestore is not configured
- documenting the required environment variables

This migration does not cover:

- Firebase Auth
- Stripe or billing webhooks
- Firestore security rules for client-side direct access
- a subscription purchase UI

## Architecture

The app will move from a single `mvp-store.ts` implementation to a small repository abstraction:

- `profile-store.ts` exposes the current app operations
- `local-profile-store.ts` keeps the existing JSON-backed implementation
- `firestore-profile-store.ts` adds a server-only Firestore implementation
- `firebase-admin.ts` initializes Firestore lazily from environment variables

The route handlers and pages should continue calling the same top-level functions:

- `getProfileByEmail`
- `getOrCreateParentProfile`
- `updateStudentPreferences`

That keeps the app stable while letting the storage backend change underneath.

## Firestore Data Shape

### `parents/{parentId}`

- `email`
- `fullName`
- `subscriptionStatus`
- `createdAt`
- `updatedAt`

### `students/{studentId}`

- `parentId`
- `studentName`
- `programme`
- `programmeYear`
- `goodnotesEmail`
- `notionConnected`
- `createdAt`
- `updatedAt`

This separate `parents` and `students` structure matches the current code and leaves room for multiple children per parent later.

## Configuration Strategy

Firestore should only activate when the backend is explicitly enabled. Otherwise the app should stay fully usable with the existing local JSON store.

Recommended variables:

- `DAILY_SPARKS_STORE_BACKEND=firestore`
- `FIREBASE_PROJECT_ID`

This gives us a safe default:

- local development works immediately
- preview or production can opt into Firestore
- build and tests stay deterministic without external services

Authentication should use Google Application Default Credentials instead of downloaded service account keys during local development.

## Error Handling

If Firestore is not configured, the app should not fail. It should transparently use the local JSON store.

If Firestore is configured incorrectly, initialization should fail loudly on the server so the deployment problem is visible.

## Testing Strategy

We will keep the current route and store tests green while adding focused tests for:

- storage backend selection
- Firestore backend selection
- no regression in the current profile mutation flow

Because this workspace does not have a Firestore emulator configured, tests should not depend on a live Firestore instance.

## Success Criteria

- The current login and dashboard flow still works
- Existing tests still pass
- New code supports Firestore persistence when env vars are configured
- The app still builds when Firestore is not configured

# Billing UI and Data Flow Design

## Goal

Add a real billing surface to the logged-in parent experience so Daily Sparks no longer feels like it is missing a subscription step after setup.

## Product Decision

This iteration should ship a complete billing interface and persisted billing selection flow, but not a real payment processor.

That means:

- parents can open a dedicated billing page
- parents can choose `Monthly` or `Yearly`
- the choice is saved to the parent profile
- dashboard surfaces the current billing state and links into billing

This iteration should not pretend a real charge happened. A parent can select a plan cadence, while the account can still remain in `trial` until real checkout is integrated.

## UX Structure

### Dashboard

The top summary card should stop saying `Local MVP Workspace`.

Instead it should show:

- current billing status
- selected billing cadence, if any
- a `Manage billing` action
- logout action

This places billing in the exact place parents expect to find it after login.

### Billing page

Create `/billing` as a logged-in page with:

- current status summary
- two pricing cards: `Monthly` and `Yearly`
- one primary action per card to save the cadence
- a note that live payment checkout will be connected next

For now we can use the existing marketing anchor of `$15 / month` and derive a yearly option as a discounted annual commitment.

## Data Model

Add a `subscriptionPlan` field to the parent record:

- `monthly`
- `yearly`
- `null`

The existing `subscriptionStatus` field remains the source of truth for status:

- `free`
- `trial`
- `active`
- `canceled`

Selecting a plan updates `subscriptionPlan` and keeps the current `subscriptionStatus` unless a future payment integration changes it.

## API

Add a dedicated `/api/billing` route for authenticated updates.

The route should:

- require a valid session
- accept a valid plan selection
- persist the plan to the parent profile
- return the updated full profile

Keeping billing separate from `/api/profile` avoids mixing curriculum preferences with billing actions.

## Testing Strategy

Automated checks should cover:

- new parent records normalize `subscriptionPlan`
- billing plan updates persist in the store
- `/api/billing` rejects invalid plan values
- `/api/billing` updates an authenticated parent profile

Manual smoke should confirm:

- dashboard shows a billing entry
- `/billing` loads for logged-in users
- selecting monthly or yearly updates the dashboard summary after returning

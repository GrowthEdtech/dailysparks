# D2C Marketing Phase 2 Design

## Goal

Ship the second layer of the Daily Sparks D2C marketing system so the product can:

- turn activated families into lightweight referrers
- measure referral activity and downstream trial activation
- give the team an internal marketing reporting view instead of relying on scattered evidence
- keep the existing GA4 instrumentation ready for production once a real measurement id is available

## Context

Phase 1 established:

- public SEO pages and CTA split
- starter-kit lead capture
- marketing event helpers
- onboarding activation lifecycle email

The codebase now has the right primitives, but the funnel still stops at lead capture and activation reminders. There is no referral loop, and there is no internal reporting surface that ties together leads, activation milestones, and later referral behavior.

We also confirmed that production currently does not expose `NEXT_PUBLIC_GA_MEASUREMENT_ID`, and no reusable value exists in repository config or current Cloud Run env. The implementation should therefore keep GA wiring intact and deployment-safe, while leaving the final production env value as a single follow-up configuration input.

## Non-goals

- complex multi-tier rewards or affiliate payouts
- revops-grade CRM orchestration
- paid activation or subscription attribution beyond a first lightweight hook
- replacing the existing users dashboard

## Approach Options

### Option 1: Referral-first, reporting later

Add invite sending now, then build reporting after usage starts.

Pros:

- fastest path to a visible new feature

Cons:

- weak observability
- hard to judge whether the new loop actually helps

### Option 2: Reporting-first, referral later

Build a marketing dashboard on top of existing leads and activation milestones before adding referral.

Pros:

- immediate visibility into the current funnel

Cons:

- no new growth loop for users
- Phase 2 feels incomplete

### Option 3: Recommended

Ship a narrow referral loop and a matching marketing dashboard in the same phase.

Pros:

- new user-facing growth loop and internal measurement arrive together
- reuses existing lead store, growth milestones, and admin visual system
- low enough scope to ship safely without introducing a separate marketing stack

Cons:

- more moving parts than a single-page dashboard

## Recommended Design

### 1. Referral loop v1

Add a dedicated referral invite store rather than overloading parent profile records. Each invite stores:

- referrer parent id and email
- invitee email and optional name
- share token
- invite status
- email delivery evidence
- lifecycle timestamps such as sent, starter-kit accepted, and trial started

The first channel is email only. A logged-in parent can send a referral invite from the dashboard after they have reached a meaningful value moment. This keeps the trigger aligned with the product:

- first brief delivered
- saved notebook activity
- weekly recap activity

The referral email sends the friend to the public starter-kit page with the referral token in the URL.

### 2. Referral lifecycle semantics

The referral lifecycle should stay deliberately lightweight:

- `sent`: invite was stored and email attempted successfully
- `accepted`: the invited parent submitted the starter-kit form with a valid referral token
- `trial_started`: a parent account later logged in with the same invited email

This is enough to answer whether referrals are moving people into the top and middle of the funnel without adding billing or reward complexity yet.

### 3. Dashboard referral entrypoint

Add a compact referral card to the parent dashboard. It should:

- appear only when the parent has crossed a value threshold
- explain the program in calm parent language
- allow sending one email invite at a time
- show recent invites and their current status

To avoid undoing recent dashboard performance wins, referral data should load from a dedicated authenticated API route rather than be folded back into the main server-side dashboard payload.

### 4. Marketing reporting dashboard

Add a new internal admin page under the editorial admin shell. It should summarize:

- total starter-kit leads
- delivered starter kits
- trial-started families
- first brief delivered counts
- first notebook save counts
- weekly recap activity counts
- referral invites sent
- referral accepts
- referral trial starts

This page should also show a recent-activity table for:

- latest leads
- latest referral invites

The reporting view should reuse the same metric-card and section-header language already established in the admin dashboard.

### 5. Event model

Extend the client-side event helper usage and server-side lifecycle hooks to support:

- `referral_prompt_viewed`
- `referral_invite_sent`
- `starter_kit_submitted`
- `starter_kit_referred_submitted`
- `trial_started`

The key principle is still decision-oriented tracking rather than exhaustive tracking. These events should answer:

- are parents seeing the referral entrypoint
- are they sending invites
- are invitees converting into leads and trials

### 6. GA configuration

The app code should continue to load GA only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is present. Production deployment scripts already preserve this value if configured, but the actual production id is still missing. This phase should not block on that missing value; instead it should leave the system ready so that adding the real `G-...` id later immediately activates reporting to GA4.

## Data Flow

1. Parent reaches a referral-eligible state in dashboard.
2. Parent sends an invite through `/api/referrals`.
3. Referral store records the invite and sends a referral email.
4. Invitee lands on `/ib-parent-starter-kit?ref=<token>`.
5. Starter-kit capture route validates the token and marks the invite as accepted.
6. If the invitee later signs in with Google using the same email, login route marks the referral as `trial_started`.
7. Admin marketing page aggregates lead store, referral store, and activation milestone evidence into one reporting view.

## Error Handling

- Invalid invite emails should fail fast with a friendly message.
- Invite send failures should still persist evidence when appropriate and show the parent a clear retry path.
- Invalid or expired referral tokens on the starter-kit page should not break lead capture; they should simply fall back to a normal starter-kit submission.
- Reporting page failures should degrade into empty-state messaging instead of blocking the rest of admin.

## Testing Strategy

- unit tests for referral store normalization and lifecycle transitions
- route tests for invite send, starter-kit referral acceptance, and trial-start transition on login
- dashboard component tests for referral card visibility and success/error states
- admin page tests for metric rendering and recent-activity sections

## Rollout Notes

- ship referral loop without reward credit first
- keep reporting internal only
- after this phase ships, the next natural extension is either reward logic or richer cohort reporting

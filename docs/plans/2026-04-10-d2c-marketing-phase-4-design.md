# D2C Marketing Phase 4 Design

## Goal

Ship the next Daily Sparks D2C marketing layer so the system can:

- attribute trial and paid movement to a practical acquisition source
- show a clearer admin funnel from lead capture to paid activation
- follow up with trial families after the first brief, not just before trial expiry
- keep the whole lifecycle inside the current app, scheduler, and transactional email stack

## Context

Daily Sparks already has:

- public SEO and starter-kit capture pages
- lead delivery and lead nurture
- referral invites and referral lifecycle tracking
- a GA4-ready event layer
- an internal marketing dashboard

The missing pieces are:

1. attribution that tells us where activated parents came from
2. a paid step in the marketing funnel
3. a lifecycle sequence between `first brief delivered` and `paid activated`

Without those pieces, marketing is measurable at the top of the funnel but still weak in the trial-to-paid segment.

## Non-goals

- multi-touch attribution
- ad platform ingestion
- CRM sync
- coupon or referral reward economics
- replacing the existing users admin dashboard

## Options

### Option 1: Full attribution model first

Persist UTM and source state directly onto parent records at login so every later conversion has a first-touch source attached.

Pros:

- clean long-term reporting model

Cons:

- larger scope
- needs new profile persistence behavior and migration care

### Option 2: Trial-to-paid nurture only

Skip attribution for now and focus only on new lifecycle emails.

Pros:

- fastest path to a visible conversion feature

Cons:

- weak measurement
- hard to tell whether nurture helps

### Option 3: Recommended

Add a practical attribution layer inside reporting, then pair it with a trial-conversion nurture sequence.

Pros:

- improves measurement and lifecycle conversion together
- reuses current lead, referral, profile, notebook, and recap data
- avoids a risky schema expansion for attribution itself

Cons:

- attribution is heuristic rather than a full first-touch model

## Recommendation

Choose **Option 3**.

Daily Sparks already stores enough evidence to answer the most important near-term question:

`Did a paying parent come from a starter-kit capture, a referral invite, or direct signup?`

That can be answered safely in reporting today, while the nurture layer moves trial families toward paid activation.

## Proposed Design

### 1. Practical acquisition attribution

Add attribution logic to the reporting layer rather than parent persistence.

For each parent profile:

- classify as `referral` if a referral invite exists for the same parent id or email
- else classify as `starter-kit` if a starter-kit lead exists for the same email
- else classify as `direct`

This keeps the model simple and good enough for internal decision-making.

The attribution breakdown should support:

- total profiles by source
- trial-started profiles by source
- first-brief-delivered profiles by source
- paid-activated profiles by source

### 2. Expanded marketing funnel reporting

Extend the admin marketing dashboard with:

- attribution source cards
- a cleaner trial lifecycle summary
- a paid activation count
- a recent trial lifecycle section

The funnel should explicitly show:

1. leads
2. trial started
3. first brief delivered
4. paid activated

This gives the team a tighter D2C view without replacing the broader users admin surface.

### 3. Trial conversion nurture policy

Add a new lifecycle policy specifically for families in an active trial who have already reached first value.

Eligibility:

- subscription status is still `trial`
- `firstBriefDeliveredAt` exists
- `firstPaidAt` does not exist

Recommended stages:

1. `24h` after first brief delivered
2. `96h` after first brief delivered

This keeps the sequence distinct from:

- onboarding reminders, which focus on setup completion
- trial-ending reminders, which focus on urgency close to expiry

### 4. Trial conversion nurture content

Create a dedicated email builder that reinforces value already unlocked.

The sequence should:

- speak in calm parent language
- reference the student's programme
- point back to the dashboard and billing
- remind the parent what the first brief, notebook, and weekly recap are building

Personalization inputs:

- programme (`MYP` or `DP`)
- notebook entry count for the parent
- weekly recap count for the parent

### 5. State management

Persist trial conversion nurture state on the parent record using the existing notification-email-state update path.

Add optional fields:

- `trialConversionNurtureCount`
- `trialConversionNurtureLastAttemptAt`
- `trialConversionNurtureLastSentAt`
- `trialConversionNurtureLastStage`
- `trialConversionNurtureLastStatus`
- `trialConversionNurtureLastMessageId`
- `trialConversionNurtureLastError`

This keeps storage local to the parent lifecycle and avoids inventing a separate store for a two-stage sequence.

### 6. Internal scheduler route

Add:

- `/api/internal/marketing/trial-conversion/run`

It should:

- use the same scheduler-secret pattern as existing internal routes
- iterate over parent profiles
- assess whether each profile is due
- send the correct stage email
- record success or failure back to parent state
- return a structured summary for ops

### 7. Scheduler integration

Add the new route to `scripts/configure-daily-brief-scheduler.sh`.

Daily cadence is enough because the assessment logic already determines whether a family is due for stage 1 or stage 2.

## Data Flow

1. Parent starts a trial and reaches `first brief delivered`.
2. Marketing reporting classifies that parent by practical acquisition source.
3. Scheduler calls `/api/internal/marketing/trial-conversion/run`.
4. Eligible trial families receive stage-based value reinforcement emails.
5. Parent-level nurture state updates after each attempt.
6. Billing activation later updates `firstPaidAt`.
7. Admin marketing dashboard shows attribution, trial movement, and paid activation counts in one place.

## Error Handling

- Missing scheduler auth should return `401` or `503` consistently with existing internal routes.
- Email delivery failures should count as failures, not skips.
- Already-paid or non-trial families should be skipped cleanly.
- Missing notebook or recap activity should degrade to zero-value personalization, not an error.

## Testing

Required coverage:

- attribution classification in reporting
- paid activation counts in reporting
- admin marketing dashboard rendering for new attribution and funnel sections
- trial-conversion nurture eligibility rules
- trial-conversion nurture email copy
- internal scheduler route auth, success, skip, and failure behavior

## Rollout Notes

- keep attribution internal-only for now
- do not block on a deeper UTM persistence project
- ship trial-conversion nurture before experimenting with discounts or incentives

# D2C Marketing Phase 3 Design

## Goal

Ship the next Daily Sparks D2C lifecycle layer so the product can:

- follow up with starter-kit leads who still have not begun a trial
- move more captured parent emails into real trial starts
- give the team clear nurture evidence inside the admin marketing view

This phase deliberately avoids broader CRM complexity. It keeps the work inside the existing app, transactional email system, and scheduler infrastructure.

## Current State

The public funnel now has:

- landing and SEO guides
- starter-kit lead capture
- starter-kit email delivery
- referral invites
- dashboard referral prompt
- internal marketing reporting

The missing link is what happens after the first starter-kit email. If a parent captures the lead but does not start the trial, Daily Sparks currently stops speaking to them.

## Options

### Option 1: Manual follow-up only

Rely on admin review and one-off outreach.

Pros:
- minimal engineering

Cons:
- no scalable lifecycle
- no repeatable ops evidence

### Option 2: External lifecycle tool first

Push leads into a dedicated marketing automation platform and manage follow-up there.

Pros:
- long-term flexibility

Cons:
- adds tool and sync complexity before the in-app lifecycle model is stable

### Option 3: In-app starter-kit nurture sequence

Extend the current marketing lead model with nurture state, send a small stage-based email sequence from an internal scheduler route, and surface the results in admin.

Pros:
- reuses current delivery and scheduler stack
- keeps data close to the product
- fastest path to a measurable conversion lift

Cons:
- narrower than a full CRM

## Recommendation

Choose **Option 3**.

Daily Sparks already has the primitives to make this work:

- a lead store
- transactional notification email rendering
- internal scheduler auth
- admin reporting surfaces

So the most efficient next step is not another acquisition feature. It is a conversion layer between lead capture and trial start.

## Proposed Design

### 1. Lead nurture state

Extend `MarketingLeadRecord` with lifecycle fields:

- `nurtureEmailCount`
- `nurtureLastAttemptAt`
- `nurtureLastSentAt`
- `nurtureLastStage`
- `nurtureLastStatus`
- `nurtureLastMessageId`
- `nurtureLastError`

This gives the system enough memory to:

- decide whether a lead is due
- avoid repeating the same stage
- show recent nurture evidence in admin

### 2. Starter-kit nurture policy

Introduce a small assessment layer that decides whether a lead is due for follow-up.

The lead is **not due** when:

- a matching parent profile already exists for the lead email
- all nurture stages have already been attempted

The lead is **due** when:

- no parent profile exists yet
- the next nurture stage delay has passed

Recommended stages:

1. `24h` after lead capture
2. `96h` after lead capture
3. `192h` after lead capture

This keeps cadence gentle and avoids over-emailing.

### 3. Nurture email builder

Create a dedicated starter-kit nurture email builder that reuses the shared HTML notification system.

The sequence should stay short and action-oriented:

- Stage 1: clarify the next step after the starter kit
- Stage 2: show the simplest path from guide to first value
- Stage 3: final reminder to start the trial

Primary CTA should point to `/login`, because the goal is trial start, not another content click.

### 4. Internal scheduler route

Add a new authenticated internal route:

- `/api/internal/marketing/lead-nurture/run`

It should:

- use the same scheduler secret pattern as other internal jobs
- iterate through marketing leads
- assess whether each is due
- send the proper nurture stage
- persist success or failure back to the lead record
- return a structured summary for ops

### 5. Admin marketing evidence

Extend the admin marketing page so the team can see:

- leads with at least one nurture email sent
- nurture failures
- latest nurture stage activity
- recent leads and their nurture status

This keeps the lifecycle visible without creating a separate CRM dashboard.

### 6. Scheduler integration

Add the new route to `scripts/configure-daily-brief-scheduler.sh` so lead nurture can run on a fixed schedule using the current scheduler secret.

Daily cadence is enough because the assessment logic already handles elapsed delay windows.

## Data Flow

1. Parent submits starter-kit form.
2. Lead is persisted and receives the starter-kit email.
3. Scheduler later calls `/api/internal/marketing/lead-nurture/run`.
4. The route checks each lead against nurture policy and parent profile conversion state.
5. Due leads receive the next nurture email.
6. Lead record updates with nurture attempt state.
7. Admin marketing page reflects the latest nurture evidence.
8. When the parent later signs in, the lead is no longer due because a matching profile exists.

## Error Handling

- Missing scheduler secret should return `503` or `401` consistently with the existing internal routes.
- Email delivery failure should record the error on the lead and count as failed, not skipped.
- Existing converted parents should be skipped cleanly without updating state unnecessarily.

## Testing

Required coverage:

- lead store normalization for new nurture fields
- nurture policy due / skipped / completed scenarios
- nurture email builder stage-aware content
- internal route auth and summary behavior
- admin marketing page nurture visibility

## Out of Scope

- reward or discount logic
- multi-channel nurture
- GA4 production activation
- external CRM syncing

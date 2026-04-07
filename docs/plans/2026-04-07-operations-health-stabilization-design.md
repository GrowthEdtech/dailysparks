# Operations Health Stabilization Design

## Goal

Turn the current reliability tooling into a usable day-to-day operating surface by adding:

- a production stabilization checklist
- an ops drill plan
- an incident runbook / SOP

These assets should live in two places at once:

- canonical design + implementation docs in `docs/plans`
- fast, high-signal quick-entry cards inside the admin `Operations Health` page

## Why now

The platform already has:

- synthetic canary gating
- hold / release / rerun-and-deliver controls
- operations-health alerts and remediation evidence
- notification and billing backstops

What is still missing is the operator layer that answers:

- what should we check every morning?
- what scenarios should we rehearse before trusting the system?
- what exact action should on-call take when an incident happens?

Without this layer, the system is technically capable but still depends too much on memory and tribal knowledge.

## Recommended approach

Add a new `Ops readiness` section to the existing `Operations Health` panel.

This section should present three concise quick-entry cards:

1. `Production stabilization checklist`
2. `Ops drill plan`
3. `Incident runbook / SOP`

Each card should expose:

- purpose
- 4-6 critical items only
- the live signals or admin surfaces to check
- the canonical docs path for the full version

This is better than building a persistent checklist workflow in this phase because:

- the user explicitly wants `docs + admin quick entry`
- operators need clarity faster than they need another state machine
- we can improve team readiness immediately without introducing more operational overhead

## Scope

### 1. Production stabilization checklist

Summarize the minimum checks for the current production window.

The quick-entry version should cover:

- synthetic canary pass / block state
- blocked-by-canary count
- retry-delivery count
- operations-health alert count
- billing backfill activity
- GEO last-run freshness

The emphasis is: *what must look healthy before we trust today’s run*.

### 2. Ops drill plan

Surface the fault scenarios that the team should actively rehearse.

The quick-entry version should cover:

- canary fail -> rerun canary
- canary fail -> release-and-deliver
- retry-delivery path
- billing webhook miss -> reconciliation backfill
- planned notification escalation handling

Each item should clarify the expected success evidence after the drill.

### 3. Incident runbook / SOP

Provide a fast-response decision path for live incidents.

The quick-entry version should distinguish:

- when to wait for auto-remediation
- when to rerun canary
- when to release-and-deliver
- when to escalate due to repeated alerts or unresolved blocked waves

The SOP should point operators back to existing evidence sources:

- Daily Brief detail
- Operations Health alerts
- remediation history
- notification ops queue

## UX approach

Do not bury this content in long prose.

The admin section should use:

- a new `Ops readiness` eyebrow/title block
- a 3-card layout on desktop
- short action-oriented bullets
- compact evidence pills or labels where helpful
- doc path labels for the canonical reference

This should feel like an operating console, not an internal wiki page pasted into the UI.

## Content strategy

The admin cards are not the source of truth for exhaustive procedures.

Instead:

- the page provides the fast path for operators
- `docs/plans` holds the full reference version for handoff, onboarding, and future edits

This keeps the UI readable while still preserving full written guidance in the repo.

## Non-goals

This phase does not:

- add checklist completion persistence
- add assignee tracking for ops drills
- create a new incident ticketing workflow
- replace existing domain-specific admin pages

## Success criteria

- an operator can open `Operations Health` and understand the morning checks within seconds
- the team can run a controlled drill without needing to reconstruct steps from memory
- incidents have a visible “what do I do next?” path in the admin surface
- the full written guidance stays versioned alongside the codebase

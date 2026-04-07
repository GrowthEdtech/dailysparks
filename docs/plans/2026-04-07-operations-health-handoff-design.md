# Operations Health Handoff Summary Design

## Goal

Add a lightweight shift-handoff export to `Operations Health` so operators can:

- copy a concise Markdown handoff summary
- download the same summary as a plain text file
- hand off the latest reliability state without rewriting the situation by hand

## Why now

The page already exposes:

- live status
- alerts
- remediation evidence
- readiness guidance

But operators still need to manually repackage that state for early/late shift handoff. This creates friction and increases the chance that key context gets dropped:

- whether canary is currently blocking production
- whether retries are still active
- whether GEO or billing backfills are fresh
- which alerts and remediation actions matter most right now

## Recommended approach

Keep this feature client-side and reuse the same live data that is already loaded into `Operations Health`.

This means:

- no new API route
- no new persistence layer
- no extra scheduler output

Instead, add a shared handoff-summary builder that converts:

- current snapshot
- latest immutable run
- top alerts
- top remediation actions

into a compact handoff narrative.

This is better than a server-generated export in this phase because:

- it is faster to ship
- it keeps the summary aligned with the page the operator is already viewing
- it is easy to extend later into email or scheduled handoff delivery

## UX shape

Add a new `Shift handoff summary` card to `Operations Health`.

The card should include:

- a short explanation of what the export is for
- a preview of the generated summary
- `Copy Markdown`
- `Download TXT`

The export should feel like a handoff memo, not a data dump.

## Summary structure

The generated summary should contain:

1. header
   - run date
   - latest run timestamp
   - current status

2. operational snapshot
   - Daily Brief generated / expected
   - retry count
   - blocked-by-canary count
   - active alert count
   - escalated notifications
   - billing actionable count
   - GEO latest status / timeout count

3. top evidence
   - latest alert titles
   - latest remediation actions

4. recommended handoff note
   - concise next-step framing based on current risk

## Handoff note policy

The summary should translate state into an operator recommendation:

- `critical` or blocked canary -> call out stop-the-line review
- `warning` with retries only -> monitor recovery and confirm shrinkage
- `healthy` -> keep routine morning checks only

This note should stay short and directive.

## Non-goals

This phase does not:

- email the handoff automatically
- store shift notes in a database
- add assignee or sign-off state
- create a new incident workflow

## Success criteria

- an operator can copy a handoff summary in one click
- the exported text contains the most important reliability evidence
- the format is readable in chat, email, or plain text tools
- the summary stays derived from the same live state already shown in the admin page

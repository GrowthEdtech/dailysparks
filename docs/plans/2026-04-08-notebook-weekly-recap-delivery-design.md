# Notebook Weekly Recap Delivery Design

## Goal

Promote weekly recap from a manual notebook action into a fixed learning rhythm:

- automatically generate one recap every Sunday at 18:00 `Asia/Hong_Kong`
- persist that recap as the canonical weekly record for the family and programme
- automatically sync the recap to Notion when connected
- send a lightweight HTML recap email to the parent
- expose recap history in the dashboard so families can revisit prior weeks

## Why now

The current notebook loop already supports:

- saved notebook entries
- authored reflections
- weekly recap generation
- retrieval prompts
- weekly recap persistence
- manual Notion sync

What is missing is cadence. Families must still remember to save and sync a recap themselves, which means the review layer is optional rather than structural. The next product step is to make recap a reliable weekly habit:

- the system creates the recap on time
- the dashboard keeps a visible history
- the email acts as a light recall nudge
- Notion stays a secondary archive, not the only durable destination

## Recommended approach

Keep a single weekly recap record per:

- `parentId`
- `programme`
- `weekKey`

and extend that existing record with delivery metadata instead of introducing a second scheduler-specific recap model.

This means all surfaces use the same source of truth:

- dashboard current recap
- dashboard recap history
- manual save / manual response flows
- Notion sync
- scheduled weekly delivery

The scheduled worker should reuse one shared weekly recap delivery service that:

1. loads notebook entries for a parent and programme
2. builds the recap for the current week
3. persists or refreshes the recap
4. syncs to Notion when connected
5. sends a lightweight recap email when not already sent for that week

This is better than separate manual and scheduled paths because it preserves:

- idempotency
- consistent recap content
- one place for delivery metadata
- simpler future debugging

## Delivery policy

### Schedule

- run every Sunday at `18:00 Asia/Hong_Kong`
- use the existing scheduler auth model
- create a dedicated internal route for weekly recap delivery

### Programme scope

- include publicly active programmes only: `MYP` and `DP`
- skip legacy `PYP`

### Recap creation policy

- if there are no notebook entries for the target week, skip recap creation and email
- if the recap already exists for that week, refresh the recap content while preserving existing retrieval responses
- scheduled reruns must be safe and idempotent

### Email policy

- send only to the parent email
- do not CC `admin@geledtech.com`
- use a lightweight HTML reminder format, not a full document email
- include:
  - week label
  - 2-3 summary lines
  - top focus tags
  - 2-3 retrieval prompts
  - CTA back to the dashboard
- if the recap email for that week has already been sent successfully, do not send again on scheduler retry

### Notion policy

- if Notion is connected, sync automatically during scheduled delivery
- Notion sync failure should not block recap persistence or recap email delivery
- record sync status on the recap record

## Data model changes

Extend the weekly recap record with delivery metadata:

- `generationSource`
  - `manual`
  - `scheduled`
- `emailLastSentAt`
- `emailLastStatus`
  - `pending`
  - `sent`
  - `skipped`
  - `failed`
- `emailLastMessageId`
- `emailLastErrorMessage`

This keeps history per week lightweight while still allowing the dashboard and future ops tools to explain what happened.

## Dashboard UX

Keep the current weekly recap card for the active week, then add a dedicated `Recap history` section below it.

### Current week card

Continue to show:

- summary lines
- retrieval prompts
- retrieval responses
- `Save weekly recap`
- `Sync weekly recap to Notion`

### Recap history view

Add a list/detail view using persisted recap records:

- left: weekly recap history list
  - week label
  - programme
  - entry count
  - top tags
  - whether email was sent
  - whether Notion was synced
- right: selected recap detail
  - summary lines
  - highlights
  - retrieval prompts
  - saved retrieval responses
  - metadata such as sent/synced timestamps

The latest recap should be selected by default.

## Scheduler flow

Add a new internal route protected by scheduler secret validation.

The route should:

1. list parent profiles
2. filter to active public programmes
3. process each family independently
4. collect summary counts:
   - `checkedCount`
   - `generatedCount`
   - `skippedNoEntriesCount`
   - `notionSyncedCount`
   - `emailSentCount`
   - `emailSkippedCount`
   - `failedCount`

Failures for one family must not stop the rest of the run.

## Error handling

The system should fail open by layer:

- recap generation failure for one family -> count as failed, continue loop
- Notion sync failure -> persist recap, record failed sync, continue
- email failure -> keep persisted recap, record failed email status, continue

This ensures the weekly record still exists even when side effects degrade.

## Non-goals

This phase does not:

- add a separate admin recap console
- send recap email copies to ops
- build recap editing UI
- add push notifications
- create a per-prompt spaced repetition engine

## Success criteria

- every Sunday at 18:00 Hong Kong time, eligible families can receive a weekly recap automatically
- the recap is persisted even if Notion or email side effects fail
- the dashboard shows recap history beyond the current week
- recap email is lightweight and references the same persisted weekly record
- scheduler retries do not create duplicate recap emails for the same week

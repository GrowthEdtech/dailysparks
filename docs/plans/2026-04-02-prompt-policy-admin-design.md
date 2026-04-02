# Prompt Policy Admin Design

## Goal

Add a dedicated `Prompt Policy` admin surface so operators can manage the
generation instructions for `PYP`, `MYP`, and `DP` without mixing prompt logic
into AI infrastructure settings.

## Why This Matters

The current editorial admin now covers:

- source whitelist and ingestion preferences
- AI connection registry and default model endpoint
- read-only daily brief history

What is still missing is the policy layer: the versioned prompt rules that tell
the system how to transform source material into programme-specific Daily Sparks
briefs. Without that layer, operators can choose sources and models, but cannot
reliably manage the actual generation behavior.

## Recommended MVP

Ship a dedicated `Prompt Policy` tab with:

- a real persistence layer
- one active policy at a time
- editable `draft` policies
- `duplicate -> edit -> activate` flow
- separate instruction blocks for shared and programme-specific rules
- a preview of the resolved prompt for `PYP`, `MYP`, and `DP`

Do not add A/B testing, per-connection overrides, or approval workflow yet.

## Information Architecture

The editorial admin should now have four tabs:

1. `Sources`
2. `AI Connections`
3. `Prompt Policy`
4. `Daily Briefs`

`Prompt Policy` should sit inside the same authenticated `/admin/editorial`
shell and use dedicated child routes:

- `/admin/editorial/prompt-policy`
- `/admin/editorial/prompt-policy/[policyId]`

## Separation of Responsibilities

`AI Connections` should continue to own:

- `baseUrl`
- `apiKey`
- `defaultModel`
- active or default connection state

`Prompt Policy` should own:

- shared editorial instructions
- anti-repetition instructions
- output contract instructions
- programme-specific instructions for `PYP`, `MYP`, and `DP`
- policy versioning and activation

`Daily Briefs` should store which prompt policy version was used for each
generated brief, but it should not edit prompt rules.

## Data Model

Each stored prompt policy should include:

- `id`
- `name`
- `versionLabel`
- `status`
- `sharedInstructions`
- `antiRepetitionInstructions`
- `outputContractInstructions`
- `pypInstructions`
- `mypInstructions`
- `dpInstructions`
- `notes`
- `createdAt`
- `updatedAt`
- `activatedAt`

### Supported statuses

- `draft`
- `active`
- `archived`

## Editing Rules

- Only one policy can be `active`
- `active` policies cannot be edited in place
- To change an active policy, the operator must duplicate it into a new draft
- Draft policies can be edited and then activated
- Archived policies remain visible for traceability but cannot be reactivated in
  this MVP

## Storage Strategy

Follow the same backend switch already used by the rest of the app:

- local JSON for local development
- Firestore for production

Add a new prompt policy store with:

- `listPromptPolicies()`
- `getPromptPolicy(id)`
- `createPromptPolicy(input)`
- `updatePromptPolicy(id, input)`
- `activatePromptPolicy(id)`
- `duplicatePromptPolicy(id)`
- `archivePromptPolicy(id)`

## Prompt Resolution Model

Each generated prompt should be assembled in this order:

1. `sharedInstructions`
2. `antiRepetitionInstructions`
3. one of:
   - `pypInstructions`
   - `mypInstructions`
   - `dpInstructions`
4. `outputContractInstructions`

The detail page should show a resolved preview for each programme so the admin
can inspect the final prompt structure before activating a draft.

## Daily Briefs Traceability Changes

Daily Brief records should continue storing the existing prompt version string,
but also add:

- `promptPolicyId`
- `promptVersionLabel`

This keeps history traceable once multiple prompt policy versions exist.

## List Page UX

The prompt policy list page should show:

- a top summary explaining that prompt policy controls generation behavior
- an `Active Prompt Policy` highlight card
- a version list for all policies
- a `Create draft` button

Each policy row should show:

- name
- version label
- status
- last updated time
- activation time when relevant
- link to detail page

## Detail Page UX

The detail page should show:

- metadata block
- editable sections for draft policies:
  - shared instructions
  - anti-repetition instructions
  - output contract instructions
  - `PYP`
  - `MYP`
  - `DP`
  - notes
- read-only view for active and archived policies
- resolved prompt previews for each programme

Draft actions:

- `Save draft`
- `Activate`
- `Archive`

Active actions:

- `Duplicate as new draft`

Archived actions:

- view only

## API Surface

Add admin-only endpoints:

- `GET /api/admin/prompt-policies`
- `POST /api/admin/prompt-policies`
- `PUT /api/admin/prompt-policies`
- `POST /api/admin/prompt-policies/activate`
- `POST /api/admin/prompt-policies/duplicate`
- `POST /api/admin/prompt-policies/archive`

These should use the existing editorial admin password session.

## What This MVP Explicitly Does Not Include

- per-AI-connection prompt overrides
- split prompt policies by source domain
- approval workflow
- side-by-side diff view
- prompt experiment matrix
- automatic evals before activation

## Testing Strategy

Add tests for:

- prompt policy store create/list/get/update/activate/duplicate/archive behavior
- admin tabs include `Prompt Policy`
- prompt policy list empty state and active policy summary
- prompt policy detail page for draft editing and resolved preview
- prompt policy API authentication and action behavior
- daily brief history record includes `promptPolicyId` and
  `promptVersionLabel`

## Success Criteria

This MVP is complete when:

- the admin shell shows `Prompt Policy` as a dedicated tab
- operators can create and edit draft prompt policies
- only one prompt policy can be active at a time
- active policies are duplicated instead of edited in place
- the detail page renders programme-specific resolved prompt previews
- daily brief history can store prompt policy trace fields
- full tests, lint, and build all pass

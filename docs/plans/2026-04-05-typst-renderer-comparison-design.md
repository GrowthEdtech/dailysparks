# Typst Renderer Comparison Design

## Goal

Add a low-risk operator workflow that lets the editorial admin compare `pdf-lib` and `Typst` daily brief outputs side by side, and choose the renderer for manual canary tests and manual resends, without changing the production scheduler's default renderer.

## Scope

This change affects only:
- admin `Daily Briefs` detail compare UX
- admin manual staged test runs
- admin manual resend/backfill
- admin-visible delivery evidence for those manual actions

It does not change:
- scheduled production delivery defaults
- scheduler payloads
- automated retry defaults

## Recommended approach

### Renderer model

Introduce a narrow admin-only renderer selector with two values:
- `pdf-lib`
- `typst`

`pdf-lib` remains the default everywhere. `typst` is opt-in and only available on admin-triggered flows.

### Admin compare experience

On the daily brief detail page, add an explicit comparison block that shows:
- current production `pdf-lib` first-page preview
- `Typst` first-page preview
- download links for both PDFs
- source view only for the Typst prototype

This makes the admin page a true renderer comparison surface instead of a single preview plus a Typst link.

### Manual test / resend renderer selection

Add a renderer field to:
- manual canary test panel
- manual resend / backfill panel

The selected renderer is threaded through the admin routes into the Goodnotes delivery path. For `typst`, the attachment filename should make the prototype explicit so receipts are honest, e.g. `_typst-prototype.pdf`.

### Evidence and transparency

Manual test summaries and resend success messages should echo the renderer used. Delivery receipts should capture the chosen renderer so admins can later verify whether a receipt came from `pdf-lib` or `Typst`.

## Data / API changes

Add a shared renderer type and thread it through:
- `goodnotes-delivery`
- `daily-brief-stage-delivery`
- `admin daily-brief-test-run`
- `admin daily-brief-resend`
- `daily-brief history receipt schema`

Keep all new fields backward-compatible and optional for legacy records.

## Testing

Use TDD for:
- detail page compare block
- manual test panel renderer selector
- manual resend panel renderer selector
- admin routes forwarding renderer correctly
- Goodnotes Typst attachment naming
- receipt persistence for selected renderer

## Rollout

Ship directly because the change is admin-only and defaults to `pdf-lib`. Verify with:
- focused tests
- full `lint` / `test` / `build`
- production smoke for unauthenticated admin routes

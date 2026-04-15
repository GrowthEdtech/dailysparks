# Billing Success CTA Contrast Design

Date: 2026-04-14  
Owner: Codex / Growth Education

## Goal

Make the “Back to billing” button on `/billing/success` consistently readable by enforcing a dark text color across all states.

## Context

The success panel’s secondary CTA uses the shared `SECONDARY_SUCCESS_CTA_CLASSNAME`. In production, the text looks too light to read, especially in the “needs review” state. We want a consistent, high‑contrast label regardless of state.

## Approach

Update the secondary CTA class to use a fixed dark text color and matching hover/active states. This is a styling‑only change, no layout or behavior changes.

## Scope

- Update `SECONDARY_SUCCESS_CTA_CLASSNAME` in `src/app/billing/success/success-panel.styles.ts`.
- Ensure “Back to billing” remains readable in all states.
- No copy changes, no layout changes.

## Risks

Low. The change is a scoped style tweak on a single component.

## Testing

Run targeted UI tests or snapshot checks if present. Manual spot check on `/billing/success` after deploy.

# Billing Desktop Title Rail Polish Design

## Summary

Apply a final desktop-only visual polish to `/billing` so the `Current subscription` card and the two pricing cards share a more consistent top section. The page already has a strong three-card board and aligned CTAs; this pass focuses on making the title areas feel like members of the same system.

## Goals

- Give all three desktop cards a consistent title rail structure.
- Make the eyebrow, heading row, supporting copy, and status/badge treatment feel visually related across cards.
- Keep pricing, Stripe behavior, and billing state logic unchanged.
- Preserve current mobile and tablet layout behavior.

## Non-Goals

- No new pricing copy or billing logic.
- No redesign of the invoice section.
- No comparison-table or dashboard-shell rework.

## Options Considered

### 1. Spacing-only refinement

Adjust top margins and font sizes without changing card structure.

- Pros: Lowest risk.
- Cons: Limited payoff; the cards would still feel like different component families.

### 2. Recommended: shared title rail pattern

Introduce a common top wrapper for all three cards with a minimum height, a title row, and a subtle divider that separates the card header from the rest of the content. Move the subscription status pill into the summary card title row and keep the pricing-card selection pill in the same slot.

- Pros: Highest visual cohesion with minimal behavior change.
- Cons: Requires modest markup restructuring and updated tests.

### 3. Fully unify summary and pricing cards

Make the summary card use the exact same information architecture as pricing cards.

- Pros: Maximum consistency.
- Cons: Weakens the summary card’s information hierarchy and expands scope too much.

## Chosen Approach

Use option 2.

## Layout Changes

### Shared Title Rail

- Add a reusable card title rail with:
  - eyebrow
  - title row
  - supporting copy
  - optional chip row or trailing badge
- Use a consistent desktop minimum height so the three cards start their detailed content from the same horizontal line.
- Add a subtle bottom border to visually separate header content from the body.

### Summary Card

- Keep the existing `Current subscription` content.
- Move the primary subscription status badge into the title row so it mirrors the pricing card’s badge placement.
- Keep secondary badges, such as `Yearly chosen` or `Stripe sandbox`, in a lighter chip row below the supporting copy.

### Pricing Cards

- Keep the selected pill in the title row.
- Render a hidden placeholder for unselected cards so the heading row preserves the same geometry.
- Leave price, bullets, and CTA behavior untouched.

## Testing Strategy

- Add failing tests that assert the presence of the shared title rail classes and desktop min-height.
- Verify the rendered markup includes the new title rail structure and the status badge placement for the summary card.
- Run focused billing tests first, then the full test suite and production build in the isolated billing worktree.

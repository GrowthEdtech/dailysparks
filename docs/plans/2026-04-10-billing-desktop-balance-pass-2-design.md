# Billing Desktop Balance Pass 2 Design

## Goal

Remove the remaining right-side empty space on the desktop billing page and make the page feel like a balanced subscription board rather than a narrow centered stack.

## Problem

The first desktop pass widened the billing page and split the content into a summary column plus a pricing grid. That fixed the mobile-width shell problem, but for the current trial-expired state the summary column only holds one major card, so the overall board still reads as left-weighted with visible empty canvas to the right.

## Recommended Layout

- Increase the desktop shell width from `max-w-6xl` to `max-w-7xl`.
- Replace the `summary rail + two-plan grid` structure with a single three-card desktop board:
  - `Current subscription`
  - `Monthly`
  - `Yearly`
- Keep alerts above the board.
- Keep `Invoice delivery` as an optional full-width section below the board.
- Keep `Back to dashboard` below the content area, aligned with the board rather than isolated under a narrow sidebar.

## UX Notes

- Mobile and tablet behavior should remain simple and stacked.
- Desktop should only change at wide breakpoints.
- The three primary cards should feel equal in visual importance, even though the selected yearly plan still keeps its emphasis.

## Testing

- Update the billing render test to assert:
  - `max-w-7xl`
  - `xl:grid-cols-3`
  - removal of the old sticky summary expectation
- Keep CTA style tests intact.

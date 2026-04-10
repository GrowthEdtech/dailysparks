# Billing Desktop Responsive Design

## Goal

Repair the `/billing` page so wide screens no longer render as a narrow mobile column. The desktop experience should feel like a real subscription workspace while preserving the current mobile styling and behavior.

## Problem

The page currently constrains both the hero header and the main content to `max-w-md`, so desktop viewports still render a single narrow column centered in a large empty canvas. The plan cards, current subscription summary, and invoice delivery block all stack like a phone layout even on wide screens.

## Recommended Approach

Use a responsive two-column shell for desktop:

- Keep the current single-column flow on mobile and small tablets.
- Expand the hero header container to a desktop-friendly max width.
- Split the main content into:
  - a left summary column for `Current subscription`, `Invoice delivery`, and the dashboard back link
  - a right pricing column for the monthly and yearly plan cards
- Allow the pricing cards to compare side-by-side on wider screens so the desktop page uses horizontal space more intentionally.

## Layout Design

### Header

- Change the inner header shell from `max-w-md` to a wider container so the page title and account menu sit naturally on desktop.
- Keep the dark hero background and rounded lower edge so the page still matches the current billing visual language.

### Main Shell

- Use one column by default.
- Promote to a two-column layout at desktop widths.
- Keep the summary content grouped as a sidebar-style stack.
- Keep the plan selection grouped as a separate pricing area.

### Summary Sidebar

- Preserve the current cards and content order.
- Make the sidebar feel stable on desktop with a sticky top offset when possible.
- Keep the CTA back to dashboard aligned with the sidebar content rather than floating below the entire page.

### Pricing Area

- Preserve current plan copy, selection state, and Stripe behavior.
- Allow the plan cards to flow into a comparison grid on wide screens.
- Keep buttons full width within each card for clarity and consistency.

## Testing Strategy

- Add a billing form render test that fails against the current mobile-only layout.
- Assert the desktop shell classes exist:
  - widened header shell
  - widened main shell
  - desktop two-column grid
  - desktop pricing grid
- Keep the existing style tests for CTA styling unchanged.

## Risk Notes

- This is a layout-only change; billing logic, Stripe checkout, and invoice behavior should remain untouched.
- The main regression risk is unintentional spacing changes on mobile, so the layout changes should stay behind responsive breakpoints whenever possible.

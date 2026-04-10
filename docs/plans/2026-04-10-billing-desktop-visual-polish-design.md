# Billing Desktop Visual Polish Design

## Summary

Refine the authenticated desktop `/billing` experience so it feels purpose-built for wide screens rather than a stretched mobile stack. Keep the existing three-card pricing board, but make the cards share a cleaner vertical rhythm, align primary actions on a common baseline, and tighten the hero header so the account control and copy feel intentionally composed.

## Goals

- Keep the current subscription card, monthly plan card, and yearly plan card in a single desktop row.
- Make desktop cards feel balanced by equalizing their vertical structure rather than allowing uneven bottoms.
- Align plan CTAs on a shared lower edge so the pricing board reads like a single unit.
- Improve the top header shell so the title block and account menu sit on a more polished baseline at desktop widths.
- Preserve current mobile and tablet behavior as much as possible.

## Non-Goals

- No pricing, copy, or Stripe flow changes.
- No billing logic, subscription state, or invoice behavior changes.
- No redesign into a comparison table or new information architecture.

## Options Considered

### 1. Width-only tune-up

Increase max width and spacing only.

- Pros: Lowest risk.
- Cons: Would still leave uneven card bottoms and inconsistent button alignment.

### 2. Recommended: structural rhythm polish

Keep the existing three-card board but convert desktop card interiors into flex columns with intentional spacing. Make plan lists grow to fill the column so buttons settle onto a shared baseline. Tighten the header shell with a stable desktop min-height and center alignment.

- Pros: Solves the visible imbalance without changing page architecture.
- Cons: Requires a few more layout class changes and test updates.

### 3. Full pricing-table redesign

Rebuild desktop billing as a comparison table with a summary rail.

- Pros: Strong desktop presence.
- Cons: Too heavy for a polish pass and risks expanding scope into copy and IA changes.

## Chosen Approach

Use option 2.

## Layout Changes

### Header

- Keep the dark rounded header and current copy.
- Make the desktop shell center-align vertically.
- Add a desktop minimum height so the title block and account menu do not feel compressed upward.
- Give the copy column a slightly more deliberate max width so the header spans wide screens more confidently.

### Pricing Board

- Keep the three-card row at `xl`.
- Make each card a full-height flex column.
- Treat the body copy and bullet list as the flexible middle area.
- Anchor the primary CTA to the bottom of each card with `mt-auto`.
- Preserve selected and inactive styles.

### Secondary Sections

- Keep invoice delivery below the board as a separate section.
- Keep the back-to-dashboard CTA below the main content stack.

## Testing Strategy

- Update style tests to assert desktop header centering/min-height and desktop card equal-height/flex-column structure.
- Update component markup tests to assert the presence of shared stretch behavior and bottom-aligned CTA structure.
- Run focused billing tests first, then full test suite and production build in the isolated billing worktree.

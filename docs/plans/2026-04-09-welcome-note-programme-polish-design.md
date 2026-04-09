# Welcome Note Programme Polish Design

## Goal

Make the Goodnotes welcome note feel more consistent with the `MYP / DP content model v2` without breaking the existing outbound brand system.

The welcome note should keep one shared visual skeleton, but it should make the learner stage feel legible at a glance:

- `MYP` should read like a bridge-tier analytical workflow
- `DP` should read like an academic evidence-and-argument workflow

## Product Decision

Keep the current welcome note structure intact:

- brand eyebrow
- welcome headline
- setup-confirmed card
- expectations section
- weekly rhythm section
- next steps
- signature

Do **not** split the PDF into separate `MYP` and `DP` templates.

Instead, add one programme-native focus area inside the shared layout.

## Recommended Approach

Use a single `Reading focus` panel between the setup-confirmed card and the rest of the onboarding copy.

This panel should:

- show a short tier label
- summarize how the learner's packets will feel
- list three concrete programme-native signals

### MYP Focus

The `MYP` version should emphasize:

- global context connections
- compare-or-connect thinking
- inquiry notebook capture

### DP Focus

The `DP` version should emphasize:

- abstract and core issue framing
- claim and counterpoint thinking
- TOK / essay notebook capture

## Visual Direction

Preserve the current outbound system:

- warm white page
- serif headline
- calm brand gold
- soft panel outlines

Add one programme-native accent card:

- `MYP`: lighter blue/teal bridge-tier emphasis
- `DP`: slate/gold academic emphasis

This should feel like one family, not two unrelated designs.

## Copy Direction

Keep the existing onboarding tone:

- guided
- calm
- practical
- not overly promotional

Tighten headings so they align with the v2 model:

- `Setup confirmed`
- `Reading focus`
- `What to expect`
- `Weekly rhythm`
- `Your next steps`

## Implementation Notes

- extend the welcome-note payload with programme-native focus metadata
- derive focus content from existing `MYP / DP` runtime semantics rather than hardcoding disconnected marketing copy
- update the Typst renderer only; keep email subject and delivery pipeline stable
- add PDF-level regression coverage so placeholder or drift regressions are caught

## Non-goals

This slice does not include:

- changing welcome-note transport
- redesigning the daily brief PDF
- changing dashboard onboarding
- adding new delivery channels
- adding separate MYP/DP email templates

## Success Criteria

- the welcome note still feels like the same outbound brand family
- `MYP` and `DP` are visibly different within one page
- the page communicates the learner's reading mode before the first brief arrives
- PDF regression tests catch future layout/content fallback issues

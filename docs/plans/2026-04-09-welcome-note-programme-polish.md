# Welcome Note Programme Polish Implementation Plan

## Scope

Polish the Goodnotes welcome note so it better reflects `MYP / DP content model v2` while preserving the shared outbound brand system.

## Steps

1. Extend the welcome-note payload model
- add programme-native focus title, summary, tier label, and bullet points
- keep existing setup/expectations/weekly rhythm fields intact

2. Add regression tests first
- assert `MYP` and `DP` produce different focus content
- assert rendered PDF includes the programme-native focus copy
- keep the existing placeholder-regression test in place

3. Update the Typst renderer
- insert one programme-native focus card
- keep the rest of the visual skeleton stable
- use subtle accent differences by programme

4. Verify consistency with runtime semantics
- align focus bullets with the current `MYP / DP content model v2`
- align weekly rhythm copy with existing weekend policy wording

5. Run verification
- targeted welcome-note tests
- lint
- full test suite
- build

6. Release
- commit
- push `main`
- deploy Cloud Run
- send one live welcome note test for production verification

# Landing Page Content Refresh Implementation Plan

## Scope

Refresh homepage copy in `Hero`, `Solution`, `How it works`, and `FAQ` so it aligns with the live `MYP + DP` product model.

## Steps

1. Add regression tests first
- lock new homepage messaging in the informational page test
- lock the FAQ question set in the home content test
- assert outdated copy is absent

2. Update the hero copy
- make the `MYP / DP` split explicit
- keep the existing layout and CTA structure

3. Update the solution section
- replace the outdated `TED-Talk Structure` framing
- describe the real `MYP bridge` and `DP academic` outcomes

4. Update the setup flow
- rewrite the step descriptions from a family workflow perspective
- remove exact scheduler wording like `09:00 UTC`
- tighten the CTA label

5. Update the FAQ
- remove the old `P5 to MYP` positioning
- add a direct `How are MYP and DP briefs different?` answer
- keep integration and billing setup answers current

6. Verify
- run targeted homepage tests
- run lint
- run full test suite
- run build

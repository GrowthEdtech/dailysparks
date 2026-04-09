# Landing Page Visual Refresh Implementation Plan

## Scope

Refresh the `How it works` illustration on the homepage so it shows a code-native
student reading workspace instead of the current placeholder-like panel.

## Steps

1. Add regression coverage first
- assert the homepage contains the new workflow labels
- assert the old placeholder copy is removed
- assert the laptop emoji is removed

2. Build a dedicated illustration component
- keep the current outer shell and decal framing
- move the interior artwork into a focused component

3. Design the new reading workspace scene
- central `Daily brief` card
- supporting `MYP / DP / Goodnotes / Notion / Weekly recap` signals
- subtle connector lines and layered cards

4. Integrate into the homepage
- replace the old dark panel content only
- keep the surrounding section layout stable

5. Verify
- run targeted homepage tests
- run lint
- run full test suite
- run build

# Daily Brief IB Template v2 Design

## Goal
Introduce fixed IB-aligned sections for MYP and DP Daily Briefs (Learning objective, concepts/method, TOK, researchable question) while preserving the existing delivery pipeline and ensuring stable rendering in Typst/PDF.

## Success Criteria
- MYP and DP briefs always include the new required sections in a stable order.
- Rendering remains compatible with the current packet and Typst layout pipeline.
- Missing sections fail gracefully via programme-specific fallbacks.
- Admin preview and delivery output remain stable and readable without content overflow.

## Scope
### In scope
- Prompt policy updates to require new sections and order.
- Outbound packet parsing extended to recognize new section headings.
- Programme policy required section orders updated.
- Typst rendering updated to show new sections in the correct order.
- Tests updated to enforce the new structure.

### Out of scope
- UI changes to admin editor beyond prompt policy content.
- New delivery channels or changes to scheduling.
- Changes to weekly recap or notebook logic.

## Programme Structures
### MYP new section order
1. Learning objective
2. What’s happening?
3. Why does this matter?
4. Global context
5. Compare or connect
6. Key / related concepts
7. Words to know
8. Inquiry question
9. Notebook prompt

### DP new section order
1. 3-sentence abstract
2. Learning objective
3. Core issue
4. Claim
5. Counterpoint or evidence limit
6. Method focus
7. TOK link
8. Why this matters for IB thinking
9. Key academic term
10. TOK / essay prompt
11. Researchable question
12. Notebook capture

## Data Flow Impact
1. Prompt policy produces `briefMarkdown` with the new sections in order.
2. Packet parser extracts structured sections by title and preserves ordering.
3. Typst template renders the normalized section list in the programme order.
4. Delivery continues through Goodnotes/Notion unchanged.

## Prompt Policy Changes
- Add explicit instructions for the new sections in MYP and DP.
- Add short guidance for the expected format of each new section.
- Keep JSON contract unchanged (headline, summary, briefMarkdown, topicTags).

## Parsing and Normalization
- Extend structured section detection to include new section titles.
- Update programme required section order to reflect new structure.
- Provide programme-specific fallbacks for missing sections.

## Rendering
- Typst template should render the new sections using existing section styles.
- Ensure new sections respect the same spacing and heading hierarchy.

## Testing Strategy
- Update prompt policy tests to assert new instruction text.
- Add packet parsing tests for new section titles and ordering.
- Update Typst render tests to ensure new sections appear without truncation.
- Ensure existing daily brief output tests still pass.

## Rollout Notes
- This is a schema-compatible change; no migration required.
- If needed, rollout can be reverted by restoring prior prompt policy and section order.

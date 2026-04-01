# Landing Integrations Adaptive Copy Layout

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the landing integrations copy blocks adapt on wide screens so the section no longer leaves the right side visually empty while keeping mobile and tablet reading order intact.

**Approach:** Keep the simplified comparison board structure, but switch the top intro and board header copy into two-column text layouts at `xl`. The main heading remains the visual anchor, while supporting descriptions shift into a right-hand column with readable line lengths rather than staying trapped in narrow fixed-width blocks.

**Files:**
- Modify: `src/app/landing-integrations-section.tsx`
- Modify: `src/app/landing-integrations-section.test.tsx`

**Verification:**
- `npm test -- src/app/landing-integrations-section.test.tsx`
- `npm run lint -- src/app/landing-integrations-section.tsx src/app/landing-integrations-section.test.tsx`
- `npm run build`
- Smoke test rendered HTML locally and on production after deploy

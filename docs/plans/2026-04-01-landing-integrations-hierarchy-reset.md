# Landing Integrations Hierarchy Reset

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the visual clutter introduced by wide-screen split-copy layouts and restore a clean reading hierarchy in the landing integrations section.

**Approach:** Keep the simplified comparison board, but collapse the intro and board header back to a single vertical copy flow. The heading remains the hero of each block, while the supporting paragraph sits underneath with controlled line length. This avoids overlap, reduces tension between left and right columns, and keeps the cards as the main visual content.

**Files:**
- Modify: `src/app/landing-integrations-section.tsx`
- Modify: `src/app/landing-integrations-section.test.tsx`

**Verification:**
- `npm test -- src/app/landing-integrations-section.test.tsx`
- `npm run lint -- src/app/landing-integrations-section.tsx src/app/landing-integrations-section.test.tsx`
- `npm run build`
- Smoke test local and production HTML to confirm split-copy classes are gone

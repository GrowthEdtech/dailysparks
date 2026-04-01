# Landing Integrations Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the landing integrations section into one clear introduction followed by a direct Goodnotes vs Notion comparison board.

**Architecture:** Keep the section in a dedicated React server component, remove the extra stack of supporting cards and highlight pills, and let the content hierarchy flow from intro copy into a single comparison board plus a short "use one or both" footer. Preserve the existing branded SVG assets and data source in `home-content.ts`.

**Tech Stack:** Next.js App Router, React server components, Tailwind CSS, Vitest

---

### Task 1: Lock the new structure with a failing component test

**Files:**
- Modify: `src/app/landing-integrations-section.test.tsx`

**Step 1: Write the failing test**

Assert for the simplified comparison board copy and the removal of the extra highlight-pill language.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/landing-integrations-section.test.tsx`

Expected: FAIL because the old section still renders the busy highlight structure.

### Task 2: Refactor the section layout

**Files:**
- Modify: `src/app/landing-integrations-section.tsx`

**Step 1: Replace the split two-column page section**

Move to a single intro block followed by a single comparison board.

**Step 2: Simplify the comparison board**

Keep only:
- one board heading
- one Goodnotes card
- one Notion card
- one short footer row for "use one or both"

**Step 3: Tighten typography and spacing**

Reduce line breaks, remove redundant pills, and make both cards visually parallel.

### Task 3: Verify and ship

**Files:**
- Verify: `src/app/landing-integrations-section.tsx`
- Verify: `src/app/landing-integrations-section.test.tsx`

**Step 1: Run targeted tests**

Run: `npm test -- src/app/landing-integrations-section.test.tsx src/app/home-content.test.ts`

**Step 2: Run lint and production build**

Run: `npm run lint -- src/app/landing-integrations-section.tsx src/app/landing-integrations-section.test.tsx src/app/page.tsx src/app/home-content.ts src/app/home-content.test.ts`

Run: `npm run build`

**Step 3: Commit, push, deploy, and smoke test**

Use the existing Cloud Run workflow, then verify the live HTML on `https://dailysparks.geledtech.com/`.

# Landing Integrations Responsive Intro Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the landing integrations intro use the full section width so the heading no longer feels squeezed into a left sidebar.

**Architecture:** Keep the simplified comparison board, but remove the nested narrow heading constraints. The intro copy should share the same responsive section container as the board, and the heading should rely on normal responsive wrapping instead of an artificially tiny `ch` width.

**Tech Stack:** Next.js App Router, React server components, Tailwind CSS, Vitest

---

### Task 1: Lock the responsive intro behavior with a failing test

**Files:**
- Modify: `src/app/landing-integrations-section.test.tsx`

**Step 1: Write the failing test**

Assert that the heading markup no longer includes the old narrow `max-w-[13ch]` / `md:max-w-[15ch]` constraints and instead includes a balanced, full-width treatment.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/landing-integrations-section.test.tsx`

Expected: FAIL because the component still ships with the old narrow width classes.

### Task 2: Refactor the intro layout

**Files:**
- Modify: `src/app/landing-integrations-section.tsx`

**Step 1: Widen the section shell**

Use a wider shared container so the intro and board align with the full landing page rhythm.

**Step 2: Remove narrow heading limits**

Replace the small `ch`-based width caps with a balanced full-width heading treatment that still wraps naturally on smaller screens.

### Task 3: Verify and ship

**Files:**
- Verify: `src/app/landing-integrations-section.tsx`
- Verify: `src/app/landing-integrations-section.test.tsx`

**Step 1: Run focused verification**

Run: `npm test -- src/app/landing-integrations-section.test.tsx`

Run: `npm run lint -- src/app/landing-integrations-section.tsx src/app/landing-integrations-section.test.tsx`

Run: `npm run build`

**Step 2: Deploy and smoke test**

Use the existing Cloud Run deployment script and confirm the production HTML includes the updated intro classes.

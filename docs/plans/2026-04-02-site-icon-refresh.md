# Site Icon Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current favicon-only setup with a complete Daily Sparks site icon set derived from the approved 512x512 brand asset.

**Architecture:** Keep the icon system App Router-native. Store the generated icon assets in `src/app`, declare them through `metadata.icons` and `metadata.manifest` in the root layout, and expose a dedicated `site.webmanifest` route so every platform resolves the same brand mark.

**Tech Stack:** Next.js App Router metadata, PNG/ICO icon assets, Vitest, Node/Next build pipeline

---

### Task 1: Lock the metadata contract with a failing test

**Files:**
- Create: `src/app/layout.test.ts`
- Modify: `src/app/layout.tsx`

**Step 1: Write the failing test**

Add a layout metadata test that expects:
- `metadata.icons.icon` to include `/favicon.ico` and `/icon.png`
- `metadata.icons.apple` to reference `/apple-icon.png`
- `metadata.manifest` to equal `/site.webmanifest`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/layout.test.ts`
Expected: FAIL because the root layout currently exports only `title` and `description`.

**Step 3: Write minimal implementation**

Add the metadata fields to `src/app/layout.tsx` without changing page structure.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/layout.test.ts`
Expected: PASS

### Task 2: Generate and wire the icon asset set

**Files:**
- Modify: `src/app/favicon.ico`
- Create: `src/app/icon.png`
- Create: `src/app/apple-icon.png`
- Create: `src/app/android-chrome-192x192.png`
- Create: `src/app/android-chrome-512x512.png`
- Create: `src/app/site.webmanifest/route.ts`

**Step 1: Generate the icon assets**

Use the provided 512x512 PNG to create the browser, Apple, and Android icon variants.

**Step 2: Add the web manifest route**

Return a JSON manifest that references the new 192x192 and 512x512 icons and sets the app name to `Daily Sparks`.

**Step 3: Verify file wiring**

Confirm the filenames in `layout.tsx` and `site.webmanifest` match the generated assets exactly.

### Task 3: Verify the full refresh

**Files:**
- Test: `src/app/layout.test.ts`
- Modify if needed: `README.md`

**Step 1: Run the targeted test**

Run: `npm test -- src/app/layout.test.ts`
Expected: PASS

**Step 2: Run a production build**

Run: `npm run build`
Expected: PASS with no new favicon/manifest errors.

**Step 3: Commit**

```bash
git add docs/plans/2026-04-02-site-icon-refresh-design.md docs/plans/2026-04-02-site-icon-refresh.md src/app/layout.tsx src/app/layout.test.ts src/app/favicon.ico src/app/icon.png src/app/apple-icon.png src/app/android-chrome-192x192.png src/app/android-chrome-512x512.png src/app/site.webmanifest/route.ts
git commit -m "feat: refresh site icons"
```

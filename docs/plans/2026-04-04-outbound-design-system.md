# Outbound Design System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn Daily Sparks outbound PDFs and onboarding reminder emails into a unified premium-minimal brand system using Canva as the design source and production code as the final renderer.

**Architecture:** Create the outbound visual system in Canva first, then translate it into two production rendering modes: a high-fidelity PDF renderer in `pdf-lib` and a simplified email-safe renderer for transactional email. Keep content structure stable while upgrading layout, hierarchy, spacing, and brand consistency.

**Tech Stack:** Canva-first design workflow, Next.js App Router, TypeScript, `pdf-lib`, Nodemailer email HTML, Vitest.

---

### Task 1: Create Outbound Canva Design Source

**Files:**
- Modify: `docs/plans/2026-04-04-outbound-design-system-design.md`

**Step 1: Create the brand board and template canvases in Canva**

- Add:
  - outbound brand board
  - welcome note PDF frame
  - daily brief PDF frame
  - onboarding reminder email desktop frame
  - onboarding reminder email mobile frame

**Step 2: Export screenshots for implementation reference**

Export:
- brand board
- welcome note PDF
- daily brief PDF
- email desktop
- email mobile

**Step 3: Record any implementation concessions**

- Add notes to the design doc for anything Canva can express but email cannot.

**Step 4: Commit**

```bash
git add docs/plans/2026-04-04-outbound-design-system-design.md
git commit -m "docs: add outbound design system source"
```

### Task 2: Upgrade Welcome Note PDF To Match Canva

**Files:**
- Modify: `src/lib/goodnotes-delivery.ts`
- Modify: `src/lib/goodnotes-delivery.test.ts`

**Step 1: Write the failing tests**

- Add tests that lock:
  - updated welcome note section labels
  - company signature
  - card titles
  - branded attachment behavior remains unchanged

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/goodnotes-delivery.test.ts`
Expected: FAIL because the new PDF composition is not implemented yet.

**Step 3: Write minimal implementation**

- Refactor the welcome note PDF renderer:
  - stronger title hierarchy
  - premium confirmation card
  - improved rhythm and spacing
  - consistent signature block

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/goodnotes-delivery.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/goodnotes-delivery.ts src/lib/goodnotes-delivery.test.ts
git commit -m "feat: redesign welcome note pdf"
```

### Task 3: Upgrade Daily Brief PDF To Match Canva

**Files:**
- Modify: `src/lib/goodnotes-delivery.ts`
- Modify: `src/lib/goodnotes-delivery.test.ts`

**Step 1: Write the failing tests**

- Add tests that lock:
  - edition metadata row
  - branded summary card
  - discussion / source section labels
  - footer signature

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/goodnotes-delivery.test.ts`
Expected: FAIL because the daily brief PDF still uses the old layout.

**Step 3: Write minimal implementation**

- Refactor the daily brief PDF renderer:
  - branded header
  - issue metadata row
  - summary deck card
  - more editorial reading layout
  - quieter references section

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/goodnotes-delivery.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/goodnotes-delivery.ts src/lib/goodnotes-delivery.test.ts
git commit -m "feat: redesign daily brief pdf"
```

### Task 4: Upgrade Onboarding Reminder Email To Email-Safe Premium Layout

**Files:**
- Modify: `src/lib/onboarding-reminder-email.ts`
- Modify: `src/lib/onboarding-reminder-email.test.ts`

**Step 1: Write the failing tests**

- Add tests that lock:
  - branded eyebrow
  - premium safe card structure
  - primary CTA wording
  - company signature
  - email-safe style constraints still hold

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/onboarding-reminder-email.test.ts`
Expected: FAIL because the current template is still the older utilitarian layout.

**Step 3: Write minimal implementation**

- Refactor the email HTML:
  - cleaner card hierarchy
  - calmer premium palette
  - sharper spacing rhythm
  - keep one CTA
  - preserve inline-style safety

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/onboarding-reminder-email.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/onboarding-reminder-email.ts src/lib/onboarding-reminder-email.test.ts
git commit -m "feat: redesign onboarding reminder email"
```

### Task 5: Add Visual Verification And Roll Out

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-04-04-outbound-design-system-design.md`

**Step 1: Run focused verification**

Run:
- `npm run lint -- src/lib/goodnotes-delivery.ts src/lib/goodnotes-delivery.test.ts src/lib/onboarding-reminder-email.ts src/lib/onboarding-reminder-email.test.ts`
- `npm test -- src/lib/goodnotes-delivery.test.ts src/lib/onboarding-reminder-email.test.ts`

Expected: PASS

**Step 2: Run full verification**

Run:
- `npm run lint`
- `npm test`
- `npm run build`

Expected: PASS with only known baseline warnings.

**Step 3: Deploy and smoke-test**

- Deploy Cloud Run
- Send one live welcome note test
- Send one live onboarding reminder test preview path if available
- Verify admin and outbound flows remain healthy

**Step 4: Commit**

```bash
git add README.md docs/plans/2026-04-04-outbound-design-system-design.md
git commit -m "docs: document outbound design rollout"
```

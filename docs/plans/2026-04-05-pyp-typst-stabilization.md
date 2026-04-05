# PYP Typst Stabilization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make PYP Typst production measurable, observable, and rollback-friendly before any MYP production rollout.

**Architecture:** Add a brief-level render audit object to daily brief history, write that audit from real rendered PDF outputs, and surface rollout/compliance/fallback state in the Daily Briefs admin list and detail views.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, pdf-lib, Typst

---

### Task 1: Add render audit fields to daily brief history

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-schema.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store-types.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/local-daily-brief-history-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/firestore-daily-brief-history-store.ts`

**Steps:**
1. Add a normalized `renderAudit` type and field to the schema.
2. Update create/update store normalization paths.
3. Preserve backward compatibility for legacy records with no audit.

### Task 2: Build PDF render audit from actual output

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/goodnotes-delivery.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-stage-delivery.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-manual-delivery.ts`

**Steps:**
1. Return render audit metadata alongside generated PDF bytes.
2. Count pages from the actual PDF.
3. Mark PYP Typst one-page compliance truthfully.
4. Persist the latest audit to history during delivery and manual resend.

### Task 3: Add rollout summary and fallback visibility to Daily Briefs list

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/daily-brief-ops-summary.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/page.tsx`

**Steps:**
1. Extend ops summary with renderer/compliance/fallback counts.
2. Add a `Renderer rollout` section to the list page.
3. Add renderer/compliance badges to each brief card.
4. Make `MYP compare-only` explicit in the rollout UI.

### Task 4: Surface render audit on brief detail

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`

**Steps:**
1. Add a `Render audit` panel.
2. Show renderer, page count, layout variant, and one-page compliance.
3. Show fallback/rollback messaging when PYP production is not using Typst.

### Task 5: Add tests, verify, and ship

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/daily-brief-ops-summary.test.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/page.test.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/goodnotes-delivery.test.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store.test.ts`

**Steps:**
1. Write failing tests first for audit persistence and admin visibility.
2. Run focused tests.
3. Run `npm run lint`, `npm test`, and `npm run build`.
4. Commit with a focused conventional commit.
5. Push and deploy to Cloud Run.

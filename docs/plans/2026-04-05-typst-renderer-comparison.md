# Typst Renderer Comparison Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add admin-side `pdf-lib` vs `Typst` comparison and allow manual canary tests / manual resends to choose the renderer without changing automated production delivery defaults.

**Architecture:** Keep `pdf-lib` as the production default, add a narrow shared renderer type for admin-triggered manual flows, persist renderer on delivery receipts, and expand the detail page into a true side-by-side compare surface.

**Tech Stack:** Next.js app router, React server/client components, Vitest, existing `pdf-lib` and Typst prototype utilities.

---

### Task 1: Add failing tests for renderer selection and compare UI

**Files:**
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/page.test.tsx`
- Modify: `src/app/api/admin/daily-brief-test-run/route.test.ts`
- Modify: `src/app/api/admin/daily-brief-resend/route.test.ts`

**Steps:**
1. Add detail-page assertions for explicit `pdf-lib` vs `Typst` compare labels and Typst thumbnail URL.
2. Add list-page assertions for renderer controls in the manual test panel.
3. Add admin route assertions that `renderer: "typst"` is forwarded.
4. Run focused tests and confirm they fail for the missing behavior.

### Task 2: Add shared renderer type and Goodnotes support

**Files:**
- Modify: `src/lib/goodnotes-delivery.ts`
- Modify: `src/lib/daily-brief-history-schema.ts`
- Modify: `src/lib/daily-brief-history-store.ts`
- Modify: local/firestore history store normalization files if needed
- Test: `src/lib/goodnotes-delivery.test.ts`
- Test: `src/lib/daily-brief-history-store.test.ts`

**Steps:**
1. Add a shared renderer type for outbound brief PDFs.
2. Allow `createGoodnotesBriefPdf` / `sendBriefToGoodnotes` to select Typst.
3. Give Typst manual attachments an honest file suffix.
4. Persist renderer on delivery receipts with backward-compatible defaults.
5. Run focused tests and make them pass.

### Task 3: Thread renderer through manual resend and manual test

**Files:**
- Modify: `src/lib/daily-brief-stage-delivery.ts`
- Modify: `src/app/api/admin/daily-brief-resend/route.ts`
- Modify: `src/app/api/admin/daily-brief-test-run/route.ts`
- Test: `src/app/api/admin/daily-brief-resend/route.test.ts`
- Test: `src/app/api/admin/daily-brief-test-run/route.test.ts`

**Steps:**
1. Extend delivery helper options to accept renderer.
2. Parse and validate renderer in admin routes.
3. Forward renderer to manual deliveries only.
4. Include renderer in success payloads / operator notes where useful.
5. Run focused tests and make them pass.

### Task 4: Add compare UI and renderer controls

**Files:**
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/manual-resend-panel.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/manual-test-run-panel.tsx`
- Create: `src/app/api/admin/daily-brief-typst-thumbnail/[briefId]/route.ts`
- Test: `src/app/api/admin/daily-brief-typst-thumbnail/[briefId]/route.test.ts`

**Steps:**
1. Add renderer selector inputs to both admin client panels.
2. Add side-by-side compare cards on the detail page.
3. Add a Typst thumbnail route mirroring the pdf-lib thumbnail route.
4. Surface receipt renderer in the dispatch review section.
5. Run focused tests and make them pass.

### Task 5: Verify, commit, push, deploy

**Steps:**
1. Run `npm run lint`.
2. Run `npm test`.
3. Run `npm run build`.
4. Commit with a conventional commit message.
5. Push to `origin/main`.
6. Deploy Cloud Run.
7. Smoke-check homepage, admin login, and the new admin-only Typst thumbnail route unauthenticated.

# Prompt Policy Admin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated `Prompt Policy` admin module with versioned prompt management for `PYP`, `MYP`, and `DP`, while keeping `AI Connections` focused on infrastructure only.

**Architecture:** Reuse the existing editorial admin shell and backend-selection pattern. Add a prompt policy store with local JSON and Firestore implementations, expose admin-only API routes for CRUD-like actions, then render a list page and a detail/editor page inside the existing authenticated admin routes. Extend `Daily Briefs` to record prompt policy trace fields without changing its read-only nature.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Firestore Admin SDK, local JSON file persistence

---

### Task 1: Add the failing prompt policy store tests

**Files:**
- Create: `src/lib/prompt-policy-schema.ts`
- Create: `src/lib/prompt-policy-store-types.ts`
- Create: `src/lib/prompt-policy-store.test.ts`
- Create: `src/lib/prompt-policy-store.ts`

**Step 1: Write the failing tests**

Cover:

- empty store returns `[]`
- creating the first prompt policy makes it `active`
- activating a draft deactivates the previous active policy
- duplicating an active policy creates a new `draft`
- archiving a draft changes its status

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/prompt-policy-store.test.ts`

Expected: FAIL because the prompt policy store does not exist yet.

**Step 3: Write minimal implementation**

Add:

- record types
- status types
- store selection helper
- `list`, `get`, `create`, `update`, `activate`, `duplicate`, and `archive`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/prompt-policy-store.test.ts`

Expected: PASS

### Task 2: Add local and Firestore prompt policy store implementations

**Files:**
- Create: `src/lib/local-prompt-policy-store.ts`
- Create: `src/lib/firestore-prompt-policy-store.ts`
- Modify: `README.md`

**Step 1: Add local store**

Store path:

- `data/prompt-policies.json`
- optional env override `DAILY_SPARKS_PROMPT_POLICY_STORE_PATH`

**Step 2: Add Firestore store**

Collection:

- `editorialPromptPolicies`

**Step 3: Document the new store path**

Add a short README note for the new local override and the purpose of the
prompt policy registry.

**Step 4: Re-run store test**

Run: `npm test -- src/lib/prompt-policy-store.test.ts`

Expected: PASS

### Task 3: Add the failing API tests for prompt policy actions

**Files:**
- Create: `src/app/api/admin/prompt-policies/route.test.ts`
- Create: `src/app/api/admin/prompt-policies/activate/route.test.ts`
- Create: `src/app/api/admin/prompt-policies/duplicate/route.test.ts`
- Create: `src/app/api/admin/prompt-policies/archive/route.test.ts`

**Step 1: Write failing API tests**

Cover:

- unauthenticated requests return `401`
- `GET` returns prompt policies
- `POST` creates a new draft or initial active policy
- `PUT` updates a draft policy
- `activate` changes the active policy
- `duplicate` creates a new draft from an existing policy
- `archive` archives a draft

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/admin/prompt-policies/route.test.ts src/app/api/admin/prompt-policies/activate/route.test.ts src/app/api/admin/prompt-policies/duplicate/route.test.ts src/app/api/admin/prompt-policies/archive/route.test.ts`

Expected: FAIL because the routes do not exist yet.

### Task 4: Implement prompt policy API routes

**Files:**
- Create: `src/app/api/admin/prompt-policies/route.ts`
- Create: `src/app/api/admin/prompt-policies/activate/route.ts`
- Create: `src/app/api/admin/prompt-policies/duplicate/route.ts`
- Create: `src/app/api/admin/prompt-policies/archive/route.ts`

**Step 1: Reuse the existing admin auth guard**

Match the session requirements already used by:

- `src/app/api/admin/editorial-sources/route.ts`
- `src/app/api/admin/ai-connections/route.ts`

**Step 2: Implement request validation**

Validate:

- non-empty `name`
- non-empty `versionLabel`
- all instruction sections present when creating or saving drafts
- only drafts can be updated or archived

**Step 3: Implement action handlers**

Add:

- `GET`
- `POST`
- `PUT`
- `activate`
- `duplicate`
- `archive`

**Step 4: Run the API tests**

Run: `npm test -- src/app/api/admin/prompt-policies/route.test.ts src/app/api/admin/prompt-policies/activate/route.test.ts src/app/api/admin/prompt-policies/duplicate/route.test.ts src/app/api/admin/prompt-policies/archive/route.test.ts`

Expected: PASS

### Task 5: Add the failing admin UI tests

**Files:**
- Modify: `src/app/admin/editorial/editorial-admin-tabs.test.tsx`
- Create: `src/app/admin/editorial/prompt-policy/page.test.tsx`
- Create: `src/app/admin/editorial/prompt-policy/[policyId]/page.test.tsx`
- Create: `src/app/admin/editorial/prompt-policy/prompt-policy-panel.test.tsx`

**Step 1: Write failing tests**

Cover:

- admin tabs render `Prompt Policy`
- prompt policy list page shows empty state
- prompt policy list page renders an active policy card when data exists
- prompt policy detail page renders a resolved preview
- prompt policy panel shows draft editing actions and hides direct edit for active policy

**Step 2: Run targeted tests to verify they fail**

Run: `npm test -- src/app/admin/editorial/editorial-admin-tabs.test.tsx src/app/admin/editorial/prompt-policy/page.test.tsx src/app/admin/editorial/prompt-policy/[policyId]/page.test.tsx src/app/admin/editorial/prompt-policy/prompt-policy-panel.test.tsx`

Expected: FAIL because the prompt policy pages and panel do not exist yet.

### Task 6: Implement the prompt policy admin pages and panel

**Files:**
- Modify: `src/app/admin/editorial/editorial-admin-tabs.tsx`
- Modify: `src/app/admin/editorial/layout.tsx`
- Create: `src/app/admin/editorial/prompt-policy/page.tsx`
- Create: `src/app/admin/editorial/prompt-policy/[policyId]/page.tsx`
- Create: `src/app/admin/editorial/prompt-policy/prompt-policy-panel.tsx`

**Step 1: Add the fourth tab**

Label:

- `Prompt Policy`

Description:

- `Versioned PYP, MYP, and DP prompt rules`

**Step 2: Implement the list page**

Behavior:

- read from the prompt policy store
- show an honest empty state when no policies exist
- highlight the active policy
- list all policies with links to detail pages

**Step 3: Implement the detail/editor panel**

Behavior:

- render metadata and prompt sections
- for drafts, allow editing and saving
- for active policies, show `Duplicate as draft`
- render resolved previews for `PYP`, `MYP`, and `DP`

**Step 4: Run targeted UI tests**

Run: `npm test -- src/app/admin/editorial/editorial-admin-tabs.test.tsx src/app/admin/editorial/prompt-policy/page.test.tsx src/app/admin/editorial/prompt-policy/[policyId]/page.test.tsx src/app/admin/editorial/prompt-policy/prompt-policy-panel.test.tsx`

Expected: PASS

### Task 7: Extend Daily Brief traceability

**Files:**
- Modify: `src/lib/daily-brief-history-schema.ts`
- Modify: `src/lib/daily-brief-history-store.ts`
- Modify: `src/lib/local-daily-brief-history-store.ts`
- Modify: `src/lib/firestore-daily-brief-history-store.ts`
- Modify: `src/lib/daily-brief-history-store.test.ts`
- Modify: `src/app/admin/editorial/daily-briefs/page.test.tsx`
- Modify: `src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

**Step 1: Add the failing traceability assertions**

Cover:

- `promptPolicyId`
- `promptVersionLabel`

**Step 2: Run daily brief tests to verify they fail**

Run: `npm test -- src/lib/daily-brief-history-store.test.ts src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

Expected: FAIL because the new fields do not exist yet.

**Step 3: Add minimal trace fields**

Update schema, persistence, and detail rendering.

**Step 4: Re-run the targeted tests**

Run: `npm test -- src/lib/daily-brief-history-store.test.ts src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx`

Expected: PASS

### Task 8: Full verification and release

**Files:**
- Modify: any touched files above

**Step 1: Run full tests**

Run: `npm test`

**Step 2: Run focused lint**

Run: `npm run lint -- src/lib/prompt-policy-schema.ts src/lib/prompt-policy-store-types.ts src/lib/prompt-policy-store.ts src/lib/local-prompt-policy-store.ts src/lib/firestore-prompt-policy-store.ts src/lib/prompt-policy-store.test.ts src/app/api/admin/prompt-policies/route.ts src/app/api/admin/prompt-policies/route.test.ts src/app/api/admin/prompt-policies/activate/route.ts src/app/api/admin/prompt-policies/activate/route.test.ts src/app/api/admin/prompt-policies/duplicate/route.ts src/app/api/admin/prompt-policies/duplicate/route.test.ts src/app/api/admin/prompt-policies/archive/route.ts src/app/api/admin/prompt-policies/archive/route.test.ts src/app/admin/editorial/editorial-admin-tabs.tsx src/app/admin/editorial/editorial-admin-tabs.test.tsx src/app/admin/editorial/layout.tsx src/app/admin/editorial/prompt-policy/page.tsx src/app/admin/editorial/prompt-policy/page.test.tsx src/app/admin/editorial/prompt-policy/[policyId]/page.tsx src/app/admin/editorial/prompt-policy/[policyId]/page.test.tsx src/app/admin/editorial/prompt-policy/prompt-policy-panel.tsx src/app/admin/editorial/prompt-policy/prompt-policy-panel.test.tsx src/lib/daily-brief-history-schema.ts src/lib/daily-brief-history-store.ts src/lib/local-daily-brief-history-store.ts src/lib/firestore-daily-brief-history-store.ts src/lib/daily-brief-history-store.test.ts src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx README.md`

**Step 3: Run production build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add docs/plans/2026-04-02-prompt-policy-admin-design.md docs/plans/2026-04-02-prompt-policy-admin.md README.md src/lib/prompt-policy-schema.ts src/lib/prompt-policy-store-types.ts src/lib/prompt-policy-store.ts src/lib/local-prompt-policy-store.ts src/lib/firestore-prompt-policy-store.ts src/lib/prompt-policy-store.test.ts src/app/api/admin/prompt-policies/route.ts src/app/api/admin/prompt-policies/route.test.ts src/app/api/admin/prompt-policies/activate/route.ts src/app/api/admin/prompt-policies/activate/route.test.ts src/app/api/admin/prompt-policies/duplicate/route.ts src/app/api/admin/prompt-policies/duplicate/route.test.ts src/app/api/admin/prompt-policies/archive/route.ts src/app/api/admin/prompt-policies/archive/route.test.ts src/app/admin/editorial/editorial-admin-tabs.tsx src/app/admin/editorial/editorial-admin-tabs.test.tsx src/app/admin/editorial/layout.tsx src/app/admin/editorial/prompt-policy/page.tsx src/app/admin/editorial/prompt-policy/page.test.tsx src/app/admin/editorial/prompt-policy/[policyId]/page.tsx src/app/admin/editorial/prompt-policy/[policyId]/page.test.tsx src/app/admin/editorial/prompt-policy/prompt-policy-panel.tsx src/app/admin/editorial/prompt-policy/prompt-policy-panel.test.tsx src/lib/daily-brief-history-schema.ts src/lib/daily-brief-history-store.ts src/lib/local-daily-brief-history-store.ts src/lib/firestore-daily-brief-history-store.ts src/lib/daily-brief-history-store.test.ts src/app/admin/editorial/daily-briefs/page.test.tsx src/app/admin/editorial/daily-briefs/[briefId]/page.test.tsx
git commit -m "feat: add prompt policy admin"
```

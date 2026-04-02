# AI Connections Admin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an admin-managed AI connections registry with encrypted API keys, multiple saved connections, and one selectable default connection.

**Architecture:** Extend the existing admin backend with a separate AI-connections store and API. Metadata is persisted in local JSON or Firestore, while API keys are encrypted server-side with a dedicated encryption secret and only exposed to the UI as masked previews.

**Tech Stack:** Next.js app router, TypeScript, Vitest, Node crypto, local JSON, Firestore

---

### Task 1: Add failing tests for AI connection encryption and storage

**Files:**
- Create: `src/lib/ai-connection-crypto.test.ts`
- Create: `src/lib/ai-connection-store.test.ts`

**Step 1: Write the failing tests**

Require:

- API keys encrypt and decrypt with the configured secret
- previews mask the stored key
- local store can create, update, delete, and switch defaults
- replacing one default clears the previous default

**Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/ai-connection-crypto.test.ts src/lib/ai-connection-store.test.ts
```

### Task 2: Implement crypto and storage helpers

**Files:**
- Create: `src/lib/ai-connection-crypto.ts`
- Create: `src/lib/ai-connection-store.ts`
- Create: `src/lib/local-ai-connection-store.ts`
- Create: `src/lib/firestore-ai-connection-store.ts`

**Step 1: Add minimal implementation**

Implement:

- encryption / decryption helpers
- preview builder
- record types
- local JSON persistence
- Firestore persistence
- create / update / delete / set-default behavior

**Step 2: Run tests to verify they pass**

```bash
npm test -- src/lib/ai-connection-crypto.test.ts src/lib/ai-connection-store.test.ts
```

### Task 3: Add failing admin API tests

**Files:**
- Create: `src/app/api/admin/ai-connections/route.test.ts`

**Step 1: Write tests**

Require:

- unauthenticated requests are rejected
- admins can list connections
- admins can create a connection
- admins can update a connection and replace the key
- admins can delete a connection
- default switching leaves only one default

**Step 2: Run tests to verify failure**

```bash
npm test -- src/app/api/admin/ai-connections/route.test.ts
```

### Task 4: Implement the AI connections admin API

**Files:**
- Create: `src/app/api/admin/ai-connections/route.ts`

**Step 1: Add route handlers**

Implement:

- admin-cookie authorization
- request validation
- encrypted create and update flow
- delete handling
- default switching rules

**Step 2: Run tests to verify pass**

```bash
npm test -- src/app/api/admin/ai-connections/route.test.ts
```

### Task 5: Render AI connections in the admin page

**Files:**
- Modify: `src/app/admin/editorial/page.tsx`
- Modify: `src/app/admin/editorial/page.test.tsx`
- Modify: `src/app/admin/editorial/editorial-admin-panel.test.tsx`
- Create: `src/app/admin/editorial/ai-connections-panel.tsx`
- Create: `src/app/admin/editorial/ai-connections-panel.test.tsx`

**Step 1: Add the UI**

Implement:

- create form with default base URL and model
- existing connection cards
- masked key preview
- replace-key field
- active / default badges
- delete button

**Step 2: Run render tests**

```bash
npm test -- src/app/admin/editorial/page.test.tsx src/app/admin/editorial/editorial-admin-panel.test.tsx src/app/admin/editorial/ai-connections-panel.test.tsx
```

### Task 6: Document the new admin capability

**Files:**
- Modify: `README.md`

**Step 1: Document**

Document:

- new AI connections admin module
- new encryption secret env var
- local store override path
- note that API keys are masked after save

### Task 7: Run full verification

```bash
npm test
npm run lint -- src/lib/ai-connection-crypto.ts src/lib/ai-connection-crypto.test.ts src/lib/ai-connection-store.ts src/lib/ai-connection-store.test.ts src/lib/local-ai-connection-store.ts src/lib/firestore-ai-connection-store.ts src/app/api/admin/ai-connections/route.ts src/app/api/admin/ai-connections/route.test.ts src/app/admin/editorial/ai-connections-panel.tsx src/app/admin/editorial/ai-connections-panel.test.tsx src/app/admin/editorial/page.tsx src/app/admin/editorial/page.test.tsx README.md
npm run build
```

### Task 8: Commit

```bash
git add docs/plans/2026-04-02-ai-connections-admin-design.md docs/plans/2026-04-02-ai-connections-admin.md README.md src/lib/ai-connection-crypto.ts src/lib/ai-connection-crypto.test.ts src/lib/ai-connection-store.ts src/lib/ai-connection-store.test.ts src/lib/local-ai-connection-store.ts src/lib/firestore-ai-connection-store.ts src/app/api/admin/ai-connections/route.ts src/app/api/admin/ai-connections/route.test.ts src/app/admin/editorial/ai-connections-panel.tsx src/app/admin/editorial/ai-connections-panel.test.tsx src/app/admin/editorial/page.tsx src/app/admin/editorial/page.test.tsx
git commit -m "feat: add admin AI connection registry"
```

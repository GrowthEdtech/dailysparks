# AI Connections Safety And Ops Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `AI connections` into a safe operational control layer with provider-aware validation, test connection support, explicit fallback, and connection-level health visibility.

**Architecture:** Keep one shared admin registry, but extend the connection record with fallback and health metadata. Route default runtime generation through a shared helper that tries the default connection first, optionally retries on a configured fallback connection, and writes health evidence back to the connection record.

**Tech Stack:** Next.js app router, TypeScript, Vitest, local JSON / Firestore stores, existing Vertex/OpenAI-compatible runtime helpers

---

### Task 1: Add failing tests for validation, fallback, and visibility

**Files:**
- Modify: `src/lib/ai-connection-store.test.ts`
- Modify: `src/app/api/admin/ai-connections/route.test.ts`
- Modify: `src/app/admin/editorial/ai-connections-panel.test.tsx`
- Modify: `src/lib/ai-runtime.test.ts`
- Create: `src/app/api/admin/ai-connections/test/route.test.ts`

**Step 1: Write the failing tests**

Add tests that require:

- invalid provider transitions to be rejected
- vertex connections to require full auth config
- fallback connection IDs to persist safely
- test-connection metadata to update after a successful or failed test
- runtime fallback to use a configured secondary connection
- panel markup to show fallback and connection health

**Step 2: Run focused tests and confirm failure**

```bash
npm test -- src/lib/ai-connection-store.test.ts src/app/api/admin/ai-connections/route.test.ts src/app/api/admin/ai-connections/test/route.test.ts src/lib/ai-runtime.test.ts src/app/admin/editorial/ai-connections-panel.test.tsx
```

### Task 2: Extend AI connection record schema and store metadata

**Files:**
- Modify: `src/lib/ai-connection-schema.ts`
- Modify: `src/lib/ai-connection-store-types.ts`
- Modify: `src/lib/ai-connection-store.ts`
- Modify: `src/lib/local-ai-connection-store.ts`
- Modify: `src/lib/firestore-ai-connection-store.ts`

**Step 1: Add fallback and health fields**

Implement:

- `fallbackConnectionId`
- `lastTest*`
- `lastRuntime*`
- runtime success / failure / fallback counters

Add store helpers for:

- fetch by id with secret
- runtime policy resolution
- health metadata updates

**Step 2: Run store tests**

```bash
npm test -- src/lib/ai-connection-store.test.ts
```

### Task 3: Harden admin validation rules

**Files:**
- Modify: `src/app/api/admin/ai-connections/route.ts`
- Create: `src/lib/ai-connection-validation.ts`

**Step 1: Add provider-aware validation**

Enforce:

- `openai-compatible` requires `baseUrl + apiKey` on create
- switching into `openai-compatible` requires a new API key
- `vertex-openai-compatible` requires `projectId + location + defaultModel + serviceAccountEmail`
- fallback target must exist, be active, and not self
- invalid connections cannot become default

**Step 2: Run route tests**

```bash
npm test -- src/app/api/admin/ai-connections/route.test.ts
```

### Task 4: Add test-connection execution path

**Files:**
- Create: `src/app/api/admin/ai-connections/test/route.ts`
- Create: `src/lib/ai-connection-test.ts`
- Modify: `src/lib/ai-runtime.ts`

**Step 1: Implement a reusable connection test helper**

The helper should:

- load a specific connection
- run a tiny deterministic prompt
- measure latency
- return success/failure with model
- update `lastTest*` metadata

**Step 2: Run route and runtime tests**

```bash
npm test -- src/app/api/admin/ai-connections/test/route.test.ts src/lib/ai-runtime.test.ts
```

### Task 5: Add default fallback runtime policy

**Files:**
- Modify: `src/lib/ai-runtime.ts`
- Modify: `src/lib/daily-brief-orchestrator.ts`
- Modify: `src/lib/geo-monitoring.ts`

**Step 1: Implement shared fallback execution**

Add a helper that:

- loads default connection plus configured fallback target
- tries default once
- falls back once on failure
- records runtime health metadata
- returns the actual connection used

Update:

- `daily-brief-orchestrator`
- `geo-monitoring` default chatgpt-search path

to use this helper.

**Step 2: Run focused integration tests**

```bash
npm test -- src/lib/ai-runtime.test.ts src/lib/daily-brief-orchestrator.test.ts src/lib/geo-monitoring.test.ts
```

### Task 6: Add admin ops visibility

**Files:**
- Create: `src/lib/ai-connection-ops.ts`
- Create: `src/lib/ai-connection-ops.test.ts`
- Modify: `src/app/admin/editorial/ai-connections/page.tsx`
- Modify: `src/app/admin/editorial/ai-connections-panel.tsx`
- Modify: `src/app/admin/editorial/ai-connections-panel.test.tsx`

**Step 1: Build ops snapshot**

Derive:

- recent Daily Brief usage count per connection
- last used timestamp
- default / fallback summary
- test and runtime health labels

**Step 2: Render the ops controls and visibility**

Add:

- `Test connection` button
- fallback selector
- health summary strip
- per-connection health and usage details

**Step 3: Run UI and helper tests**

```bash
npm test -- src/lib/ai-connection-ops.test.ts src/app/admin/editorial/ai-connections-panel.test.tsx
```

### Task 7: Run full verification

```bash
npm run lint -- src/lib/ai-connection-schema.ts src/lib/ai-connection-store-types.ts src/lib/ai-connection-store.ts src/lib/local-ai-connection-store.ts src/lib/firestore-ai-connection-store.ts src/lib/ai-connection-validation.ts src/lib/ai-connection-test.ts src/lib/ai-connection-ops.ts src/lib/ai-runtime.ts src/lib/ai-runtime.test.ts src/lib/ai-connection-store.test.ts src/lib/ai-connection-ops.test.ts src/app/api/admin/ai-connections/route.ts src/app/api/admin/ai-connections/route.test.ts src/app/api/admin/ai-connections/test/route.ts src/app/api/admin/ai-connections/test/route.test.ts src/app/admin/editorial/ai-connections/page.tsx src/app/admin/editorial/ai-connections-panel.tsx src/app/admin/editorial/ai-connections-panel.test.tsx src/lib/daily-brief-orchestrator.ts src/lib/geo-monitoring.ts
npm test
npm run build
```

### Task 8: Commit

```bash
git add docs/plans/2026-04-09-ai-connections-safety-design.md docs/plans/2026-04-09-ai-connections-safety.md src/lib/ai-connection-schema.ts src/lib/ai-connection-store-types.ts src/lib/ai-connection-store.ts src/lib/local-ai-connection-store.ts src/lib/firestore-ai-connection-store.ts src/lib/ai-connection-validation.ts src/lib/ai-connection-test.ts src/lib/ai-connection-ops.ts src/lib/ai-runtime.ts src/lib/ai-connection-store.test.ts src/lib/ai-runtime.test.ts src/lib/ai-connection-ops.test.ts src/app/api/admin/ai-connections/route.ts src/app/api/admin/ai-connections/route.test.ts src/app/api/admin/ai-connections/test/route.ts src/app/api/admin/ai-connections/test/route.test.ts src/app/admin/editorial/ai-connections/page.tsx src/app/admin/editorial/ai-connections-panel.tsx src/app/admin/editorial/ai-connections-panel.test.tsx src/lib/daily-brief-orchestrator.ts src/lib/geo-monitoring.ts
git commit -m "feat: harden ai connection ops controls"
```

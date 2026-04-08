# Vertex AI AI Connections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a first-class Vertex AI connection type that can become the default admin-managed AI connection while preserving the existing GPT-5.4 relay connection as a switchable fallback.

**Architecture:** Extend the current provider registry into a provider-aware store and UI. Keep the shared OpenAI-compatible HTTP request shape, but route authentication by provider: stored API key for relay connections and ADC / optional service-account impersonation for Vertex connections.

**Tech Stack:** Next.js app router, TypeScript, Vitest, local JSON, Firestore, Google Auth Library, Vertex AI OpenAI-compatible endpoint

---

### Task 1: Add failing tests for provider-aware AI connection records

**Files:**
- Modify: `src/lib/ai-connection-store.test.ts`
- Modify: `src/app/api/admin/ai-connections/route.test.ts`
- Modify: `src/app/admin/editorial/ai-connections-panel.test.tsx`
- Create: `src/lib/ai-runtime.test.ts`

**Step 1: Write the failing tests**

Add tests that require:

- creating a `vertex-openai-compatible` connection without an API key
- deriving the Vertex base URL from `projectId + location`
- preserving `serviceAccountEmail` in the stored record
- switching the default from GPT-5.4 relay to Vertex
- rendering Vertex-specific fields in the admin panel
- generating runtime auth headers correctly for both provider types

**Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/ai-connection-store.test.ts src/app/api/admin/ai-connections/route.test.ts src/app/admin/editorial/ai-connections-panel.test.tsx src/lib/ai-runtime.test.ts
```

### Task 2: Extend the schema and stores for Vertex metadata

**Files:**
- Modify: `src/lib/ai-connection-schema.ts`
- Modify: `src/lib/ai-connection-store-types.ts`
- Modify: `src/lib/ai-connection-store.ts`
- Modify: `src/lib/local-ai-connection-store.ts`
- Modify: `src/lib/firestore-ai-connection-store.ts`

**Step 1: Implement provider-aware record types**

Add:

- `vertex-openai-compatible` provider type
- Vertex defaults
- optional `vertexProjectId`
- optional `vertexLocation`
- optional `serviceAccountEmail`

Update store create / update logic so:

- OpenAI-compatible records still require encrypted API keys
- Vertex records clear key fields and derive their base URL from project + location
- default switching semantics remain unchanged

**Step 2: Run the focused storage tests**

```bash
npm test -- src/lib/ai-connection-store.test.ts
```

### Task 3: Implement provider-aware admin API validation

**Files:**
- Modify: `src/app/api/admin/ai-connections/route.ts`

**Step 1: Add provider-specific validation**

Implement:

- `openai-compatible` create / update validation
- `vertex-openai-compatible` create / update validation
- derived Vertex base URL construction
- ignoring any pasted token-like field for Vertex auth

**Step 2: Run API tests**

```bash
npm test -- src/app/api/admin/ai-connections/route.test.ts
```

### Task 4: Implement Vertex auth in the AI runtime

**Files:**
- Modify: `src/lib/ai-runtime.ts`
- Create: `src/lib/vertex-ai-auth.ts`
- Create: `src/lib/vertex-ai-auth.test.ts`
- Modify: `package.json`

**Step 1: Add Google auth support**

Implement:

- ADC token acquisition
- optional service-account impersonation when `serviceAccountEmail` exists
- shared `Bearer` token builder used by the OpenAI-compatible HTTP path

Add `google-auth-library` as a direct dependency.

**Step 2: Run runtime tests**

```bash
npm test -- src/lib/ai-runtime.test.ts src/lib/vertex-ai-auth.test.ts
```

### Task 5: Upgrade the admin UI for Vertex connections

**Files:**
- Modify: `src/app/admin/editorial/ai-connections-panel.tsx`

**Step 1: Add provider-aware form rendering**

Implement:

- provider switcher with `OpenAI-compatible` and `Vertex AI (Google Cloud)`
- Vertex-only fields:
  - project ID
  - location
  - service account email
- derived endpoint preview for Vertex
- hidden API key field for Vertex
- clear managed-auth copy
- retain active/default toggles and rollback-friendly connection cards

**Step 2: Run panel tests**

```bash
npm test -- src/app/admin/editorial/ai-connections-panel.test.tsx
```

### Task 6: Verify runtime consumers still resolve the default connection

**Files:**
- Modify: `src/lib/daily-brief-orchestrator.ts`
- Modify: `src/lib/geo-monitoring.ts`

**Step 1: Tighten type usage only where needed**

Ensure:

- the orchestrator still accepts the default connection regardless of provider type
- GEO monitoring keeps using the default AI connection without assuming a stored API key

Keep the shared call path lean; do not redesign prompt or model policy in this batch.

**Step 2: Run the focused integration tests**

```bash
npm test -- src/lib/daily-brief-orchestrator.test.ts src/lib/geo-monitoring.test.ts
```

### Task 7: Document production prerequisites and admin behavior

**Files:**
- Modify: `README.md`

**Step 1: Add operator notes**

Document:

- Vertex provider availability in admin
- required GCP IAM / API prerequisites
- recommended default model
- note that Google-managed auth is used instead of a stored API key

### Task 8: Run full verification

```bash
npm run lint -- src/lib/ai-connection-schema.ts src/lib/ai-connection-store-types.ts src/lib/ai-connection-store.ts src/lib/local-ai-connection-store.ts src/lib/firestore-ai-connection-store.ts src/lib/ai-runtime.ts src/lib/vertex-ai-auth.ts src/lib/vertex-ai-auth.test.ts src/lib/ai-runtime.test.ts src/app/api/admin/ai-connections/route.ts src/app/api/admin/ai-connections/route.test.ts src/app/admin/editorial/ai-connections-panel.tsx src/app/admin/editorial/ai-connections-panel.test.tsx README.md
npm test
npm run build
```

### Task 9: Commit

```bash
git add docs/plans/2026-04-09-vertex-ai-ai-connections-design.md docs/plans/2026-04-09-vertex-ai-ai-connections.md README.md package.json src/lib/ai-connection-schema.ts src/lib/ai-connection-store-types.ts src/lib/ai-connection-store.ts src/lib/local-ai-connection-store.ts src/lib/firestore-ai-connection-store.ts src/lib/ai-runtime.ts src/lib/vertex-ai-auth.ts src/lib/vertex-ai-auth.test.ts src/lib/ai-runtime.test.ts src/app/api/admin/ai-connections/route.ts src/app/api/admin/ai-connections/route.test.ts src/app/admin/editorial/ai-connections-panel.tsx src/app/admin/editorial/ai-connections-panel.test.tsx
git commit -m "feat: add vertex ai connection provider"
```

# AI Connections Safety And Ops Design

## Goal

Harden the admin `AI connections` layer so operators can safely switch between `Vertex` and `GPT-5.4`, verify a connection before using it, fall back when the default runtime fails, and see enough connection health evidence in admin to operate the system confidently.

## Problem

The current `AI connections` registry is good enough for basic CRUD, but it is not yet a production safety layer.

Current gaps:

- invalid provider transitions can be saved into the registry
- operators cannot run a first-class `test connection`
- the default runtime path has no explicit fallback policy
- the admin page shows saved connections, but not whether they are healthy, recently used, or ready for rollback

That creates a brittle operating surface now that `Vertex` is the default connection and `GPT-5.4` remains the rollback path.

## Product Decision

Keep one shared `AI connections` page, but upgrade it from a registry into a lightweight control plane with four capabilities:

1. provider-aware validation hardening
2. explicit `test connection`
3. configurable fallback target for the default connection
4. connection-level health and recent usage visibility

## Scope

This batch covers:

- `openai-compatible` and `vertex-openai-compatible` validation hardening
- a new admin test route and button
- runtime fallback from the default connection to an explicitly configured fallback connection
- connection-level health metadata and recent `Daily Brief` usage visibility in admin

This batch does **not** cover:

- automatic fallback based on rolling failure thresholds
- new background health-check schedulers
- per-connection GEO run attribution in stored GEO run records
- deleting or replacing the existing relay-backed GPT connection

## Recommended Approach

### 1. Make connection validity explicit and provider-aware

Validation should no longer be “best effort”.

Rules:

- `openai-compatible`
  - requires `name`
  - requires `baseUrl`
  - requires `defaultModel`
  - requires a stored API key when creating
  - when switching **into** this provider type, update must also provide a fresh API key
- `vertex-openai-compatible`
  - requires `name`
  - requires `vertexProjectId`
  - requires `vertexLocation`
  - requires `defaultModel`
  - requires `serviceAccountEmail`
  - derives `baseUrl` from project + location
  - never stores a static API key

This validation must run in both the admin route and the store layer, so invalid states cannot be created by either UI requests or direct helper usage in tests and scripts.

### 2. Add an explicit fallback target to each connection

Every connection may declare an optional `fallbackConnectionId`.

Rules:

- fallback target must not point to self
- fallback target must exist
- fallback target must be `active`
- fallback should only be attempted when the current connection is both `active` and `default`

This keeps fallback operator-controlled instead of guessing “first other active connection”.

### 3. Keep runtime fallback lean and explicit

`Daily Brief` generation and default `ChatGPT-search` style GEO checks should use one shared runtime helper:

- load default connection
- attempt default generation
- if it fails and a fallback target is configured, attempt the fallback connection once
- return the actual connection used

If fallback succeeds:

- the application continues
- the result records the fallback connection as the one actually used
- the default connection health is marked failed
- the fallback connection health is marked successful with `fallbackUsed = true`

If both attempts fail:

- surface a combined error
- do not silently swallow the first failure

### 4. Record connection health as mutable operational metadata

Each connection record should store lightweight operational health fields:

- `fallbackConnectionId`
- `lastTestedAt`
- `lastTestStatus`
- `lastTestLatencyMs`
- `lastTestModel`
- `lastTestErrorMessage`
- `lastRuntimeAt`
- `lastRuntimeStatus`
- `lastRuntimeLatencyMs`
- `lastRuntimeModel`
- `lastRuntimeErrorMessage`
- `runtimeSuccessCount`
- `runtimeFailureCount`
- `runtimeFallbackCount`
- `lastFallbackAt`

This is not immutable event history; it is a current ops snapshot per connection.

### 5. Add a first-class admin `Test connection`

Operators should be able to test one connection without changing the default.

The test should:

- load the requested connection with its runtime auth
- run a tiny plain-text completion prompt
- return:
  - success / failure
  - resolved model
  - latency
  - concise error message when failed
- update the connection’s `lastTest*` metadata

The prompt should be deterministic and small, for example:

- developer: “Return a short connection test response.”
- user: “Reply exactly with: Daily Sparks AI connection test OK.”

### 6. Surface ops visibility on the same admin page

The AI connections page should show:

- current default connection
- configured fallback target, if any
- last test result
- last runtime result
- success / failure / fallback counters
- recent `Daily Brief` usage count and last-used timestamp

Recent usage can be derived from `Daily Brief` history because it already stores:

- `aiConnectionId`
- `aiConnectionName`
- `aiModel`
- `scheduledFor`
- `updatedAt`

That is enough for a first meaningful `ops visibility` layer without introducing a new event store.

## Data Model

Extend `AiConnectionRecord` and `StoredAiConnectionRecord` with:

- `fallbackConnectionId?: string`
- `lastTestedAt?: string | null`
- `lastTestStatus?: "success" | "failed" | null`
- `lastTestLatencyMs?: number | null`
- `lastTestModel?: string | null`
- `lastTestErrorMessage?: string | null`
- `lastRuntimeAt?: string | null`
- `lastRuntimeStatus?: "success" | "failed" | "fallback-succeeded" | null`
- `lastRuntimeLatencyMs?: number | null`
- `lastRuntimeModel?: string | null`
- `lastRuntimeErrorMessage?: string | null`
- `runtimeSuccessCount: number`
- `runtimeFailureCount: number`
- `runtimeFallbackCount: number`
- `lastFallbackAt?: string | null`

## Admin UI Changes

### Connection form

Add:

- fallback connection selector

Keep:

- provider-aware fields
- active / default toggle
- notes

### Connection card

Show:

- current fallback target
- latest test result
- latest runtime result
- success / failure / fallback counters
- recent brief usage stats

### Top summary

Show a compact ops row:

- default connection
- active connections
- fallback-ready connections
- recent brief usage window

## API Shape

Retain the existing CRUD route:

- `GET /api/admin/ai-connections`
- `POST /api/admin/ai-connections`
- `PUT /api/admin/ai-connections`
- `DELETE /api/admin/ai-connections`

Add:

- `POST /api/admin/ai-connections/test`

The test route should require editorial admin auth and return:

- `success`
- `connection`
- `latencyMs`
- `resolvedModel`
- `message`

## Runtime Integration

Replace direct “load default then call model” flows with one shared helper in `ai-runtime`:

- `generateTextWithDefaultAiConnectionPolicy(...)`

This helper should be used by:

- `daily-brief-orchestrator`
- `geo-monitoring` default chatgpt-search path

## Testing Strategy

Add red-first tests for:

- store validation and fallback metadata persistence
- admin CRUD validation hardening
- admin test route
- runtime fallback behavior
- panel rendering of fallback + health + usage

Then run:

- focused tests
- full `npm test`
- `npm run lint`
- `npm run build`


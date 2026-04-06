# GEO Copilot Scheduled Monitoring Design

## Goal

Turn the current admin-only `GEO Copilot` workspace into a real monitoring system that:

- runs on a scheduler without admin intervention
- writes immutable monitoring run evidence
- creates `visibility logs` automatically from successful engine checks
- auto-checks `llms.txt`, `llms-full.txt`, SSR, and JSON-LD readiness
- lets editors trigger an on-demand monitoring run from the admin UI

This phase keeps the scope deliberately practical:

- support real automated runs for configured engines
- record unsupported or unconfigured engines as explicit `skipped` evidence
- keep manual log entry available for backfill and operator notes
- avoid a full AI-provider connection-management redesign in this batch

## Product Positioning

The existing GEO admin page is strong as an operator dashboard, but it is still a manual workspace. The user’s request is to make the system actually monitor on a plan and automatically feed the evidence layer. That means the right primitive is not “more charts”; it is a real scheduled pipeline with observable runs.

## Recommended Approach

### Approach A — Scheduler + Run Store + Automated Engine Checks

Add an internal scheduler route, a reusable monitoring runner, immutable run history, and a manual admin trigger that uses the same runner.

Pros:

- real automation, not pseudo-automation
- easy to audit when runs succeed, partially succeed, or skip
- admin and scheduler paths share exactly one execution path
- preserves the current GEO Copilot UI investment

Cons:

- requires new store/schema work
- requires a careful “configured vs unsupported” engine policy

### Approach B — Admin Trigger Only

Let operators click `Run now`, but do not add scheduler integration yet.

Pros:

- simpler
- lower deployment risk

Cons:

- still not true monitoring automation
- does not satisfy the PRD’s orchestration layer intent

### Approach C — Full Multi-Provider Connection Management First

Redesign `AI Connections` before building monitoring.

Pros:

- cleaner long-term provider management

Cons:

- significantly larger scope
- delays the value of scheduled monitoring

## Recommendation

Choose **Approach A** now, while keeping provider configuration deliberately lightweight for this phase.

That means:

- scheduled route for monitoring
- immutable `monitoring runs`
- auto-generated `visibility logs`
- machine-readability checks
- manual admin trigger
- engine adapters that either run or explicitly mark `skipped`

## Architecture

### 1. Monitoring Runner

Add a shared library module that:

- loads active golden prompts
- expands each prompt using `fanOutHints`
- runs checks per engine
- updates machine-readability status
- writes `GeoMonitoringRunRecord`
- writes `GeoVisibilityLogRecord` for successful engine responses

The runner should return a structured summary that both scheduler and admin routes can display.

### 2. Immutable Monitoring Runs

Add a new run history store for GEO monitoring, similar to the project’s existing history/audit patterns. Each run records:

- run source: `scheduled` or `manual`
- start and finish timestamps
- status: `completed`, `partial`, or `failed`
- active prompt count
- expanded query count
- engine attempt counts
- created log count
- skipped count
- machine-readability snapshot
- notes and error summary

### 3. Visibility Log Enrichment

Extend visibility logs with optional provenance fields so operators can distinguish:

- manually entered evidence
- scheduled monitoring evidence
- admin-triggered on-demand evidence

Add optional fields:

- `source`
- `monitoringRunId`
- `queryVariant`
- `engineModel`

### 4. Engine Execution Policy

This phase should support real execution for engines that are configured, and explicit `skipped` evidence otherwise.

Policy:

- `chatgpt-search`, `gemini`, `claude`, `perplexity`: run if configured
- `google-ai-overviews`: mark as unsupported/skipped for now

The project already has an `openai-compatible` runtime and generic AI connection pattern. For this phase:

- use existing generic runtime utilities where practical
- keep engine-specific runtime configuration in environment-backed helpers
- do not redesign the admin AI connection model in this batch

### 5. Machine-Readability Layer

The monitor should not only assess readiness but also verify concrete public endpoints.

This phase should add:

- `/llms.txt`
- `/llms-full.txt`
- baseline `Organization` JSON-LD in the public site shell

Then the runner checks:

- `llms.txt` returns `200` and useful markdown
- `llms-full.txt` returns `200` and useful markdown
- SSR fetch returns meaningful HTML content
- JSON-LD exists in public HTML

### 6. Admin Integration

The existing `GEO Copilot` page should gain:

- `Monitoring automation` summary card
- latest run status
- recent run timeline
- `Run monitoring now` action

The page should continue to support manual log entry, but that section becomes a secondary backfill tool instead of the primary evidence path.

## Error Handling

- If no active prompts exist, the run should complete with `0` work, not fail.
- If an engine is unsupported or unconfigured, record it as skipped.
- If some engines succeed and others fail, the run becomes `partial`.
- If the whole run crashes before any meaningful work completes, mark it `failed`.

## Security

- scheduler route uses the existing scheduler secret header pattern
- admin run route uses existing editorial admin session auth
- no decrypted provider credentials are exposed to the client

## Testing Strategy

Add tests for:

- prompt fan-out expansion
- machine-readability checks
- run status aggregation
- scheduler route auth
- admin manual run route auth
- GEO Copilot page rendering new monitoring sections
- `llms.txt` and `llms-full.txt` routes
- root layout JSON-LD presence

## Rollout Notes

This phase delivers a real automated GEO runner without claiming that every target engine is already fully production-configured. The system is considered successful when:

- scheduled monitoring can run automatically
- admin can trigger the same runner on demand
- logs are created automatically for successful checks
- unsupported/unconfigured engines are visible as explicit run evidence
- machine-readability status is refreshed by code, not by manual toggling alone

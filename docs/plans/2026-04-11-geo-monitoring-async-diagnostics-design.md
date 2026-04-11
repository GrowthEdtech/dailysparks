# GEO Monitoring Async Job + Query Diagnostics Design

## Goal

Manual GEO monitoring from the admin workspace should return quickly and continue in the background, while every engine/query attempt leaves enough diagnostics for operators to understand which prompts are working, timing out, skipped, or failing.

## Decisions

1. Admin-triggered monitoring uses a two-step run lifecycle: create a `running` run record immediately, then execute the heavy monitoring work after the response using Next.js `after()`.
2. Scheduled/internal monitoring remains synchronous so Cloud Scheduler and operations health can continue to receive a final run summary in one request.
3. `GeoMonitoringRunRecord` stores `queryDiagnostics[]` alongside aggregate counts. Each diagnostic captures prompt, query variant, engine, outcome, duration, mention/sentiment when available, citation count, reason, and linked visibility log id.
4. Existing historical run records normalize missing diagnostics to an empty array for backward compatibility.
5. The admin UI accepts both async and sync responses. Async responses add a `running` run card immediately; final results appear after refresh once the background job updates the same run id.

## Error Handling

If the background job throws before producing a final run, the queued run is updated to `failed` with a short operator-readable note. Per-query timeouts and adapter failures remain non-fatal and are represented as `failed` diagnostics plus aggregate `partial`/`failed` run status.

## Testing

Coverage is centered on:

1. Run-store create/update normalization with query diagnostics.
2. Runner-level diagnostics for successful and timed-out engine attempts.
3. Admin API response semantics: authenticated manual trigger returns `202`, creates a `running` run, and schedules the background job with update-mode persistence.
4. UI rendering and response handling for async in-progress runs and query-level diagnostic rows.

# Daily Brief Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the smallest production-ready Daily Sparks automation chain that can ingest source candidates, generate programme-aware daily briefs, deliver them through configured channels, and record history on a daily schedule.

**Architecture:** Reuse the existing Cloud Run web service as the first automation runtime. Add a scheduler-authenticated internal API route that orchestrates ingestion, programme-aware generation, delivery, and history recording. Keep the first release feed-first, one-topic-per-day, and history-first so the team can observe the system before adding heavier editorial workflow.

**Tech Stack:** Next.js route handlers, TypeScript, Firestore/local store pattern, native `fetch`, Cloud Scheduler, Nodemailer, existing Notion integration

---

### Task 1: Add eligible delivery profile discovery

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/profile-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/local-profile-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/firestore-profile-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/mvp-store.ts`
- Test: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/mvp-store.test.ts`

**Step 1: Write the failing test**

Add a test that creates several parent profiles and verifies `listEligibleDeliveryProfiles()` only returns records that:
- have `subscriptionStatus` of `trial` or `active`
- have at least one ready delivery channel
- preserve the student `programme` for later generation grouping

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/mvp-store.test.ts`
Expected: FAIL because `listEligibleDeliveryProfiles` does not exist yet.

**Step 3: Write minimal implementation**

Add a store-level method that returns profiles filtered by:
- `subscriptionStatus === 'trial' || subscriptionStatus === 'active'`
- `student.goodnotesConnected === true || student.notionConnected === true`

Export the helper from `mvp-store.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/mvp-store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/profile-store.ts src/lib/local-profile-store.ts src/lib/firestore-profile-store.ts src/lib/mvp-store.ts src/lib/mvp-store.test.ts
git commit -m "feat: add eligible delivery profile discovery"
```

### Task 2: Add runtime selectors for active prompt policy and default AI connection

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/ai-connection-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/ai-connection-store.test.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/prompt-policy-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/prompt-policy-store.test.ts`

**Step 1: Write the failing tests**

Add tests covering:
- `getDefaultAiConnection()` returns the one default active connection
- `getDefaultAiConnectionWithSecret()` returns decrypted API key material
- `getActivePromptPolicy()` returns the active prompt policy
- null is returned when nothing is configured

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/ai-connection-store.test.ts src/lib/prompt-policy-store.test.ts`
Expected: FAIL because runtime selectors do not exist yet.

**Step 3: Write minimal implementation**

Add read helpers that:
- find the active default AI connection
- decrypt the stored API key only on the server
- find the single active prompt policy

Do not change admin behavior or existing list/update flows.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/ai-connection-store.test.ts src/lib/prompt-policy-store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/ai-connection-store.ts src/lib/ai-connection-store.test.ts src/lib/prompt-policy-store.ts src/lib/prompt-policy-store.test.ts
git commit -m "feat: add daily brief runtime selectors"
```

### Task 3: Add scheduler auth and daily run preflight route

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-run-auth.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-run-auth.test.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/run/route.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/run/route.test.ts`

**Step 1: Write the failing tests**

Cover:
- missing scheduler secret returns `503`
- missing or wrong auth header returns `401`
- valid request returns a structured preflight summary
- response includes blockers for missing AI connection or prompt policy

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/daily-brief-run-auth.test.ts src/app/api/internal/daily-brief/run/route.test.ts`
Expected: FAIL because the auth helper and route do not exist yet.

**Step 3: Write minimal implementation**

Add:
- env-backed scheduler secret validation
- `POST /api/internal/daily-brief/run`
- route logic that gathers:
  - eligible profiles
  - active sources
  - default AI connection
  - active prompt policy
  - latest history count
- return a machine-readable preflight payload plus blockers

This first route should be safe for dry runs and not deliver content yet.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/daily-brief-run-auth.test.ts src/app/api/internal/daily-brief/run/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/daily-brief-run-auth.ts src/lib/daily-brief-run-auth.test.ts src/app/api/internal/daily-brief/run/route.ts src/app/api/internal/daily-brief/run/route.test.ts
git commit -m "feat: add daily brief scheduler preflight route"
```

### Task 4: Add feed-first source ingestion

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/editorial-feed-registry.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/source-ingestion.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/source-ingestion.test.ts`

**Step 1: Write the failing tests**

Cover:
- supported sources resolve to feed targets
- ingestion normalizes candidate items
- duplicate candidate URLs/titles are removed
- inactive sources are ignored

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/source-ingestion.test.ts`
Expected: FAIL because ingestion helpers do not exist yet.

**Step 3: Write minimal implementation**

Implement a feed-first ingestion helper that:
- reads active editorial sources
- fetches configured feed endpoints
- maps results into normalized candidate records
- deduplicates by normalized URL/title

Keep first release metadata-only.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/source-ingestion.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/editorial-feed-registry.ts src/lib/source-ingestion.ts src/lib/source-ingestion.test.ts
git commit -m "feat: add source ingestion for daily briefs"
```

### Task 5: Add programme-aware generation runtime

**Files:**
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/ai-runtime.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/brief-selector.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-orchestrator.ts`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-orchestrator.test.ts`

**Step 1: Write the failing tests**

Cover:
- one topic cluster is chosen for the day
- only programmes with eligible recipients are generated
- prompts are resolved from shared + anti-repetition + programme + output contract
- duplicate generation is skipped when history already has a published record for the date/programme

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/daily-brief-orchestrator.test.ts`
Expected: FAIL because orchestration does not exist yet.

**Step 3: Write minimal implementation**

Implement:
- candidate selection
- active prompt policy resolution
- OpenAI-compatible request execution through the default AI connection
- normalized brief result objects ready for history + delivery

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/daily-brief-orchestrator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/ai-runtime.ts src/lib/brief-selector.ts src/lib/daily-brief-orchestrator.ts src/lib/daily-brief-orchestrator.test.ts
git commit -m "feat: add daily brief generation runtime"
```

### Task 6: Turn test delivery into real daily delivery helpers

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/goodnotes-delivery.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/goodnotes-delivery.test.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/notion.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/notion-config.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/notion-config.test.ts`

**Step 1: Write the failing tests**

Add tests for:
- `sendBriefToGoodnotes(profile, brief)`
- `createNotionBriefPage(profile, brief)`
- delivery metadata based on generated brief content rather than fixed test copy

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/goodnotes-delivery.test.ts src/lib/notion-config.test.ts`
Expected: FAIL because production delivery helpers do not exist yet.

**Step 3: Write minimal implementation**

Reuse the current test flows but parameterize them with real generated brief content.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/goodnotes-delivery.test.ts src/lib/notion-config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/goodnotes-delivery.ts src/lib/goodnotes-delivery.test.ts src/lib/notion.ts src/lib/notion-config.ts src/lib/notion-config.test.ts
git commit -m "feat: add production daily brief delivery helpers"
```

### Task 7: Wire the orchestrator into the internal daily run route

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/run/route.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/app/api/internal/daily-brief/run/route.test.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store.ts`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/src/lib/daily-brief-history-store.test.ts`

**Step 1: Write the failing tests**

Cover:
- a successful run writes history entries
- duplicate date/programme runs are skipped
- partial delivery failures are recorded without aborting the entire run
- route response returns run summary counts

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/daily-brief/run/route.test.ts src/lib/daily-brief-history-store.test.ts`
Expected: FAIL because orchestration is not connected yet.

**Step 3: Write minimal implementation**

Connect the internal route to:
- ingest
- select
- generate
- record history
- deliver

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/daily-brief/run/route.test.ts src/lib/daily-brief-history-store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/internal/daily-brief/run/route.ts src/app/api/internal/daily-brief/run/route.test.ts src/lib/daily-brief-history-store.ts src/lib/daily-brief-history-store.test.ts
git commit -m "feat: connect scheduled daily brief pipeline"
```

### Task 8: Add Cloud Scheduler deployment support and operator documentation

**Files:**
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/scripts/deploy-cloud-run.sh`
- Create: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/scripts/configure-daily-brief-scheduler.sh`
- Modify: `/Users/growtheducation/Desktop/Katherine/dailysparks-web/README.md`

**Step 1: Write the failing check**

Document the required env and expected scheduler command first, then run shell syntax verification.

**Step 2: Run shell validation**

Run: `bash -n scripts/deploy-cloud-run.sh scripts/configure-daily-brief-scheduler.sh`
Expected: FAIL until the new script exists.

**Step 3: Write minimal implementation**

Add:
- `DAILY_SPARKS_SCHEDULER_SECRET`
- optional schedule envs
- a helper script that creates/updates a Cloud Scheduler job against the internal route

**Step 4: Run shell validation**

Run: `bash -n scripts/deploy-cloud-run.sh scripts/configure-daily-brief-scheduler.sh`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/deploy-cloud-run.sh scripts/configure-daily-brief-scheduler.sh README.md
git commit -m "feat: add daily brief scheduler deployment support"
```

### Task 9: Full verification and production smoke

**Files:**
- Modify as needed from previous tasks

**Step 1: Run focused tests**

Run: `npm test -- src/lib/mvp-store.test.ts src/lib/ai-connection-store.test.ts src/lib/prompt-policy-store.test.ts src/lib/source-ingestion.test.ts src/lib/daily-brief-orchestrator.test.ts src/app/api/internal/daily-brief/run/route.test.ts`

**Step 2: Run project lint**

Run: `npm run lint -- src/lib src/app/api/internal/daily-brief/run docs/plans/2026-04-02-daily-brief-automation.md`

**Step 3: Run production build**

Run: `npm run build`

**Step 4: Smoke the route locally or against preview**

Run the internal route with a dry-run request and confirm:
- auth works
- blockers are honest
- success summary is structured

**Step 5: Commit**

```bash
git add .
git commit -m "feat: ship minimal daily brief automation chain"
```

Plan complete and saved to `docs/plans/2026-04-02-daily-brief-automation.md`. I’m continuing in this session and starting with Task 1 using TDD.

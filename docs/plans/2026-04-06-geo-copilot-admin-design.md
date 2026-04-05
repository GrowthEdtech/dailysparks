# GEO Copilot Admin Design

## Goal

Fuse the PRD's GEO assistant and monitoring concepts into the existing
editorial admin so operators can manage AI-search prompts, inspect visibility
signals, review machine-readability readiness, and run content checks from the
same workspace they already use for Daily Briefs and prompt policy.

## Decision

Build an `Admin-first MVP` inside the existing `Editorial admin` shell with one
new tab: `GEO Copilot`.

The MVP will include four operator-facing modules:

- `AI visibility tracking`
- `Golden prompts management`
- `Content optimization copilot`
- `Machine-readability layer`

This phase will not yet add live polling against ChatGPT, Gemini, Perplexity,
or other third-party engines. Instead, it will establish the admin surface,
state models, and internal audit flows so the external orchestration layer can
attach later without reworking the CMS UI.

## Why this is the right split

The attached PRD describes both:

- an internal admin control surface, and
- a heavier monitoring/orchestration backend

Trying to land both at once would turn a CMS integration task into a broad
platform build. The editorial admin already has durable patterns for:

- local/Firestore dual stores
- admin-only route handlers
- operator dashboards
- immutable audit/history records

So the highest-leverage move is to extend that surface first, while keeping the
data contracts aligned with the eventual Phase 2 monitoring engine.

## Admin information architecture

### New tab

Add a new editorial admin tab:

- `GEO Copilot`
- description: `AI visibility, prompts, audit, readability`

### GEO Copilot page layout

The page should be a single admin destination with five sections:

1. `AI visibility summary`
2. `Golden prompts`
3. `Visibility logs`
4. `Content optimization copilot`
5. `Machine-readability status`

This keeps the PRD's three product modules visible in one operational view
without creating a maze of sub-pages.

## Module design

### 1. AI visibility summary

Purpose:

- give operators a baseline snapshot of current GEO posture

Metrics shown:

- `Share of Model (SoM)`
- `Citation Share`
- `Sentiment`
- `Entity Accuracy`
- `tracked prompts`
- `last scan at`

For this MVP, these metrics will be derived from the stored visibility logs,
not from live engine polling.

### 2. Golden prompts manager

Purpose:

- let editorial and growth teams manage the high-intent prompts that should be
  tracked over time

Each prompt record should store:

- prompt text
- commercial intent / topic label
- priority
- target programmes
- covered engines
- fan-out hints / sub-query hints
- active flag
- notes

This aligns with the PRD's `Golden Prompts` requirement while staying simple
enough for local and Firestore storage.

### 3. Visibility logs

Purpose:

- store and inspect attribution evidence per engine run

Each log entry should store:

- prompt id
- engine
- run timestamp
- mention status
- cited urls
- SoM score
- citation share score
- sentiment label
- entity accuracy label
- raw response excerpt
- notes

This gives the product a real audit surface now, even before automated polling
lands.

### 4. Content optimization copilot

Purpose:

- help editors evaluate whether a draft is shaped for AI extraction before it
  becomes published content

This MVP should behave like an internal checker panel rather than a full CMS
editor plugin. Operators can paste:

- title
- structured headings
- draft body
- optional reference notes

The checker then evaluates:

- `Atomic answers` under H2/H3
- `CSQAF` signals:
  - citations
  - statistics
  - quotations
  - authoritativeness
  - fluency
- `internal consistency` hints

The consistency check will be heuristic for now and based on existing prompt
policy / source / editorial patterns, not real vector search yet.

### 5. Machine-readability status

Purpose:

- make the PRD's infrastructure layer visible to operators

This section should show:

- `/llms.txt` status
- `/llms-full.txt` status
- SSR readiness status
- JSON-LD coverage status
- last checked timestamp
- operator notes

For this MVP, these are tracked records that can be updated from admin, not a
fully automated crawler.

## Data model

Add four new admin-side store concepts:

1. `geo prompt records`
2. `geo visibility log records`
3. `geo machine-readability status`
4. `geo content audit snapshots`

These should follow the same storage strategy used elsewhere:

- local JSON-backed store for local mode
- Firestore-backed store for production mode

## API surface

Add admin-only routes for:

- `GET/POST/PUT` geo prompts
- `GET/POST` visibility logs
- `GET/PUT` machine-readability status
- `POST` content audit/check

All routes should reuse the existing editorial admin auth gate.

## Content audit semantics

The audit endpoint should return a structured result, not free-form prose.

Expected result shape:

- `score`
- `summary`
- `atomicAnswerCoverage`
- `csqaf` breakdown
- `issues`
- `suggestions`

This makes the UI auditable and testable, and it leaves room to swap in a real
LLM-based checker later.

## Non-goals

This MVP does not yet include:

- real external AI engine polling
- Firestore vector search integration
- `/llms.txt` file generation
- runtime JSON-LD injection
- automatic SSR crawler checks
- a full CMS publish interceptor

Those remain valid follow-on phases, but this admin integration should land
first.

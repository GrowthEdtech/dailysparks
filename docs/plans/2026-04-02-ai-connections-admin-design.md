# AI Connections Admin Design

## Goal

Add an internal admin module that can manage multiple AI API connections, store their credentials securely, and choose one active default connection for Daily Sparks generation.

## Problem

The current editorial admin surface only manages source channels.

There is no productized way to manage:

- AI provider base URLs
- API keys
- model defaults
- which connection is currently active

That creates three problems:

- every provider change would require a code or env deployment
- secrets would be too easy to scatter into ad hoc configuration
- the future generation pipeline has no structured source of truth for its default model connection

## Product Decision

Use a dedicated `AI Connections` registry inside the existing admin backend.

This registry should support:

- multiple saved connections
- one current default connection
- add / update / delete operations
- safe API key replacement without re-exposing stored secrets

## Recommended Approach

### 1. Support multiple saved connections

The system should not be limited to a single global provider config.

Each saved connection should represent one OpenAI-compatible endpoint configuration that can later power generation, evaluation, or failover workflows.

### 2. Store metadata separately from encrypted secrets

The admin UI can show:

- connection name
- provider type
- base URL
- model
- active state
- default state
- masked API key preview

But it must never return the full stored API key after save.

Instead:

- store the API key encrypted on the server
- store only a short preview for UI display
- allow replacement of the API key through an explicit "replace key" field

### 3. Start with OpenAI-compatible connections

The first version should support one provider family:

- `openai-compatible`

This matches the current requirement:

- configurable base URL
- configurable API key
- configurable default model

It also keeps the data model extensible without overbuilding a broader provider abstraction too early.

### 4. Add a single default selector

At any time:

- zero or more connections may be active
- exactly zero or one connection may be the default

When one connection becomes default, all other connections must automatically clear their default flag.

## Security Model

### API keys

API keys must never be committed to the repo or written into docs or tests.

Stored API keys should be encrypted with:

- `DAILY_SPARKS_AI_CONFIG_ENCRYPTION_SECRET`

The encrypted value is persisted in storage as ciphertext.

The UI only receives:

- `hasApiKey`
- `apiKeyPreview`

### Secret preview

The preview should be intentionally partial, for example:

- `••••••••e225`

This helps operators recognize which credential is attached without leaking the full secret.

### Exposed key handling

If an API key was pasted into chat previously, it should be treated as exposed and should not be seeded or written into code. The admin UI should allow a fresh replacement key to be entered manually after deployment.

## Data Model

Each AI connection record should include:

- `id`
- `name`
- `providerType`
- `baseUrl`
- `defaultModel`
- `apiKeyCiphertext`
- `apiKeyPreview`
- `hasApiKey`
- `active`
- `isDefault`
- `notes`
- `createdAt`
- `updatedAt`

## Storage Model

Use the same backend choice as the existing app:

- local JSON in local mode
- Firestore in Firestore mode

### Local mode

Persist to a dedicated JSON file:

- default path under `data/`
- optional override env:
  - `DAILY_SPARKS_AI_CONNECTION_STORE_PATH`

### Firestore mode

Persist to a dedicated collection:

- `editorialAiConnections`

## UI Shape

Keep this inside the existing admin area, under the same authenticated `/admin/editorial` route.

The page should have two stacked admin modules:

- `Editorial source registry`
- `AI connections`

The AI section should include:

- create-connection card
- existing connection cards
- default badge
- active badge
- masked API key preview
- replace-key field on edit

## API Shape

Add a dedicated admin-only route:

- `GET /api/admin/ai-connections`
- `POST /api/admin/ai-connections`
- `PUT /api/admin/ai-connections`
- `DELETE /api/admin/ai-connections`

Behavior:

- `POST` creates a connection and accepts a plaintext `apiKey`
- `PUT` updates metadata and optionally replaces `apiKey`
- `DELETE` removes a connection by `id`
- setting `isDefault: true` clears the default flag from all others

## Defaults

For operator convenience, the create form should prefill:

- `baseUrl = https://relay.nf.video/v1`
- `defaultModel = gpt-5.4`
- `providerType = openai-compatible`

The API key field should remain blank by default.

## Testing Strategy

Automated coverage should verify:

- encryption and decryption helpers
- API key preview generation
- local store create / update / delete / default switching
- admin API authorization and validation
- admin page rendering with both source and AI modules
- UI rendering of masked API key and default state

## Out of Scope

- live connection test requests
- request routing to the chosen AI connection
- per-feature model policies
- audit logs
- secret-manager-backed key storage

These can follow after the registry is stable.

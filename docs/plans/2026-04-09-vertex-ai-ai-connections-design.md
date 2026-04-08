# Vertex AI AI Connections Design

## Goal

Add a first-class `Vertex AI` provider to the admin `AI connections` registry so Daily Sparks can use `gemini-3.1-pro-preview` as the default runtime connection while keeping the existing `GPT-5.4` relay connection available and switchable.

## Problem

The current AI connections system assumes every provider is:

- `openai-compatible`
- configured with a static `baseUrl`
- authenticated with a stored API key

That works for the existing relay-backed `GPT-5.4` connection, but it does not fit production-grade Vertex AI usage:

- Vertex OpenAI-compatible requests should use Google Cloud auth, not a long-lived pasted token
- the admin UI cannot capture provider-specific fields like project, location, or service account
- the runtime cannot mint Google access tokens or impersonate a configured service account

If we only swap the model name, the system will look configured but fail at runtime.

## Product Decision

Extend the existing registry into a small provider-aware system with two supported connection families:

- `openai-compatible`
- `vertex-openai-compatible`

The Vertex connection should be allowed to become the default connection. The existing relay-backed `GPT-5.4` connection must remain editable and switchable in admin.

## Recommended Approach

### 1. Keep one shared AI connections registry

Do not create a separate Vertex-only settings page.

Instead, extend the current `AI connections` registry so operators can manage:

- standard OpenAI-compatible connections
- Vertex OpenAI-compatible connections

This preserves the current admin workflow:

- multiple saved connections
- one default connection
- active / inactive toggle
- easy rollback by switching the default back to GPT-5.4

### 2. Treat Vertex auth as managed server-side auth

Vertex connections should not store a Google access token as the connection secret.

For `vertex-openai-compatible`:

- do not require an API key in admin
- use ADC on the server
- if a `serviceAccountEmail` is configured, try to impersonate that service account at runtime
- if no `serviceAccountEmail` is configured, use the ambient ADC identity directly

The pasted credential-like string previously shared in chat should be treated as exposed and ignored. It must not be persisted in the registry.

### 3. Derive the Vertex endpoint from project + location

For Vertex connections, operators should configure:

- `projectId`
- `location`
- `serviceAccountEmail`
- `defaultModel`

The stored `baseUrl` should be derived automatically as:

- `https://aiplatform.googleapis.com/v1/projects/<projectId>/locations/<location>/endpoints/openapi`

This keeps the runtime aligned with the official Vertex OpenAI-compatible endpoint while preserving the existing `baseUrl` display pattern in admin.

### 4. Preserve default switching semantics

At any time:

- zero or more connections may be active
- exactly zero or one connection may be the default

Switching the default to Vertex should automatically clear the prior default `GPT-5.4` connection, but the GPT connection itself should remain intact and editable for rollback.

## Data Model

Retain the shared record shape and add provider-aware optional fields.

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
- `vertexProjectId`
- `vertexLocation`
- `serviceAccountEmail`
- `createdAt`
- `updatedAt`

Field rules:

- `openai-compatible`
  - requires `baseUrl`
  - requires stored API key
  - ignores Vertex fields
- `vertex-openai-compatible`
  - requires `vertexProjectId`
  - requires `vertexLocation`
  - may include `serviceAccountEmail`
  - derives and stores `baseUrl`
  - stores no API key

## Runtime Model

The runtime connection should become a discriminated union:

- `openai-compatible`
  - includes decrypted `apiKey`
- `vertex-openai-compatible`
  - includes `vertexProjectId`
  - includes `vertexLocation`
  - includes `serviceAccountEmail`
  - includes no API key

The shared text generation helper can stay OpenAI-compatible at the HTTP layer, but it must choose the auth token source by provider:

- `openai-compatible` → stored API key
- `vertex-openai-compatible` → Google access token from ADC / impersonation

## Authentication Model

### OpenAI-compatible

Continue using:

- encrypted stored API key
- `Authorization: Bearer <api key>`

### Vertex

Use:

- Google Cloud ADC
- scope: `https://www.googleapis.com/auth/cloud-platform`

If `serviceAccountEmail` is present:

- attempt service-account impersonation
- expected production prerequisite:
  - runtime principal has `roles/iam.serviceAccountTokenCreator` on the configured target service account

If impersonation is not configured correctly:

- fail the request with a clear runtime error
- do not silently fall back to the wrong identity

## Admin UI Shape

Keep the current single-page AI connections UI, but make the form provider-aware.

### OpenAI-compatible form

Fields:

- name
- provider type
- base URL
- default model
- API key
- active
- default
- notes

### Vertex form

Fields:

- name
- provider type
- project ID
- location
- service account email
- default model
- active
- default
- notes

Behavior:

- derived endpoint preview replaces freeform base URL editing
- API key field is hidden
- UI explains that auth is managed through Google Cloud identity

## API Shape

Keep the existing admin route:

- `GET /api/admin/ai-connections`
- `POST /api/admin/ai-connections`
- `PUT /api/admin/ai-connections`
- `DELETE /api/admin/ai-connections`

Validation rules become provider-specific:

- `openai-compatible`
  - require `name`, `baseUrl`, `defaultModel`, `apiKey`
- `vertex-openai-compatible`
  - require `name`, `vertexProjectId`, `vertexLocation`, `defaultModel`
  - `apiKey` optional and ignored
  - `baseUrl` computed server-side

## Defaults

### Relay connection defaults

- `baseUrl = https://relay.nf.video/v1`
- `defaultModel = gpt-5.4`

### Vertex defaults

- `location = global`
- `defaultModel = google/gemini-3.1-pro-preview`

For this rollout, the intended production Vertex connection is:

- `projectId = gen-lang-client-0586185740`
- `serviceAccountEmail = automation-agent@gen-lang-client-0586185740.iam.gserviceaccount.com`

## Testing Strategy

Automated coverage should verify:

- schema normalization preserves Vertex-specific fields
- local and Firestore stores retain Vertex metadata
- create / update flows can add a Vertex connection without an API key
- switching a Vertex connection to default clears the prior default GPT connection
- runtime auth uses stored API key for relay connections
- runtime auth uses Google access tokens for Vertex connections
- admin UI renders provider-aware forms and labels
- daily brief orchestration still resolves the selected default connection correctly

## Operational Notes

Before production usage, confirm:

- Vertex AI API is enabled in `gen-lang-client-0586185740`
- IAM Credentials API is enabled if impersonation is used
- the Cloud Run runtime principal can impersonate `automation-agent@gen-lang-client-0586185740.iam.gserviceaccount.com`
- billing is enabled on the project

## Out of Scope

- per-feature model routing policies
- multi-model fallback chains
- model benchmarking UI
- direct connection test buttons
- storing or rotating Google service-account keys in admin

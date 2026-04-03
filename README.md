# Daily Sparks Web

Daily Sparks is a Next.js MVP for IB families. The current app supports:

- Google-only parent login with secure server sessions
- a dashboard for programme and year selection
- a dedicated billing page with monthly and yearly plan selection
- Stripe sandbox checkout for monthly and yearly subscriptions
- a generated weekly reading plan
- an editorial policy foundation for programme-aware daily reading content
- delivery channel preferences for Goodnotes and Notion
- Notion OAuth sync that can create a dedicated reading archive and send a test page
- a first-login child-name onboarding step inside the dashboard

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Editorial Foundation

Daily Sparks now includes a first-pass editorial foundation for future daily reading generation in:

```bash
src/lib/editorial-policy.ts
```

This policy layer defines:

- a curated source whitelist v1 rather than unrestricted web search
- programme-aware recommended sources for `PYP`, `MYP`, and `DP`
- repetition-control windows to protect the "daily paper" feel from topic, angle, and question fatigue

The current whitelist v1 centers on:

- Reuters
- Associated Press
- BBC
- NPR
- Science News
- Science News Explores
- UNICEF
- WHO
- National Geographic
- Smithsonian Magazine

This is intentionally a policy and configuration layer, not a live scraping pipeline. Future ingest, prompt, or admin flows should import this module instead of re-encoding source rules ad hoc.

## Editorial Admin

Daily Sparks now includes an internal editorial admin flow with a dedicated password login:

```bash
/admin/login
/admin/editorial
/admin/editorial/sources
/admin/editorial/ai-connections
/admin/editorial/prompt-policy
/admin/editorial/daily-briefs
```

`/admin/editorial` now acts as the shared admin shell and redirects to the
default `Sources` tab.

This route is independent from the parent-facing Google login. Parent accounts still use:

```bash
/login
```

The editorial admin password flow requires:

```env
DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD=replace-with-a-strong-password
DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
DAILY_SPARKS_AI_CONFIG_ENCRYPTION_SECRET=replace-with-a-long-random-secret
```

Keep `DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET` and
`DAILY_SPARKS_AI_CONFIG_ENCRYPTION_SECRET` stable across deployments. Rotating
them without a migration will invalidate existing admin sessions and stored AI
connection secrets.

The editorial registry follows the same storage backend choice as the rest of the MVP:

- local JSON in local mode
- Firestore in Firestore mode

For local-only testing, you can override the editorial registry path with:

```env
DAILY_SPARKS_EDITORIAL_STORE_PATH=/absolute/path/to/editorial-sources.json
```

The same backend choice also applies to daily brief history. For local-only
testing, you can override that path with:

```env
DAILY_SPARKS_DAILY_BRIEF_STORE_PATH=/absolute/path/to/daily-brief-history.json
```

Prompt policy storage follows the same backend split. For local-only testing,
you can override that path with:

```env
DAILY_SPARKS_PROMPT_POLICY_STORE_PATH=/absolute/path/to/prompt-policies.json
```

The same admin area now also includes an `AI connections` registry for future generation infrastructure. This module supports:

- multiple OpenAI-compatible connection profiles
- one active default connection
- editable base URL and default model
- masked API key previews after save

For local-only testing, you can override the AI registry path with:

```env
DAILY_SPARKS_AI_CONNECTION_STORE_PATH=/absolute/path/to/ai-connections.json
```

API keys are encrypted on the server before they are persisted. The admin UI never re-displays the full stored key after save.

The editorial admin now also includes a dedicated `Prompt Policy` workspace for:

- shared editorial instructions
- anti-repetition instructions
- output contract instructions
- programme-specific prompt rules for `PYP`, `MYP`, and `DP`
- versioned `draft`, `active`, and `archived` prompt policies

## Daily Brief Automation

Daily Sparks now uses a staged scheduler model instead of a single all-in-one
job. The production Cloud Scheduler should target these internal routes:

```bash
/api/internal/daily-brief/ingest
/api/internal/daily-brief/generate
/api/internal/daily-brief/preflight
/api/internal/daily-brief/deliver
/api/internal/daily-brief/retry-delivery
```

The existing fallback route remains available for operators:

```bash
/api/internal/daily-brief/run
```

All internal routes expect the scheduler secret header:

```bash
x-daily-sparks-scheduler-secret
```

### Required service configuration

The Cloud Run service must receive a scheduler secret:

```env
DAILY_SPARKS_SCHEDULER_SECRET=replace-with-a-long-random-secret
```

For production, prefer Secret Manager and pass the secret name to the deploy
script instead of using a raw value:

```env
DAILY_SPARKS_SCHEDULER_SECRET_SECRET=daily-sparks-scheduler-secret
```

`scripts/deploy-cloud-run.sh` now supports both options:

- `DAILY_SPARKS_SCHEDULER_SECRET`
- `DAILY_SPARKS_SCHEDULER_SECRET_SECRET`

If both are present, the Secret Manager reference is preferred.

### Configure the Cloud Scheduler jobs

After deploying Cloud Run, create or update the staged scheduler jobs with:

```bash
chmod +x scripts/configure-daily-brief-scheduler.sh
DAILY_SPARKS_SCHEDULER_SECRET_SECRET=daily-sparks-scheduler-secret \
./scripts/configure-daily-brief-scheduler.sh
```

The scheduler helper now creates or updates these jobs by default:

- `dailysparks-brief-ingest-0100` -> `/api/internal/daily-brief/ingest` -> `0 1 * * *`
- `dailysparks-brief-ingest-0300` -> `/api/internal/daily-brief/ingest` -> `0 3 * * *`
- `dailysparks-brief-ingest-0500` -> `/api/internal/daily-brief/ingest` -> `0 5 * * *`
- `dailysparks-brief-generate-0600` -> `/api/internal/daily-brief/generate` -> `0 6 * * *`
- `dailysparks-brief-preflight-0850` -> `/api/internal/daily-brief/preflight` -> `50 8 * * *`
- `dailysparks-brief-deliver-0900` -> `/api/internal/daily-brief/deliver` -> `0 9 * * *`
- `dailysparks-brief-retry-0910` -> `/api/internal/daily-brief/retry-delivery` -> `10 9 * * *`

All default schedules run in `Asia/Hong_Kong`, and all jobs reuse the same
header-secret authentication. The helper also deletes the legacy single job
`dailysparks-daily-brief` by default so the staged jobs do not double-trigger.

Optional overrides:

```env
GOOGLE_CLOUD_PROJECT=gen-lang-client-0586185740
DAILY_BRIEF_SCHEDULER_LOCATION=asia-east2
DAILY_BRIEF_SCHEDULER_TIME_ZONE=Asia/Hong_Kong
DAILY_BRIEF_SCHEDULER_BASE_URL=https://dailysparks.geledtech.com
DAILY_BRIEF_SCHEDULER_JOB_PREFIX=dailysparks-brief
DAILY_BRIEF_SCHEDULER_ATTEMPT_DEADLINE=1200s
DAILY_BRIEF_SCHEDULER_MAX_RETRY_ATTEMPTS=0
DAILY_BRIEF_SCHEDULER_MESSAGE_BODY={}
DAILY_BRIEF_SCHEDULER_INGEST_0100_SCHEDULE="0 1 * * *"
DAILY_BRIEF_SCHEDULER_INGEST_0300_SCHEDULE="0 3 * * *"
DAILY_BRIEF_SCHEDULER_INGEST_0500_SCHEDULE="0 5 * * *"
DAILY_BRIEF_SCHEDULER_GENERATE_0600_SCHEDULE="0 6 * * *"
DAILY_BRIEF_SCHEDULER_PREFLIGHT_0850_SCHEDULE="50 8 * * *"
DAILY_BRIEF_SCHEDULER_DELIVER_0900_SCHEDULE="0 9 * * *"
DAILY_BRIEF_SCHEDULER_RETRY_0910_SCHEDULE="10 9 * * *"
DAILY_BRIEF_SCHEDULER_LEGACY_JOB_NAME=dailysparks-daily-brief
DAILY_BRIEF_SCHEDULER_CLEANUP_LEGACY_JOB=true
```

The helper is idempotent:

- it creates each stage job if it does not exist
- it updates each stage job in place if it already exists
- it deletes the legacy single job when cleanup is enabled
- it always keeps the route on header-secret auth and clears any stale OAuth or OIDC token config

### Operational expectation

The staged model is designed around a `09:00` delivery SLA:

- `01:00`, `03:00`, `05:00`: refresh candidate sources
- `06:00`: freeze topic selection and generate programme briefs
- `08:50`: verify delivery readiness
- `09:00`: dispatch approved briefs
- `09:10`: retry only failed recipient-channel combinations

### Operator dry run

Before enabling or after updating the schedule, it is safer to dry-run the
fallback orchestration route once:

```bash
curl -sS -X POST \
  https://dailysparks.geledtech.com/api/internal/daily-brief/run \
  -H "content-type: application/json" \
  -H "x-daily-sparks-scheduler-secret: ${DAILY_SPARKS_SCHEDULER_SECRET}" \
  -d '{"dryRun":true}'
```

You can also inspect a specific date:

```bash
curl -sS -X POST \
  https://dailysparks.geledtech.com/api/internal/daily-brief/run \
  -H "content-type: application/json" \
  -H "x-daily-sparks-scheduler-secret: ${DAILY_SPARKS_SCHEDULER_SECRET}" \
  -d '{"dryRun":true,"runDate":"2026-04-03"}'
```

When the system is ready, a real scheduled run will:

- refresh candidate snapshots overnight
- generate only the programmes that have eligible recipients
- write staged `Daily Briefs` history entries
- dispatch through configured Goodnotes and Notion channels at `09:00`
- retry failed deliveries in a separate retry window instead of regenerating content

### Security notes

- Treat `DAILY_SPARKS_SCHEDULER_SECRET` like a production credential.
- Prefer `DAILY_SPARKS_SCHEDULER_SECRET_SECRET` so operators do not need to
  paste raw secrets into their shell history.
- Use a URL-safe random value without commas for the header secret. The
  scheduler helper sends it as an HTTP header value.
- Rotate the scheduler secret if it is ever exposed.

## Authentication

Daily Sparks now uses Firebase Authentication for parent sign-in.

### Local requirements

For local Google login to work, you need:

```bash
gcloud auth application-default login
```

And Firebase Authentication must allow:

- `localhost`
- `dailysparks.geledtech.com`

The active Google Web OAuth client must allow this redirect URI:

- `https://dailysparks.geledtech.com/__/auth/handler`

The app uses the existing Growth Education Firebase project by default:

- `gen-lang-client-0586185740`

Google sign-in happens in the browser, and the backend exchanges the Firebase ID token for a secure server session cookie.

The Firebase Web SDK defaults to this browser-facing auth domain:

- `dailysparks.geledtech.com`

Because the app runs on Cloud Run instead of Firebase Hosting, Next.js proxies these helper endpoints through the Daily Sparks domain:

- `/__/auth/*`
- `/__/firebase/*`

Those helper requests are forwarded to:

- `https://gen-lang-client-0586185740.firebaseapp.com`

If you need to temporarily debug against the project default helper domain, add this local override:

```env
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gen-lang-client-0586185740.firebaseapp.com
```

## Storage Backends

The app supports two persistence modes.

### Default: local JSON store

If you do nothing, the app still stores profile data in:

```bash
data/mvp-store.json
```

This is the safest mode for local MVP work and tests. Authentication still goes through Firebase Google sign-in.

### Optional: Firestore with Application Default Credentials

If you want real cloud persistence, Daily Sparks can use Firestore through the Firebase Admin SDK with ADC.

#### 1. Authenticate locally with Google Cloud

```bash
gcloud auth application-default login
```

#### 2. Add a local environment file

Create `.env.local`:

```env
DAILY_SPARKS_STORE_BACKEND=firestore
FIREBASE_PROJECT_ID=gen-lang-client-0586185740
```

#### 3. Restart the dev server

Once those values are present, the server-side store switches from local JSON to Firestore.

## Important Notes

- Firestore is used only on the server through route handlers and server components.
- If `DAILY_SPARKS_STORE_BACKEND` is not set to `firestore`, the app falls back to the local JSON store.
- `.env.local` is ignored by git and should stay local.
- For local ADC development, `FIREBASE_PROJECT_ID` should be set even after `gcloud auth application-default login`.
- Firebase Authentication Google provider must be enabled for the project.
- The Firebase Auth authorized domains list must include both `localhost` and `dailysparks.geledtech.com`.
- The Google Web OAuth client must allow `https://dailysparks.geledtech.com/__/auth/handler`.

## Stripe Billing

Daily Sparks now supports hosted Stripe Checkout in sandbox mode.

## Notion Sync

Daily Sparks can connect a parent workspace through a public Notion OAuth integration.

The current flow is:

- connect Notion from the dashboard
- choose a parent Notion page
- create a dedicated `Daily Sparks Reading Archive`
- send a test page to confirm sync

### Required environment variables

```env
NOTION_OAUTH_CLIENT_ID=...
NOTION_OAUTH_CLIENT_SECRET=...
NOTION_OAUTH_REDIRECT_URI=https://dailysparks.geledtech.com/api/notion/callback
NOTION_TOKEN_ENCRYPTION_SECRET=...
```

### Production deployment wiring

The Cloud Run deploy script supports:

- env vars:
  - `NOTION_OAUTH_CLIENT_ID`
  - `NOTION_OAUTH_REDIRECT_URI`
  - `NOTION_API_BASE_URL` (optional)
  - `NOTION_API_VERSION` (optional)
- secrets:
  - `NOTION_OAUTH_CLIENT_SECRET_SECRET`
  - `NOTION_TOKEN_ENCRYPTION_SECRET_SECRET`

If these values are not configured, the dashboard shows Notion as unavailable instead of exposing a broken flow.

## Goodnotes Delivery

Daily Sparks can deliver a real PDF test brief to the student's Goodnotes inbox email.

The current flow is:

- save the student's `@goodnotes.email` destination from the dashboard
- send a PDF test brief to confirm delivery
- mark the destination as connected once the test send succeeds

### Required environment variables

```env
GOODNOTES_SMTP_URL=smtps://username:password@smtp.example.com:465
GOODNOTES_FROM_EMAIL=info@geledtech.com
GOODNOTES_FROM_NAME=Growth Education Limited
```

### Production deployment wiring

The Cloud Run deploy script supports:

- env vars:
  - `GOODNOTES_FROM_EMAIL`
  - `GOODNOTES_FROM_NAME`
- secrets:
  - `GOODNOTES_SMTP_URL_SECRET`

If `GOODNOTES_SMTP_URL` is not configured, the dashboard keeps the Goodnotes module available but `Send test brief` returns a clear setup message instead of pretending delivery succeeded.

### Required environment variables

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

The billing page automatically shows sandbox state when the publishable key starts with `pk_test_`.

### Billing flow

- `/billing` creates a hosted Stripe Checkout Session
- Stripe returns to `/billing/success`
- Daily Sparks verifies the returned `session_id` on the server
- Stripe webhooks keep subscription and invoice state in sync after checkout
- the parent profile is updated to `active` once checkout is confirmed
- `/billing` shows the latest Stripe invoice summary and invoice links when available

### Security notes

- Never commit Stripe keys into the repository
- Keep `STRIPE_SECRET_KEY` in Secret Manager or another server-side secret store
- Do not enable live billing with the currently exposed live key; rotate it first before production use

### Cloud Run deployment

The deploy script can carry Stripe billing config through to Cloud Run when these environment variables are present locally:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY_SECRET=daily-sparks-stripe-test-secret-key
STRIPE_WEBHOOK_SECRET_SECRET=daily-sparks-stripe-test-webhook-secret
```

`STRIPE_SECRET_KEY_SECRET` and `STRIPE_WEBHOOK_SECRET_SECRET` should point to Secret Manager secret names, not raw keys.

### Stripe webhook setup

Create the Stripe webhook endpoint and store its signing secret in Secret Manager with:

```bash
chmod +x scripts/configure-stripe-webhook.sh
STRIPE_API_KEY="$(gcloud secrets versions access latest --secret=daily-sparks-stripe-test-secret-key --project=gen-lang-client-0586185740)" \
STRIPE_WEBHOOK_SECRET_SECRET=daily-sparks-stripe-test-webhook-secret \
./scripts/configure-stripe-webhook.sh
```

The script creates or reuses a webhook for:

- `https://dailysparks.geledtech.com/api/stripe/webhook`
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Stripe invoice backfill

If older subscriptions were created before webhook invoice sync was enabled, run this one-time backfill to pull the latest Stripe invoice into each parent profile:

```bash
STRIPE_API_KEY="$(gcloud secrets versions access latest --secret=daily-sparks-stripe-test-secret-key --project=gen-lang-client-0586185740)" \
GOOGLE_CLOUD_PROJECT=gen-lang-client-0586185740 \
npm run backfill:stripe-invoices
```

Useful flags:

- `--dry-run` prints what would be updated without writing to Firestore
- `--email admin@geledtech.com` backfills a single parent profile
- `--limit 5` caps how many parents are processed in one run

## Production Deployment

The production target for this repo is Google Cloud Run.

### Production rules

- production must use Firestore
- local JSON storage is not allowed in production
- the app expects `DAILY_SPARKS_STORE_BACKEND=firestore`
- the app expects `FIREBASE_PROJECT_ID`
- Cloud Run ingress should stay `internal-and-cloud-load-balancing`
- public traffic should enter through the external load balancer and custom domain
- Firebase Authentication must have Google provider enabled
- Firebase Authentication must authorize `dailysparks.geledtech.com`
- Google Web OAuth must allow `https://dailysparks.geledtech.com/__/auth/handler`

### Build artifact

The app uses Next.js standalone output and ships with:

- `Dockerfile`
- `scripts/deploy-cloud-run.sh`
- `scripts/setup-uptime-check.sh`

### One-time setup

Make sure the target Google Cloud project has:

- Cloud Run enabled
- Cloud Build enabled
- Firestore enabled
- a runtime service account with Firestore access

Recommended IAM for the Cloud Run runtime identity:

- `Cloud Datastore User`
- `Firebase Authentication Admin`

### Deploy

Authenticate with Google Cloud, then run:

```bash
chmod +x scripts/deploy-cloud-run.sh
./scripts/deploy-cloud-run.sh
```

This deploy script keeps the service behind the load balancer by setting:

- `--ingress internal-and-cloud-load-balancing`

### Custom domain

Production is served from:

- `https://dailysparks.geledtech.com`

HTTP should redirect to HTTPS through the external load balancer.

### Monitoring

Create the production uptime check with:

```bash
chmod +x scripts/setup-uptime-check.sh
./scripts/setup-uptime-check.sh
```

The default uptime check targets:

- `https://dailysparks.geledtech.com/`
- 1 minute period
- 10 second timeout
- SSL validation enabled

Optional overrides:

```bash
GOOGLE_CLOUD_PROJECT=gen-lang-client-0586185740
SERVICE_NAME=dailysparks-web
REGION=asia-east2
```

## Scripts

```bash
npm run dev
npm run lint
npm run test -- --run
npm run build
```

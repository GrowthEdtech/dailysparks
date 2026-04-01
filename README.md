# Daily Sparks Web

Daily Sparks is a Next.js MVP for IB families. The current app supports:

- Google-only parent login with secure server sessions
- a dashboard for programme and year selection
- a dedicated billing page with monthly and yearly plan selection
- Stripe sandbox checkout for monthly and yearly subscriptions
- a generated weekly reading plan
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

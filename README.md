# Daily Sparks Web

Daily Sparks is a Next.js MVP for IB families. The current app supports:

- a lightweight email-based parent login
- a dashboard for programme and year selection
- a generated weekly reading plan
- delivery channel preferences for Goodnotes and Notion

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Storage Backends

The app supports two persistence modes.

### Default: local JSON store

If you do nothing, the app stores data in:

```bash
data/mvp-store.json
```

This is the safest mode for local MVP work and tests.

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

## Production Deployment

The production target for this repo is Google Cloud Run.

### Production rules

- production must use Firestore
- local JSON storage is not allowed in production
- the app expects `DAILY_SPARKS_STORE_BACKEND=firestore`
- the app expects `FIREBASE_PROJECT_ID`

### Build artifact

The app uses Next.js standalone output and ships with:

- `Dockerfile`
- `scripts/deploy-cloud-run.sh`

### One-time setup

Make sure the target Google Cloud project has:

- Cloud Run enabled
- Cloud Build enabled
- Firestore enabled
- a runtime service account with Firestore access

Recommended IAM for the Cloud Run runtime identity:

- `Cloud Datastore User`

### Deploy

Authenticate with Google Cloud, then run:

```bash
chmod +x scripts/deploy-cloud-run.sh
./scripts/deploy-cloud-run.sh
```

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

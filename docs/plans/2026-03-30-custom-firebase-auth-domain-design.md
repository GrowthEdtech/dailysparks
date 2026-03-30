# Custom Firebase Auth Domain Design

## Goal

Move the visible Firebase web auth flow from the project default `firebaseapp.com` domain to `dailysparks.geledtech.com` so Google sign-in feels first-party and the popup flow can complete through the production domain.

## Product Decision

Daily Sparks should keep using Firebase Authentication and the existing Cloud Run deployment, but the browser-facing auth helper domain should become the product domain:

- `authDomain` should default to `dailysparks.geledtech.com`
- the app should proxy Firebase helper routes under `https://dailysparks.geledtech.com/__/...`
- Google OAuth should allow the custom helper redirect

The underlying Firebase project domain still exists, but it should sit behind the proxy instead of being the user-facing auth domain.

## Architecture

### Browser config

The Firebase Web SDK config should move into a reusable helper so the auth domain default can be tested and overridden when needed.

Default values:

- auth domain: `dailysparks.geledtech.com`
- helper origin: `https://gen-lang-client-0586185740.firebaseapp.com`

### Helper proxy

Because the app runs on Cloud Run instead of Firebase Hosting, Next.js needs to proxy Firebase helper endpoints:

- `/__/auth/:path*`
- `/__/firebase/:path*`

These routes should forward to the project helper origin so popup and redirect flows can finish on the Daily Sparks domain.

### OAuth configuration

The Google Web OAuth client used by Identity Platform must allow:

- JavaScript origin: `https://dailysparks.geledtech.com`
- Redirect URI: `https://dailysparks.geledtech.com/__/auth/handler`

Firebase Authentication authorized domains should continue to include:

- `dailysparks.geledtech.com`
- `localhost`

## Error Handling

If the helper proxy is missing or the OAuth redirect URI is not updated, Google sign-in will fail with `redirect_uri_mismatch`. The code change and the Google Cloud config change must ship together.

## Testing Strategy

Automated checks should cover:

- Firebase web config defaults to the custom auth domain
- Next.js rewrite rules proxy the Firebase helper endpoints correctly
- existing auth route tests still pass

Manual smoke should cover:

- `https://dailysparks.geledtech.com/__/auth/handler` responds through the app domain
- `/login` still renders
- Google sign-in popup reaches the Google account chooser without redirect mismatch

# Stripe Webhook + Invoice Sync Implementation Plan

1. Extend parent billing fields to persist the latest Stripe invoice summary in both local and Firestore-backed stores.
2. Add billing helpers to format invoice status, amount, billing period, and recipient email for UI rendering.
3. Implement Stripe webhook verification and event handling in a new `/api/stripe/webhook` route.
4. Reuse existing checkout finalization, but expand it to capture the first invoice when available.
5. Add a `/billing` invoice-delivery section with hosted-invoice and PDF actions.
6. Update Cloud Run deployment plumbing to inject a dedicated Stripe webhook signing secret.
7. Add route, store, and billing-summary tests; then run lint, test, and build before deploy.

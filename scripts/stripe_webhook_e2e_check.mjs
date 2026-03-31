import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";

const projectId = process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0586185740";
const webhookUrl =
  process.env.WEBHOOK_URL || "https://dailysparks.geledtech.com/api/stripe/webhook";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const smokeEmail =
  process.env.STRIPE_WEBHOOK_SMOKE_EMAIL ||
  `stripe-webhook-smoke+${Date.now()}@example.com`;

if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is required.");
}

const firebaseApp =
  getApps()[0] ||
  initializeApp({
    credential: applicationDefault(),
    projectId,
  });

const db = getFirestore(firebaseApp);
const stripe = new Stripe("sk_test_smoke_placeholder");

async function ensureSmokeProfile() {
  const parentSnapshot = await db
    .collection("parents")
    .where("email", "==", smokeEmail)
    .limit(1)
    .get();

  let parentId = parentSnapshot.docs[0]?.id;
  const now = new Date().toISOString();

  if (!parentId) {
    parentId = db.collection("parents").doc().id;

    await db.collection("parents").doc(parentId).set({
      id: parentId,
      email: smokeEmail,
      fullName: "Stripe Webhook Smoke",
      subscriptionStatus: "trial",
      subscriptionPlan: "yearly",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: now,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      subscriptionActivatedAt: null,
      subscriptionRenewalAt: null,
      latestInvoiceId: null,
      latestInvoiceNumber: null,
      latestInvoiceStatus: null,
      latestInvoiceHostedUrl: null,
      latestInvoicePdfUrl: null,
      latestInvoiceAmountPaid: null,
      latestInvoiceCurrency: null,
      latestInvoicePaidAt: null,
      latestInvoicePeriodStart: null,
      latestInvoicePeriodEnd: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const studentSnapshot = await db
    .collection("students")
    .where("parentId", "==", parentId)
    .limit(1)
    .get();

  if (!studentSnapshot.docs[0]) {
    const studentId = db.collection("students").doc().id;

    await db.collection("students").doc(studentId).set({
      id: studentId,
      parentId,
      studentName: "Webhook Smoke Student",
      programme: "PYP",
      programmeYear: 5,
      goodnotesEmail: "",
      notionConnected: false,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function readSmokeParent() {
  const snapshot = await db
    .collection("parents")
    .where("email", "==", smokeEmail)
    .limit(1)
    .get();

  return snapshot.docs[0]?.data() ?? null;
}

async function postSignedWebhook() {
  const eventId = `evt_smoke_${Date.now()}`;
  const invoiceId = `in_smoke_${Date.now()}`;
  const paidAt = Math.floor(Date.now() / 1000);
  const periodEnd = paidAt + 365 * 24 * 60 * 60;
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    type: "invoice.paid",
    data: {
      object: {
        id: invoiceId,
        object: "invoice",
        customer: "cus_smoke_invoice",
        customer_email: smokeEmail,
        number: "DS-SMOKE-001",
        status: "paid",
        currency: "usd",
        amount_paid: 14400,
        amount_due: 0,
        total: 14400,
        created: paidAt,
        hosted_invoice_url: "https://dashboard.stripe.com/test/invoices/smoke",
        invoice_pdf: "https://files.stripe.com/links/smoke.pdf",
        status_transitions: {
          paid_at: paidAt,
        },
        lines: {
          object: "list",
          data: [
            {
              id: "il_smoke_1",
              object: "line_item",
              amount: 14400,
              currency: "usd",
              period: {
                start: paidAt,
                end: periodEnd,
              },
            },
          ],
        },
      },
    },
  });

  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Webhook endpoint returned ${response.status}: ${JSON.stringify(body)}`,
    );
  }

  return invoiceId;
}

await ensureSmokeProfile();
const invoiceId = await postSignedWebhook();
const parent = await readSmokeParent();

if (!parent) {
  throw new Error("Smoke profile was not found after webhook delivery.");
}

if (parent.latestInvoiceId !== invoiceId || parent.latestInvoiceStatus !== "paid") {
  throw new Error(
    `Webhook did not persist invoice state. latestInvoiceId=${parent.latestInvoiceId}, latestInvoiceStatus=${parent.latestInvoiceStatus}`,
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      email: smokeEmail,
      latestInvoiceId: parent.latestInvoiceId,
      latestInvoiceStatus: parent.latestInvoiceStatus,
      latestInvoiceAmountPaid: parent.latestInvoiceAmountPaid,
      latestInvoiceHostedUrl: parent.latestInvoiceHostedUrl,
    },
    null,
    2,
  ),
);

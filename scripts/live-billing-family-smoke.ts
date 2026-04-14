import { execSync } from "node:child_process";

import { createBillingPortalSessionForParent, createCheckoutSessionForParent, isStripeConfigured } from "../src/lib/stripe";
import { resolvePricingMarket } from "../src/lib/pricing-market";
import type { ParentProfile, SubscriptionPlan } from "../src/lib/mvp-types";

type ParsedArgs = {
  email: string | null;
  origin: string;
  plan: Exclude<SubscriptionPlan, null>;
  projectId: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function parseArgs(argv: string[]): ParsedArgs {
  let email: string | null = null;
  let origin = process.env.BILLING_SMOKE_ORIGIN?.trim() || "https://dailysparks.geledtech.com";
  let plan: Exclude<SubscriptionPlan, null> = "yearly";
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    "gen-lang-client-0586185740";

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--email") {
      email = argv[index + 1]?.trim() || null;
      index += 1;
      continue;
    }

    if (value === "--origin") {
      origin = argv[index + 1]?.trim() || origin;
      index += 1;
      continue;
    }

    if (value === "--plan") {
      const candidate = argv[index + 1]?.trim().toLowerCase() || "";

      if (candidate === "monthly" || candidate === "yearly") {
        plan = candidate;
      }

      index += 1;
    }
  }

  return {
    email,
    origin,
    plan,
    projectId,
  };
}

function withStripeCustomerId(profile: ParentProfile, stripeCustomerId: string) {
  return {
    ...profile,
    parent: {
      ...profile.parent,
      stripeCustomerId,
    },
  } satisfies ParentProfile;
}

function decodeFirestoreValue(value: Record<string, unknown> | undefined): unknown {
  if (!value) {
    return null;
  }

  if ("stringValue" in value) {
    return value.stringValue;
  }

  if ("integerValue" in value) {
    return Number(value.integerValue);
  }

  if ("doubleValue" in value) {
    return Number(value.doubleValue);
  }

  if ("booleanValue" in value) {
    return value.booleanValue;
  }

  if ("nullValue" in value) {
    return null;
  }

  return null;
}

function getGoogleAccessToken() {
  const existingToken = process.env.GOOGLE_ACCESS_TOKEN?.trim();

  if (existingToken) {
    return existingToken;
  }

  return execSync("gcloud auth print-access-token", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

async function runFirestoreQuery(options: {
  collectionId: string;
  fieldPath: string;
  projectId: string;
  value: string;
}) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${options.projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${getGoogleAccessToken()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: options.collectionId }],
          where: {
            fieldFilter: {
              field: {
                fieldPath: options.fieldPath,
              },
              op: "EQUAL",
              value: {
                stringValue: options.value,
              },
            },
          },
          limit: 1,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Firestore query failed for ${options.collectionId}: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as Array<{ document?: { name: string; fields?: Record<string, Record<string, unknown>> } }>;
  return payload.find((entry) => entry.document)?.document ?? null;
}

function buildSmokeProfile(
  parentDocument: { name: string; fields?: Record<string, Record<string, unknown>> },
  studentDocument: { name: string; fields?: Record<string, Record<string, unknown>> } | null,
): ParentProfile {
  const parentFields = parentDocument.fields ?? {};
  const studentFields = studentDocument?.fields ?? {};
  const now = new Date().toISOString();
  const parentId = parentDocument.name.split("/").pop() ?? "";
  const studentId = studentDocument?.name.split("/").pop() ?? `student-${parentId}`;

  return {
    parent: {
      id: parentId,
      email: String(decodeFirestoreValue(parentFields.email) ?? ""),
      fullName:
        String(decodeFirestoreValue(parentFields.fullName) ?? "").trim() || "Daily Sparks Parent",
      countryCode: String(decodeFirestoreValue(parentFields.countryCode) ?? "HK"),
      deliveryTimeZone: String(decodeFirestoreValue(parentFields.deliveryTimeZone) ?? "Asia/Hong_Kong"),
      preferredDeliveryLocalTime: String(
        decodeFirestoreValue(parentFields.preferredDeliveryLocalTime) ?? "06:30",
      ),
      onboardingReminderCount: Number(decodeFirestoreValue(parentFields.onboardingReminderCount) ?? 0),
      onboardingReminderLastAttemptAt: null,
      onboardingReminderLastSentAt: null,
      onboardingReminderLastStage: null,
      onboardingReminderLastStatus: null,
      onboardingReminderLastMessageId: null,
      onboardingReminderLastError: null,
      subscriptionStatus:
        (decodeFirestoreValue(parentFields.subscriptionStatus) as ParentProfile["parent"]["subscriptionStatus"]) ?? "trial",
      subscriptionPlan:
        (decodeFirestoreValue(parentFields.subscriptionPlan) as ParentProfile["parent"]["subscriptionPlan"]) ?? null,
      stripeCustomerId: (decodeFirestoreValue(parentFields.stripeCustomerId) as string | null) ?? null,
      stripeSubscriptionId:
        (decodeFirestoreValue(parentFields.stripeSubscriptionId) as string | null) ?? null,
      trialStartedAt: String(decodeFirestoreValue(parentFields.trialStartedAt) ?? now),
      trialEndsAt: String(decodeFirestoreValue(parentFields.trialEndsAt) ?? now),
      subscriptionActivatedAt:
        (decodeFirestoreValue(parentFields.subscriptionActivatedAt) as string | null) ?? null,
      subscriptionRenewalAt:
        (decodeFirestoreValue(parentFields.subscriptionRenewalAt) as string | null) ?? null,
      latestInvoiceId: (decodeFirestoreValue(parentFields.latestInvoiceId) as string | null) ?? null,
      latestInvoiceNumber:
        (decodeFirestoreValue(parentFields.latestInvoiceNumber) as string | null) ?? null,
      latestInvoiceStatus:
        (decodeFirestoreValue(parentFields.latestInvoiceStatus) as string | null) ?? null,
      latestInvoiceHostedUrl:
        (decodeFirestoreValue(parentFields.latestInvoiceHostedUrl) as string | null) ?? null,
      latestInvoicePdfUrl:
        (decodeFirestoreValue(parentFields.latestInvoicePdfUrl) as string | null) ?? null,
      latestInvoiceAmountPaid:
        (decodeFirestoreValue(parentFields.latestInvoiceAmountPaid) as number | null) ?? null,
      latestInvoiceCurrency:
        (decodeFirestoreValue(parentFields.latestInvoiceCurrency) as string | null) ?? null,
      latestInvoicePaidAt:
        (decodeFirestoreValue(parentFields.latestInvoicePaidAt) as string | null) ?? null,
      latestInvoicePeriodStart:
        (decodeFirestoreValue(parentFields.latestInvoicePeriodStart) as string | null) ?? null,
      latestInvoicePeriodEnd:
        (decodeFirestoreValue(parentFields.latestInvoicePeriodEnd) as string | null) ?? null,
      notionWorkspaceId:
        (decodeFirestoreValue(parentFields.notionWorkspaceId) as string | null) ?? null,
      notionWorkspaceName:
        (decodeFirestoreValue(parentFields.notionWorkspaceName) as string | null) ?? null,
      notionBotId: (decodeFirestoreValue(parentFields.notionBotId) as string | null) ?? null,
      notionDatabaseId:
        (decodeFirestoreValue(parentFields.notionDatabaseId) as string | null) ?? null,
      notionDatabaseName:
        (decodeFirestoreValue(parentFields.notionDatabaseName) as string | null) ?? null,
      notionDataSourceId:
        (decodeFirestoreValue(parentFields.notionDataSourceId) as string | null) ?? null,
      notionAuthorizedAt:
        (decodeFirestoreValue(parentFields.notionAuthorizedAt) as string | null) ?? null,
      notionLastSyncedAt:
        (decodeFirestoreValue(parentFields.notionLastSyncedAt) as string | null) ?? null,
      notionLastSyncStatus:
        (decodeFirestoreValue(parentFields.notionLastSyncStatus) as
          | "idle"
          | "success"
          | "failed"
          | null) ?? null,
      notionLastSyncMessage:
        (decodeFirestoreValue(parentFields.notionLastSyncMessage) as string | null) ?? null,
      notionLastSyncPageId:
        (decodeFirestoreValue(parentFields.notionLastSyncPageId) as string | null) ?? null,
      notionLastSyncPageUrl:
        (decodeFirestoreValue(parentFields.notionLastSyncPageUrl) as string | null) ?? null,
      createdAt: String(decodeFirestoreValue(parentFields.createdAt) ?? now),
      updatedAt: String(decodeFirestoreValue(parentFields.updatedAt) ?? now),
    },
    student: {
      id: studentId,
      parentId,
      studentName:
        String(decodeFirestoreValue(studentFields.studentName) ?? "").trim() || "Daily Sparks Student",
      programme:
        (decodeFirestoreValue(studentFields.programme) as ParentProfile["student"]["programme"]) ?? "PYP",
      programmeYear: Number(decodeFirestoreValue(studentFields.programmeYear) ?? 5),
      goodnotesEmail: String(decodeFirestoreValue(studentFields.goodnotesEmail) ?? ""),
      goodnotesConnected: Boolean(decodeFirestoreValue(studentFields.goodnotesConnected) ?? false),
      goodnotesVerifiedAt:
        (decodeFirestoreValue(studentFields.goodnotesVerifiedAt) as string | null) ?? null,
      goodnotesLastTestSentAt:
        (decodeFirestoreValue(studentFields.goodnotesLastTestSentAt) as string | null) ?? null,
      goodnotesLastDeliveryStatus:
        (decodeFirestoreValue(studentFields.goodnotesLastDeliveryStatus) as
          | "idle"
          | "success"
          | "failed"
          | null) ?? null,
      goodnotesLastDeliveryMessage:
        (decodeFirestoreValue(studentFields.goodnotesLastDeliveryMessage) as string | null) ?? null,
      notionConnected: Boolean(decodeFirestoreValue(studentFields.notionConnected) ?? false),
      createdAt: String(decodeFirestoreValue(studentFields.createdAt) ?? now),
      updatedAt: String(decodeFirestoreValue(studentFields.updatedAt) ?? now),
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.email) {
    throw new Error("Usage: tsx scripts/live-billing-family-smoke.ts --email <parent@example.com> [--plan monthly|yearly] [--origin https://dailysparks.geledtech.com]");
  }

  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured in the current environment.");
  }

  const normalizedEmail = normalizeEmail(args.email);
  const parentDocument = await runFirestoreQuery({
    collectionId: "parents",
    fieldPath: "email",
    projectId: args.projectId,
    value: normalizedEmail,
  });

  if (!parentDocument) {
    throw new Error(`No parent profile found for ${args.email}.`);
  }

  const parentId = parentDocument.name.split("/").pop() ?? "";
  const studentDocument = await runFirestoreQuery({
    collectionId: "students",
    fieldPath: "parentId",
    projectId: args.projectId,
    value: parentId,
  });
  const profile = buildSmokeProfile(parentDocument, studentDocument);

  const pricingMarket = resolvePricingMarket();
  const checkout = await createCheckoutSessionForParent({
    origin: args.origin,
    profile,
    pricingMarket,
    subscriptionPlan: args.plan,
  });
  const portal = await createBillingPortalSessionForParent(
    args.origin,
    withStripeCustomerId(profile, checkout.stripeCustomerId),
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: profile.parent.email,
        profile: {
          subscriptionStatus: profile.parent.subscriptionStatus,
          subscriptionPlan: profile.parent.subscriptionPlan,
          stripeCustomerId: profile.parent.stripeCustomerId,
          stripeSubscriptionId: profile.parent.stripeSubscriptionId,
          trialEndsAt: profile.parent.trialEndsAt,
        },
        smoke: {
          origin: args.origin,
          pricingMarket,
          requestedPlan: args.plan,
          checkoutSessionId: checkout.sessionId,
          checkoutUrl: checkout.url,
          stripeCustomerId: checkout.stripeCustomerId,
          billingPortalUrl: portal.url,
        },
      },
      null,
      2,
    ),
  );
}

void main();

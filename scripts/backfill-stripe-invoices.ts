import Stripe from "stripe";
import { execSync } from "node:child_process";

import { resolveDeliveryPreferences } from "../src/lib/delivery-locale";
import type { ParentRecord } from "../src/lib/mvp-types";
import {
  getStripeBackfillUpdate,
  selectStripeBackfillSubscription,
} from "../src/lib/stripe-backfill";

type ParsedArgs = {
  dryRun: boolean;
  email: string | null;
  limit: number | null;
};

type ParentCandidate = {
  documentName: string;
  email: string;
  parent: ParentRecord;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseArgs(argv: string[]): ParsedArgs {
  let dryRun = false;
  let email: string | null = null;
  let limit: number | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (value === "--email") {
      email = argv[index + 1]?.trim() || null;
      index += 1;
      continue;
    }

    if (value === "--limit") {
      const parsed = Number.parseInt(argv[index + 1] ?? "", 10);
      limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      index += 1;
    }
  }

  return {
    dryRun,
    email,
    limit,
  };
}

function getStripeApiKey() {
  return process.env.STRIPE_API_KEY?.trim() ?? process.env.STRIPE_SECRET_KEY?.trim() ?? "";
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

function getProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    "gen-lang-client-0586185740"
  );
}

function toFirestoreDocumentUrl(documentName: string) {
  return `https://firestore.googleapis.com/v1/${documentName}`;
}

function toFirestoreParentsCollectionUrl(projectId: string) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/parents`;
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

function encodeFirestoreValue(value: number | string | null) {
  if (value === null) {
    return {
      nullValue: null,
    };
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return {
        integerValue: String(value),
      };
    }

    return {
      doubleValue: value,
    };
  }

  return {
    stringValue: value,
  };
}

function toParentRecord(fields: Record<string, Record<string, unknown>>, documentName: string): ParentRecord {
  const timestamp = new Date().toISOString();
  const deliveryPreferences = resolveDeliveryPreferences({
    countryCode:
      typeof decodeFirestoreValue(fields.countryCode) === "string"
        ? String(decodeFirestoreValue(fields.countryCode))
        : null,
    deliveryTimeZone:
      typeof decodeFirestoreValue(fields.deliveryTimeZone) === "string"
        ? String(decodeFirestoreValue(fields.deliveryTimeZone))
        : null,
    preferredDeliveryLocalTime:
      typeof decodeFirestoreValue(fields.preferredDeliveryLocalTime) === "string"
        ? String(decodeFirestoreValue(fields.preferredDeliveryLocalTime))
        : null,
  });

  return {
    id: documentName.split("/").pop() ?? String(decodeFirestoreValue(fields.email) ?? ""),
    email: normalizeEmail(String(decodeFirestoreValue(fields.email) ?? "")),
    fullName:
      typeof decodeFirestoreValue(fields.fullName) === "string" &&
      String(decodeFirestoreValue(fields.fullName)).trim()
        ? String(decodeFirestoreValue(fields.fullName)).trim()
        : "Daily Sparks Parent",
    subscriptionStatus:
      decodeFirestoreValue(fields.subscriptionStatus) === "free" ||
      decodeFirestoreValue(fields.subscriptionStatus) === "trial" ||
      decodeFirestoreValue(fields.subscriptionStatus) === "active" ||
      decodeFirestoreValue(fields.subscriptionStatus) === "canceled"
        ? (decodeFirestoreValue(fields.subscriptionStatus) as ParentRecord["subscriptionStatus"])
        : "trial",
    subscriptionPlan:
      decodeFirestoreValue(fields.subscriptionPlan) === "monthly" ||
      decodeFirestoreValue(fields.subscriptionPlan) === "yearly"
        ? (decodeFirestoreValue(fields.subscriptionPlan) as ParentRecord["subscriptionPlan"])
        : null,
    stripeCustomerId:
      typeof decodeFirestoreValue(fields.stripeCustomerId) === "string" &&
      String(decodeFirestoreValue(fields.stripeCustomerId)).trim()
        ? String(decodeFirestoreValue(fields.stripeCustomerId)).trim()
        : null,
    stripeSubscriptionId:
      typeof decodeFirestoreValue(fields.stripeSubscriptionId) === "string" &&
      String(decodeFirestoreValue(fields.stripeSubscriptionId)).trim()
        ? String(decodeFirestoreValue(fields.stripeSubscriptionId)).trim()
        : null,
    trialStartedAt:
      typeof decodeFirestoreValue(fields.trialStartedAt) === "string" &&
      String(decodeFirestoreValue(fields.trialStartedAt)).trim()
        ? String(decodeFirestoreValue(fields.trialStartedAt))
        : timestamp,
    trialEndsAt:
      typeof decodeFirestoreValue(fields.trialEndsAt) === "string" &&
      String(decodeFirestoreValue(fields.trialEndsAt)).trim()
        ? String(decodeFirestoreValue(fields.trialEndsAt))
        : timestamp,
    subscriptionActivatedAt:
      typeof decodeFirestoreValue(fields.subscriptionActivatedAt) === "string" &&
      String(decodeFirestoreValue(fields.subscriptionActivatedAt)).trim()
        ? String(decodeFirestoreValue(fields.subscriptionActivatedAt))
        : null,
    subscriptionRenewalAt:
      typeof decodeFirestoreValue(fields.subscriptionRenewalAt) === "string" &&
      String(decodeFirestoreValue(fields.subscriptionRenewalAt)).trim()
        ? String(decodeFirestoreValue(fields.subscriptionRenewalAt))
        : null,
    countryCode: deliveryPreferences.countryCode,
    deliveryTimeZone: deliveryPreferences.deliveryTimeZone,
    preferredDeliveryLocalTime:
      deliveryPreferences.preferredDeliveryLocalTime,
    onboardingReminderCount:
      typeof decodeFirestoreValue(fields.onboardingReminderCount) === "number" &&
      Number.isFinite(decodeFirestoreValue(fields.onboardingReminderCount))
        ? Math.max(0, Math.trunc(Number(decodeFirestoreValue(fields.onboardingReminderCount))))
        : 0,
    onboardingReminderLastAttemptAt:
      typeof decodeFirestoreValue(fields.onboardingReminderLastAttemptAt) === "string" &&
      String(decodeFirestoreValue(fields.onboardingReminderLastAttemptAt)).trim()
        ? String(decodeFirestoreValue(fields.onboardingReminderLastAttemptAt)).trim()
        : null,
    onboardingReminderLastSentAt:
      typeof decodeFirestoreValue(fields.onboardingReminderLastSentAt) === "string" &&
      String(decodeFirestoreValue(fields.onboardingReminderLastSentAt)).trim()
        ? String(decodeFirestoreValue(fields.onboardingReminderLastSentAt)).trim()
        : null,
    onboardingReminderLastStage:
      typeof decodeFirestoreValue(fields.onboardingReminderLastStage) === "number" &&
      Number.isFinite(decodeFirestoreValue(fields.onboardingReminderLastStage)) &&
      Number(decodeFirestoreValue(fields.onboardingReminderLastStage)) > 0
        ? Math.trunc(Number(decodeFirestoreValue(fields.onboardingReminderLastStage)))
        : null,
    onboardingReminderLastStatus:
      decodeFirestoreValue(fields.onboardingReminderLastStatus) === "sent" ||
      decodeFirestoreValue(fields.onboardingReminderLastStatus) === "failed"
        ? (decodeFirestoreValue(
            fields.onboardingReminderLastStatus,
          ) as ParentRecord["onboardingReminderLastStatus"])
        : null,
    onboardingReminderLastMessageId:
      typeof decodeFirestoreValue(fields.onboardingReminderLastMessageId) === "string" &&
      String(decodeFirestoreValue(fields.onboardingReminderLastMessageId)).trim()
        ? String(decodeFirestoreValue(fields.onboardingReminderLastMessageId)).trim()
        : null,
    onboardingReminderLastError:
      typeof decodeFirestoreValue(fields.onboardingReminderLastError) === "string" &&
      String(decodeFirestoreValue(fields.onboardingReminderLastError)).trim()
        ? String(decodeFirestoreValue(fields.onboardingReminderLastError)).trim()
        : null,
    latestInvoiceId:
      typeof decodeFirestoreValue(fields.latestInvoiceId) === "string" &&
      String(decodeFirestoreValue(fields.latestInvoiceId)).trim()
        ? String(decodeFirestoreValue(fields.latestInvoiceId)).trim()
        : null,
    latestInvoiceNumber:
      typeof decodeFirestoreValue(fields.latestInvoiceNumber) === "string" &&
      String(decodeFirestoreValue(fields.latestInvoiceNumber)).trim()
        ? String(decodeFirestoreValue(fields.latestInvoiceNumber)).trim()
        : null,
    latestInvoiceStatus:
      typeof decodeFirestoreValue(fields.latestInvoiceStatus) === "string" &&
      String(decodeFirestoreValue(fields.latestInvoiceStatus)).trim()
        ? String(decodeFirestoreValue(fields.latestInvoiceStatus)).trim()
        : null,
    latestInvoiceHostedUrl:
      typeof decodeFirestoreValue(fields.latestInvoiceHostedUrl) === "string" &&
      String(decodeFirestoreValue(fields.latestInvoiceHostedUrl)).trim()
        ? String(decodeFirestoreValue(fields.latestInvoiceHostedUrl)).trim()
        : null,
    latestInvoicePdfUrl:
      typeof decodeFirestoreValue(fields.latestInvoicePdfUrl) === "string" &&
      String(decodeFirestoreValue(fields.latestInvoicePdfUrl)).trim()
        ? String(decodeFirestoreValue(fields.latestInvoicePdfUrl)).trim()
        : null,
    latestInvoiceAmountPaid:
      typeof decodeFirestoreValue(fields.latestInvoiceAmountPaid) === "number"
        ? (decodeFirestoreValue(fields.latestInvoiceAmountPaid) as number)
        : null,
    latestInvoiceCurrency:
      typeof decodeFirestoreValue(fields.latestInvoiceCurrency) === "string" &&
      String(decodeFirestoreValue(fields.latestInvoiceCurrency)).trim()
        ? String(decodeFirestoreValue(fields.latestInvoiceCurrency)).trim()
        : null,
    latestInvoicePaidAt:
      typeof decodeFirestoreValue(fields.latestInvoicePaidAt) === "string" &&
      String(decodeFirestoreValue(fields.latestInvoicePaidAt)).trim()
        ? String(decodeFirestoreValue(fields.latestInvoicePaidAt)).trim()
        : null,
    latestInvoicePeriodStart:
      typeof decodeFirestoreValue(fields.latestInvoicePeriodStart) === "string" &&
      String(decodeFirestoreValue(fields.latestInvoicePeriodStart)).trim()
        ? String(decodeFirestoreValue(fields.latestInvoicePeriodStart)).trim()
        : null,
    latestInvoicePeriodEnd:
      typeof decodeFirestoreValue(fields.latestInvoicePeriodEnd) === "string" &&
      String(decodeFirestoreValue(fields.latestInvoicePeriodEnd)).trim()
        ? String(decodeFirestoreValue(fields.latestInvoicePeriodEnd)).trim()
        : null,
    notionWorkspaceId:
      typeof decodeFirestoreValue(fields.notionWorkspaceId) === "string" &&
      String(decodeFirestoreValue(fields.notionWorkspaceId)).trim()
        ? String(decodeFirestoreValue(fields.notionWorkspaceId)).trim()
        : null,
    notionWorkspaceName:
      typeof decodeFirestoreValue(fields.notionWorkspaceName) === "string" &&
      String(decodeFirestoreValue(fields.notionWorkspaceName)).trim()
        ? String(decodeFirestoreValue(fields.notionWorkspaceName)).trim()
        : null,
    notionBotId:
      typeof decodeFirestoreValue(fields.notionBotId) === "string" &&
      String(decodeFirestoreValue(fields.notionBotId)).trim()
        ? String(decodeFirestoreValue(fields.notionBotId)).trim()
        : null,
    notionDatabaseId:
      typeof decodeFirestoreValue(fields.notionDatabaseId) === "string" &&
      String(decodeFirestoreValue(fields.notionDatabaseId)).trim()
        ? String(decodeFirestoreValue(fields.notionDatabaseId)).trim()
        : null,
    notionDatabaseName:
      typeof decodeFirestoreValue(fields.notionDatabaseName) === "string" &&
      String(decodeFirestoreValue(fields.notionDatabaseName)).trim()
        ? String(decodeFirestoreValue(fields.notionDatabaseName)).trim()
        : null,
    notionDataSourceId:
      typeof decodeFirestoreValue(fields.notionDataSourceId) === "string" &&
      String(decodeFirestoreValue(fields.notionDataSourceId)).trim()
        ? String(decodeFirestoreValue(fields.notionDataSourceId)).trim()
        : null,
    notionAuthorizedAt:
      typeof decodeFirestoreValue(fields.notionAuthorizedAt) === "string" &&
      String(decodeFirestoreValue(fields.notionAuthorizedAt)).trim()
        ? String(decodeFirestoreValue(fields.notionAuthorizedAt)).trim()
        : null,
    notionLastSyncedAt:
      typeof decodeFirestoreValue(fields.notionLastSyncedAt) === "string" &&
      String(decodeFirestoreValue(fields.notionLastSyncedAt)).trim()
        ? String(decodeFirestoreValue(fields.notionLastSyncedAt)).trim()
        : null,
    notionLastSyncStatus:
      decodeFirestoreValue(fields.notionLastSyncStatus) === "idle" ||
      decodeFirestoreValue(fields.notionLastSyncStatus) === "success" ||
      decodeFirestoreValue(fields.notionLastSyncStatus) === "failed"
        ? (decodeFirestoreValue(fields.notionLastSyncStatus) as ParentRecord["notionLastSyncStatus"])
        : null,
    notionLastSyncMessage:
      typeof decodeFirestoreValue(fields.notionLastSyncMessage) === "string" &&
      String(decodeFirestoreValue(fields.notionLastSyncMessage)).trim()
        ? String(decodeFirestoreValue(fields.notionLastSyncMessage)).trim()
        : null,
    notionLastSyncPageId:
      typeof decodeFirestoreValue(fields.notionLastSyncPageId) === "string" &&
      String(decodeFirestoreValue(fields.notionLastSyncPageId)).trim()
        ? String(decodeFirestoreValue(fields.notionLastSyncPageId)).trim()
        : null,
    notionLastSyncPageUrl:
      typeof decodeFirestoreValue(fields.notionLastSyncPageUrl) === "string" &&
      String(decodeFirestoreValue(fields.notionLastSyncPageUrl)).trim()
        ? String(decodeFirestoreValue(fields.notionLastSyncPageUrl)).trim()
        : null,
    createdAt:
      typeof decodeFirestoreValue(fields.createdAt) === "string" &&
      String(decodeFirestoreValue(fields.createdAt)).trim()
        ? String(decodeFirestoreValue(fields.createdAt)).trim()
        : timestamp,
    updatedAt:
      typeof decodeFirestoreValue(fields.updatedAt) === "string" &&
      String(decodeFirestoreValue(fields.updatedAt)).trim()
        ? String(decodeFirestoreValue(fields.updatedAt)).trim()
        : timestamp,
  };
}

function normalizeParentCandidate(document: {
  fields?: Record<string, Record<string, unknown>>;
  name: string;
}): ParentCandidate | null {
  const fields = document.fields ?? {};
  const emailValue = decodeFirestoreValue(fields.email) as string | null;

  if (!emailValue || typeof emailValue !== "string") {
    return null;
  }

  const stripeCustomerId = decodeFirestoreValue(fields.stripeCustomerId);
  const stripeSubscriptionId = decodeFirestoreValue(fields.stripeSubscriptionId);
  const latestInvoiceId = decodeFirestoreValue(fields.latestInvoiceId);
  const parent = toParentRecord(fields, document.name);
  return {
    documentName: document.name,
    email: normalizeEmail(emailValue),
    parent: {
      ...parent,
      latestInvoiceId:
        typeof latestInvoiceId === "string" && latestInvoiceId.trim()
          ? latestInvoiceId.trim()
          : parent.latestInvoiceId,
      stripeCustomerId:
        typeof stripeCustomerId === "string" && stripeCustomerId.trim()
          ? stripeCustomerId.trim()
          : parent.stripeCustomerId,
      stripeSubscriptionId:
        typeof stripeSubscriptionId === "string" && stripeSubscriptionId.trim()
          ? stripeSubscriptionId.trim()
          : parent.stripeSubscriptionId,
    },
  };
}

async function firestoreRequest<T>(
  url: string,
  init: RequestInit,
  accessToken: string,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Firestore request failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as T;
}

async function loadParentCandidates(
  accessToken: string,
  emailFilter: string | null,
  projectId: string,
) {
  const candidates: ParentCandidate[] = [];
  let nextPageToken: string | null = null;

  do {
    const pageUrl = new URL(toFirestoreParentsCollectionUrl(projectId));

    pageUrl.searchParams.set("pageSize", "100");

    if (nextPageToken) {
      pageUrl.searchParams.set("pageToken", nextPageToken);
    }

    const payload = await firestoreRequest<{
      documents?: Array<{
        fields?: Record<string, Record<string, unknown>>;
        name: string;
      }>;
      nextPageToken?: string;
    }>(pageUrl.toString(), { method: "GET" }, accessToken);

    for (const document of payload.documents ?? []) {
      const candidate = normalizeParentCandidate(document);

      if (!candidate) {
        continue;
      }

      if (emailFilter && candidate.email !== emailFilter) {
        continue;
      }

      if (!emailFilter && !candidate.parent.stripeCustomerId && !candidate.parent.stripeSubscriptionId) {
        continue;
      }

      candidates.push(candidate);
    }

    nextPageToken = payload.nextPageToken ?? null;
  } while (nextPageToken);

  return candidates.toSorted((left, right) => left.email.localeCompare(right.email));
}

function isStripeMissingResourceError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "resource_missing"
  );
}

async function retrieveSubscriptionById(
  stripe: Stripe,
  subscriptionId: string,
) {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice"],
    });
  } catch (error) {
    if (isStripeMissingResourceError(error)) {
      return null;
    }

    throw error;
  }
}

async function retrieveStripeSubscriptionForBackfill(
  stripe: Stripe,
  parent: ParentCandidate,
) {
  if (parent.parent.stripeSubscriptionId) {
    const subscription = await retrieveSubscriptionById(stripe, parent.parent.stripeSubscriptionId);

    if (subscription) {
      return subscription;
    }
  }

  if (!parent.parent.stripeCustomerId) {
    return null;
  }

  let subscriptions: Stripe.ApiList<Stripe.Subscription>;

  try {
    subscriptions = await stripe.subscriptions.list({
      customer: parent.parent.stripeCustomerId,
      limit: 10,
      status: "all",
    });
  } catch (error) {
    if (isStripeMissingResourceError(error)) {
      return null;
    }

    throw error;
  }
  const selected = selectStripeBackfillSubscription(subscriptions.data);

  if (!selected) {
    return null;
  }

  return retrieveSubscriptionById(stripe, selected.id);
}

async function retrieveLatestInvoiceForBackfill(
  stripe: Stripe,
  parent: ParentCandidate,
  subscription: Stripe.Subscription | null,
) {
  const expandedLatestInvoice = subscription?.latest_invoice;

  if (expandedLatestInvoice && typeof expandedLatestInvoice !== "string") {
    return expandedLatestInvoice;
  }

  if (subscription?.id) {
    const invoices = await stripe.invoices.list({
      limit: 1,
      subscription: subscription.id,
    });

    if (invoices.data[0]) {
      return invoices.data[0];
    }
  }

  if (!parent.parent.stripeCustomerId) {
    return null;
  }

  let invoices: Stripe.ApiList<Stripe.Invoice>;

  try {
    invoices = await stripe.invoices.list({
      customer: parent.parent.stripeCustomerId,
      limit: 1,
    });
  } catch (error) {
    if (isStripeMissingResourceError(error)) {
      return null;
    }

    throw error;
  }

  return invoices.data[0] ?? null;
}

function buildFirestorePatchFields(update: Record<string, number | string | null | undefined>) {
  const entries = Object.entries(update).filter(([, value]) => value !== undefined);
  const fields = Object.fromEntries(
    entries.map(([key, value]) => [key, encodeFirestoreValue(value ?? null)]),
  );
  const updateMask = entries.map(([key]) => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join("&");

  return {
    fields,
    updateMask,
  };
}

async function patchParentSubscriptionState(
  accessToken: string,
  documentName: string,
  update: Record<string, number | string | null | undefined>,
) {
  const now = new Date().toISOString();
  const payload = {
    ...update,
    updatedAt: now,
  };
  const { fields, updateMask } = buildFirestorePatchFields(payload);
  const url = `${toFirestoreDocumentUrl(documentName)}?${updateMask}`;

  await firestoreRequest(
    url,
    {
      body: JSON.stringify({
        fields,
      }),
      method: "PATCH",
    },
    accessToken,
  );
}

async function main() {
  const stripeApiKey = getStripeApiKey();
  const projectId = getProjectId();

  if (!stripeApiKey) {
    throw new Error("STRIPE_API_KEY or STRIPE_SECRET_KEY is required.");
  }

  const args = parseArgs(process.argv.slice(2));
  const stripe = new Stripe(stripeApiKey);
  const accessToken = getGoogleAccessToken();
  const candidates = await loadParentCandidates(
    accessToken,
    args.email ? normalizeEmail(args.email) : null,
    projectId,
  );
  const limitedCandidates =
    args.limit && args.limit > 0 ? candidates.slice(0, args.limit) : candidates;

  if (limitedCandidates.length === 0) {
    console.log("No parent profiles matched the requested backfill filter.");
    return;
  }

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        parentsMatched: limitedCandidates.length,
        projectId,
      },
      null,
      2,
    ),
  );

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const candidate of limitedCandidates) {
    try {
      const subscription = await retrieveStripeSubscriptionForBackfill(stripe, candidate);
      const latestInvoice = await retrieveLatestInvoiceForBackfill(
        stripe,
        candidate,
        subscription,
      );

      if (!subscription && !latestInvoice) {
        skippedCount += 1;

        console.log(
          JSON.stringify(
            {
              dryRun: args.dryRun,
              email: candidate.email,
              foundLatestInvoice: false,
              foundStripeSubscription: false,
              latestInvoiceId: null,
              skippedReason: "No Stripe subscription or invoice was found for this parent.",
              stripeSubscriptionId: candidate.parent.stripeSubscriptionId,
            },
            null,
            2,
          ),
        );

        continue;
      }

      const update = getStripeBackfillUpdate({
        latestInvoice,
        parent: candidate.parent,
        subscription,
      });

      if (!args.dryRun) {
        await patchParentSubscriptionState(accessToken, candidate.documentName, update);
      }

      updatedCount += 1;

      console.log(
        JSON.stringify(
          {
            dryRun: args.dryRun,
            email: candidate.email,
            foundLatestInvoice: Boolean(latestInvoice),
            foundStripeSubscription: Boolean(subscription),
            latestInvoiceId: latestInvoice?.id ?? null,
            skippedReason: null,
            stripeSubscriptionId: subscription?.id ?? candidate.parent.stripeSubscriptionId,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      errorCount += 1;
      console.error(
        JSON.stringify(
          {
            email: candidate.email,
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2,
        ),
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        errorCount,
        parentsProcessed: limitedCandidates.length,
        skippedCount,
        updatedCount,
      },
      null,
      2,
    ),
  );

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

void main();

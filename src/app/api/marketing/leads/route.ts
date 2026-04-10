import {
  captureMarketingLead,
  recordMarketingLeadDelivery,
} from "../../../../lib/marketing-lead-store";
import { sendMarketingLeadStarterKitEmail } from "../../../../lib/marketing-lead-email";
import type { MarketingLeadStageInterest } from "../../../../lib/marketing-lead-store-types";

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function normalizeStageInterest(value: unknown): MarketingLeadStageInterest {
  return value === "MYP" || value === "DP" ? value : "NOT_SURE";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string;
        fullName?: string;
        childStageInterest?: string;
        source?: string;
        pagePath?: string;
        referrerUrl?: string | null;
        utmSource?: string | null;
        utmMedium?: string | null;
        utmCampaign?: string | null;
        utmContent?: string | null;
        utmTerm?: string | null;
      }
    | null;

  const email = normalizeString(body?.email).toLowerCase();
  const fullName = normalizeString(body?.fullName);

  if (!fullName) {
    return badRequest("Please share your name so we can personalise the starter kit.");
  }

  if (!email || !isValidEmail(email)) {
    return badRequest("Please enter a valid parent email.");
  }

  const captured = await captureMarketingLead({
    email,
    fullName,
    childStageInterest: normalizeStageInterest(body?.childStageInterest),
    source: "ib-parent-starter-kit",
    pagePath: normalizeString(body?.pagePath) || "/ib-parent-starter-kit",
    referrerUrl: normalizeNullableString(body?.referrerUrl),
    utmSource: normalizeNullableString(body?.utmSource),
    utmMedium: normalizeNullableString(body?.utmMedium),
    utmCampaign: normalizeNullableString(body?.utmCampaign),
    utmContent: normalizeNullableString(body?.utmContent),
    utmTerm: normalizeNullableString(body?.utmTerm),
  });

  const delivery = await sendMarketingLeadStarterKitEmail({
    lead: captured.lead,
  }).catch((error) => ({
    sent: false,
    skipped: false,
    reason:
      error instanceof Error && error.message.trim()
        ? error.message
        : "Starter kit delivery failed.",
  }));
  const deliveryMessageId =
    "messageId" in delivery ? delivery.messageId ?? null : null;

  await recordMarketingLeadDelivery({
    leadId: captured.lead.id,
    status: delivery.sent ? "sent" : delivery.skipped ? "skipped" : "failed",
    messageId: delivery.sent ? deliveryMessageId : null,
    errorMessage: delivery.sent ? null : delivery.reason,
  });

  return Response.json({
    leadId: captured.lead.id,
    isNewLead: captured.isNew,
    deliveryStatus: delivery.sent ? "sent" : delivery.skipped ? "skipped" : "failed",
    message: delivery.sent
      ? "Your starter kit is on the way."
      : delivery.skipped
        ? "Your starter kit was saved, but email delivery is not configured yet."
        : "Your starter kit was saved, but email delivery failed.",
    starterKitHref: "/ib-parent-starter-kit",
    guides: [
      "/ib-myp-reading-support",
      "/ib-dp-reading-and-writing-support",
      "/myp-vs-dp-reading-model",
    ],
  });
}

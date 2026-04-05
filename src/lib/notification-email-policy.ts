export const NOTIFICATION_EMAIL_FAMILIES = [
  "onboarding-reminder",
  "goodnotes-welcome-note-delivery",
  "daily-brief-delivery",
  "trial-ending-reminder",
  "billing-status-update",
  "delivery-support-alert",
] as const;

export type NotificationEmailFamily =
  (typeof NOTIFICATION_EMAIL_FAMILIES)[number];

export type NotificationEmailLifecycle = "live" | "planned";
export type NotificationEmailRenderMode =
  | "html-notification"
  | "pdf-attachment-transport";
export type NotificationEmailAssetMode = "html-only" | "pdf-attachment";
export type NotificationEmailAudience =
  | "parent-inbox"
  | "goodnotes-destination";

export type NotificationEmailPolicy = {
  id: NotificationEmailFamily;
  lifecycle: NotificationEmailLifecycle;
  label: string;
  renderMode: NotificationEmailRenderMode;
  assetMode: NotificationEmailAssetMode;
  audience: NotificationEmailAudience;
  rationale: string;
};

const NOTIFICATION_EMAIL_POLICY_MAP: Record<
  NotificationEmailFamily,
  NotificationEmailPolicy
> = {
  "onboarding-reminder": {
    id: "onboarding-reminder",
    lifecycle: "live",
    label: "Onboarding reminder",
    renderMode: "html-notification",
    assetMode: "html-only",
    audience: "parent-inbox",
    rationale:
      "This email exists to prompt one next action, so it should stay lightweight, skimmable, and CTA-led.",
  },
  "goodnotes-welcome-note-delivery": {
    id: "goodnotes-welcome-note-delivery",
    lifecycle: "live",
    label: "Goodnotes welcome note delivery",
    renderMode: "pdf-attachment-transport",
    assetMode: "pdf-attachment",
    audience: "goodnotes-destination",
    rationale:
      "The PDF attachment is the product and the email is only the transport envelope into Goodnotes.",
  },
  "daily-brief-delivery": {
    id: "daily-brief-delivery",
    lifecycle: "live",
    label: "Daily Brief delivery",
    renderMode: "pdf-attachment-transport",
    assetMode: "pdf-attachment",
    audience: "goodnotes-destination",
    rationale:
      "The learning asset must remain a stable Typst PDF, so the email stays a transport layer rather than a primary reading surface.",
  },
  "trial-ending-reminder": {
    id: "trial-ending-reminder",
    lifecycle: "planned",
    label: "Trial ending reminder",
    renderMode: "html-notification",
    assetMode: "html-only",
    audience: "parent-inbox",
    rationale:
      "Trial reminders are timing-sensitive parent prompts and should be fast to read on mobile.",
  },
  "billing-status-update": {
    id: "billing-status-update",
    lifecycle: "planned",
    label: "Billing status update",
    renderMode: "html-notification",
    assetMode: "html-only",
    audience: "parent-inbox",
    rationale:
      "Billing and payment updates should prioritize clarity, immediacy, and a clear follow-up action rather than an attachment.",
  },
  "delivery-support-alert": {
    id: "delivery-support-alert",
    lifecycle: "planned",
    label: "Delivery support alert",
    renderMode: "html-notification",
    assetMode: "html-only",
    audience: "parent-inbox",
    rationale:
      "Support and channel-attention messages are operational notifications, not learning assets.",
  },
};

export function getNotificationEmailPolicy(
  id: NotificationEmailFamily,
): NotificationEmailPolicy {
  return NOTIFICATION_EMAIL_POLICY_MAP[id];
}

export function listNotificationEmailPolicies(): NotificationEmailPolicy[] {
  return NOTIFICATION_EMAIL_FAMILIES.map((id) =>
    getNotificationEmailPolicy(id),
  );
}

export function listLiveNotificationEmailPolicies(): NotificationEmailPolicy[] {
  return listNotificationEmailPolicies().filter(
    (policy) => policy.lifecycle === "live",
  );
}


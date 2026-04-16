import type { MarketingAttributionSource } from "./marketing-attribution";

export const IB_PROGRAMMES = ["PYP", "MYP", "DP"] as const;
export type Programme = (typeof IB_PROGRAMMES)[number];

export const PROGRAMME_YEAR_OPTIONS: Record<Programme, number[]> = {
  PYP: [1, 2, 3, 4, 5, 6],
  MYP: [1, 2, 3, 4, 5],
  DP: [1, 2],
};

export const DEFAULT_PROGRAMME: Programme = "PYP";
export const DEFAULT_PROGRAMME_YEAR = 5;

export function isProgramme(value: string): value is Programme {
  return IB_PROGRAMMES.includes(value as Programme);
}

export function getProgrammeYearOptions(programme: Programme) {
  return PROGRAMME_YEAR_OPTIONS[programme];
}

export function isValidProgrammeYear(programme: Programme, year: number) {
  return getProgrammeYearOptions(programme).includes(year);
}

export function getDefaultProgrammeYear(programme: Programme) {
  if (programme === "MYP") {
    return 3;
  }

  if (programme === "DP") {
    return 1;
  }

  return DEFAULT_PROGRAMME_YEAR;
}

export type SubscriptionStatus = "free" | "trial" | "active" | "canceled";
export const SUBSCRIPTION_PLANS = ["monthly", "yearly"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number] | null;
export type GoodnotesDeliveryStatus = "idle" | "success" | "failed";
export type OnboardingReminderStatus = "sent" | "failed";
export type TrialConversionNurtureStatus = "sent" | "failed";

export function isSubscriptionPlan(
  value: string,
): value is (typeof SUBSCRIPTION_PLANS)[number] {
  return SUBSCRIPTION_PLANS.includes(
    value as (typeof SUBSCRIPTION_PLANS)[number],
  );
}

export type ParentRecord = {
  id: string;
  email: string;
  fullName: string;
  countryCode: string;
  deliveryTimeZone: string;
  preferredDeliveryLocalTime: string;
  firstAuthenticatedAt?: string | null;
  childProfileCompletedAt?: string | null;
  firstDispatchableChannelAt?: string | null;
  firstBriefDeliveredAt?: string | null;
  firstPaidAt?: string | null;
  acquisitionSource?: MarketingAttributionSource | null;
  acquisitionCapturedAt?: string | null;
  acquisitionLeadId?: string | null;
  acquisitionReferralInviteId?: string | null;
  acquisitionPagePath?: string | null;
  acquisitionReferrerUrl?: string | null;
  acquisitionUtmSource?: string | null;
  acquisitionUtmMedium?: string | null;
  acquisitionUtmCampaign?: string | null;
  acquisitionUtmContent?: string | null;
  acquisitionUtmTerm?: string | null;
  onboardingReminderCount: number;
  onboardingReminderLastAttemptAt: string | null;
  onboardingReminderLastSentAt: string | null;
  onboardingReminderLastStage: number | null;
  onboardingReminderLastStatus: OnboardingReminderStatus | null;
  onboardingReminderLastMessageId: string | null;
  onboardingReminderLastError: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialStartedAt: string;
  trialEndsAt: string;
  subscriptionActivatedAt: string | null;
  subscriptionRenewalAt: string | null;
  latestInvoiceId: string | null;
  latestInvoiceNumber: string | null;
  latestInvoiceStatus: string | null;
  latestInvoiceHostedUrl: string | null;
  latestInvoicePdfUrl: string | null;
  latestInvoiceAmountPaid: number | null;
  latestInvoiceCurrency: string | null;
  latestInvoicePaidAt: string | null;
  latestInvoicePeriodStart: string | null;
  latestInvoicePeriodEnd: string | null;
  trialEndingReminderLastNotifiedAt?: string | null;
  trialEndingReminderLastTrialEndsAt?: string | null;
  trialEndingReminderLastResolvedAt?: string | null;
  trialEndingReminderLastResolvedTrialEndsAt?: string | null;
  billingStatusNotificationLastSentAt?: string | null;
  billingStatusNotificationLastInvoiceId?: string | null;
  billingStatusNotificationLastInvoiceStatus?: string | null;
  billingStatusNotificationLastResolvedAt?: string | null;
  billingStatusNotificationLastResolvedInvoiceId?: string | null;
  billingStatusNotificationLastResolvedInvoiceStatus?: string | null;
  deliverySupportAlertLastNotifiedAt?: string | null;
  deliverySupportAlertLastReasonKey?: string | null;
  deliverySupportAlertLastResolvedAt?: string | null;
  deliverySupportAlertLastResolvedReasonKey?: string | null;
  trialConversionNurtureCount?: number;
  trialConversionNurtureLastAttemptAt?: string | null;
  trialConversionNurtureLastSentAt?: string | null;
  trialConversionNurtureLastStage?: number | null;
  trialConversionNurtureLastStatus?: TrialConversionNurtureStatus | null;
  trialConversionNurtureLastMessageId?: string | null;
  trialConversionNurtureLastError?: string | null;
  notionWorkspaceId: string | null;
  notionWorkspaceName: string | null;
  notionBotId: string | null;
  notionDatabaseId: string | null;
  notionDatabaseName: string | null;
  notionDataSourceId: string | null;
  notionAuthorizedAt: string | null;
  notionLastSyncedAt: string | null;
  notionLastSyncStatus: "idle" | "success" | "failed" | null;
  notionLastSyncMessage: string | null;
  notionLastSyncPageId: string | null;
  notionLastSyncPageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentRecord = {
  id: string;
  parentId: string;
  studentName: string;
  programme: Programme;
  programmeYear: number;
  academicTier?: "foundation" | "core" | "enriched";
  learnerPersona?: "analytical" | "reflective" | "general";
  engagementStats?: {
    last7DaysScore: number;
    totalTasks: number;
    completedTasks: number;
    snapshotDate: string;
  };
  adaptationHistory?: Array<{
    date: string;
    from: string;
    to: string;
    reason: string;
  }>;
  interestTags?: string[];
  goodnotesEmail: string;
  goodnotesConnected: boolean;
  goodnotesVerifiedAt: string | null;
  goodnotesLastTestSentAt: string | null;
  goodnotesLastDeliveryStatus: GoodnotesDeliveryStatus | null;
  goodnotesLastDeliveryMessage: string | null;
  notionConnected: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ParentProfile = {
  parent: ParentRecord;
  student: StudentRecord;
};

export type MvpStoreData = {
  parents: ParentRecord[];
  students: StudentRecord[];
  notionConnections: NotionConnectionSecretRecord[];
};

export type CreateParentProfileInput = {
  email: string;
  fullName?: string;
  studentName?: string;
};

export type UpdateStudentPreferencesInput = {
  studentName: string;
  programme: Programme;
  programmeYear: number;
  interestTags?: string[];
  goodnotesEmail?: string;
};

export type UpdateStudentGoodnotesInput = {
  goodnotesEmail?: string;
  goodnotesConnected?: boolean;
  goodnotesVerifiedAt?: string | null;
  goodnotesLastTestSentAt?: string | null;
  goodnotesLastDeliveryStatus?: GoodnotesDeliveryStatus | null;
  goodnotesLastDeliveryMessage?: string | null;
};

export type UpdateParentSubscriptionInput = {
  subscriptionPlan?: (typeof SUBSCRIPTION_PLANS)[number];
  subscriptionStatus?: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  trialStartedAt?: string;
  trialEndsAt?: string;
  subscriptionActivatedAt?: string | null;
  subscriptionRenewalAt?: string | null;
  latestInvoiceId?: string | null;
  latestInvoiceNumber?: string | null;
  latestInvoiceStatus?: string | null;
  latestInvoiceHostedUrl?: string | null;
  latestInvoicePdfUrl?: string | null;
  latestInvoiceAmountPaid?: number | null;
  latestInvoiceCurrency?: string | null;
  latestInvoicePaidAt?: string | null;
  latestInvoicePeriodStart?: string | null;
  latestInvoicePeriodEnd?: string | null;
};

export type UpdateParentNotionInput = {
  notionWorkspaceId?: string | null;
  notionWorkspaceName?: string | null;
  notionBotId?: string | null;
  notionDatabaseId?: string | null;
  notionDatabaseName?: string | null;
  notionDataSourceId?: string | null;
  notionAuthorizedAt?: string | null;
  notionLastSyncedAt?: string | null;
  notionLastSyncStatus?: "idle" | "success" | "failed" | null;
  notionLastSyncMessage?: string | null;
  notionLastSyncPageId?: string | null;
  notionLastSyncPageUrl?: string | null;
  notionConnected?: boolean;
};

export type UpdateParentDeliveryPreferencesInput = {
  countryCode: string;
  deliveryTimeZone: string;
  preferredDeliveryLocalTime: string;
};

export type UpdateParentOnboardingReminderInput = {
  onboardingReminderCount?: number;
  onboardingReminderLastAttemptAt?: string | null;
  onboardingReminderLastSentAt?: string | null;
  onboardingReminderLastStage?: number | null;
  onboardingReminderLastStatus?: OnboardingReminderStatus | null;
  onboardingReminderLastMessageId?: string | null;
  onboardingReminderLastError?: string | null;
};

export type UpdateParentGrowthMilestonesInput = {
  childProfileCompletedAt?: string | null;
  firstDispatchableChannelAt?: string | null;
  firstBriefDeliveredAt?: string | null;
  firstPaidAt?: string | null;
};

export type UpdateParentAcquisitionSnapshotInput = {
  acquisitionSource?: MarketingAttributionSource | null;
  acquisitionCapturedAt?: string | null;
  acquisitionLeadId?: string | null;
  acquisitionReferralInviteId?: string | null;
  acquisitionPagePath?: string | null;
  acquisitionReferrerUrl?: string | null;
  acquisitionUtmSource?: string | null;
  acquisitionUtmMedium?: string | null;
  acquisitionUtmCampaign?: string | null;
  acquisitionUtmContent?: string | null;
  acquisitionUtmTerm?: string | null;
};

export type UpdateParentNotificationEmailStateInput = {
  trialEndingReminderLastNotifiedAt?: string | null;
  trialEndingReminderLastTrialEndsAt?: string | null;
  trialEndingReminderLastResolvedAt?: string | null;
  trialEndingReminderLastResolvedTrialEndsAt?: string | null;
  billingStatusNotificationLastSentAt?: string | null;
  billingStatusNotificationLastInvoiceId?: string | null;
  billingStatusNotificationLastInvoiceStatus?: string | null;
  billingStatusNotificationLastResolvedAt?: string | null;
  billingStatusNotificationLastResolvedInvoiceId?: string | null;
  billingStatusNotificationLastResolvedInvoiceStatus?: string | null;
  deliverySupportAlertLastNotifiedAt?: string | null;
  deliverySupportAlertLastReasonKey?: string | null;
  deliverySupportAlertLastResolvedAt?: string | null;
  deliverySupportAlertLastResolvedReasonKey?: string | null;
  trialConversionNurtureCount?: number;
  trialConversionNurtureLastAttemptAt?: string | null;
  trialConversionNurtureLastSentAt?: string | null;
  trialConversionNurtureLastStage?: number | null;
  trialConversionNurtureLastStatus?: TrialConversionNurtureStatus | null;
  trialConversionNurtureLastMessageId?: string | null;
  trialConversionNurtureLastError?: string | null;
};

export type NotionConnectionSecretRecord = {
  parentId: string;
  accessTokenCiphertext: string;
  refreshTokenCiphertext: string | null;
  workspaceId: string;
  botId: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

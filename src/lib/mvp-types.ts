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
  goodnotesEmail: string;
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
  goodnotesEmail: string;
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

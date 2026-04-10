export type MarketingLeadStageInterest = "MYP" | "DP" | "NOT_SURE";

export type MarketingLeadSource = "ib-parent-starter-kit";

export type MarketingLeadDeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export type MarketingLeadRecord = {
  id: string;
  email: string;
  fullName: string;
  childStageInterest: MarketingLeadStageInterest;
  source: MarketingLeadSource;
  pagePath: string;
  referrerUrl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  captureCount: number;
  deliveryStatus: MarketingLeadDeliveryStatus;
  deliveryMessageId: string | null;
  deliveryErrorMessage: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingLeadFilters = {
  email?: string;
  source?: MarketingLeadSource;
  limit?: number;
};

export type MarketingLeadStore = {
  listLeads(filters?: MarketingLeadFilters): Promise<MarketingLeadRecord[]>;
  upsertLead(record: MarketingLeadRecord): Promise<MarketingLeadRecord>;
};

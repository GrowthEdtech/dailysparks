import type { PlannedNotificationFamily } from "./planned-notification-state";

export type PlannedNotificationRunStatus =
  | "sent"
  | "skipped"
  | "failed"
  | "resolved";

export type PlannedNotificationRunSource =
  | "growth-reconciliation"
  | "stripe-webhook"
  | "manual-resend"
  | "manual-resolve";

export type PlannedNotificationRunRecord = {
  id: string;
  runAt: string;
  runDate: string;
  parentId: string;
  parentEmail: string;
  notificationFamily: PlannedNotificationFamily;
  source: PlannedNotificationRunSource;
  status: PlannedNotificationRunStatus;
  reason: string | null;
  deduped: boolean;
  messageId: string | null;
  errorMessage: string | null;
  invoiceId: string | null;
  invoiceStatus: string | null;
  trialEndsAt: string | null;
  reasonKey: string | null;
  createdAt: string;
};

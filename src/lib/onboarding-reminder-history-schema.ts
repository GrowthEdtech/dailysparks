import type { OnboardingReminderStatus } from "./mvp-types";

export type OnboardingReminderRunRecord = {
  id: string;
  runAt: string;
  runDate: string;
  parentId: string;
  parentEmail: string;
  stageIndex: number;
  stageLabel: string;
  status: OnboardingReminderStatus;
  messageId: string | null;
  errorMessage: string | null;
  createdAt: string;
};

import type { PromptPolicyRecord } from "./prompt-policy-schema";

export type CreatePromptPolicyInput = Omit<
  PromptPolicyRecord,
  "id" | "status" | "createdAt" | "updatedAt" | "activatedAt"
>;

export type UpdatePromptPolicyInput = Partial<CreatePromptPolicyInput>;

export type PromptPolicyStore = {
  listPolicies(): Promise<PromptPolicyRecord[]>;
  getPolicy(id: string): Promise<PromptPolicyRecord | null>;
  createPolicy(record: PromptPolicyRecord): Promise<PromptPolicyRecord>;
  updatePolicy(
    id: string,
    updater: (
      policies: PromptPolicyRecord[],
      existingPolicy: PromptPolicyRecord,
    ) => PromptPolicyRecord[],
  ): Promise<PromptPolicyRecord | null>;
};

export const AI_CONNECTION_PROVIDER_TYPES = ["openai-compatible"] as const;
export const DEFAULT_AI_CONNECTION_BASE_URL = "https://relay.nf.video/v1";
export const DEFAULT_AI_CONNECTION_MODEL = "gpt-5.4";

export type AiConnectionProviderType =
  (typeof AI_CONNECTION_PROVIDER_TYPES)[number];

export type AiConnectionRecord = {
  id: string;
  name: string;
  providerType: AiConnectionProviderType;
  baseUrl: string;
  defaultModel: string;
  apiKeyPreview: string;
  hasApiKey: boolean;
  active: boolean;
  isDefault: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

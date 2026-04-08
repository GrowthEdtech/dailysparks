export const AI_CONNECTION_PROVIDER_TYPES = [
  "openai-compatible",
  "vertex-openai-compatible",
] as const;
export const DEFAULT_AI_CONNECTION_BASE_URL = "https://relay.nf.video/v1";
export const DEFAULT_AI_CONNECTION_MODEL = "gpt-5.4";
export const DEFAULT_VERTEX_AI_LOCATION = "global";
export const DEFAULT_VERTEX_AI_MODEL = "google/gemini-3.1-pro-preview";

export type AiConnectionProviderType =
  (typeof AI_CONNECTION_PROVIDER_TYPES)[number];

export function buildVertexAiOpenAiBaseUrl(projectId: string, location: string) {
  return `https://aiplatform.googleapis.com/v1/projects/${projectId.trim()}/locations/${location.trim()}/endpoints/openapi`;
}

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
  vertexProjectId?: string;
  vertexLocation?: string;
  serviceAccountEmail?: string;
  createdAt: string;
  updatedAt: string;
};

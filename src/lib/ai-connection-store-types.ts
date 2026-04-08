import type {
  AiConnectionProviderType,
  AiConnectionRecord,
} from "./ai-connection-schema";

export type StoredAiConnectionRecord = AiConnectionRecord & {
  apiKeyCiphertext: string;
};

export type CreateAiConnectionInput = {
  name: string;
  providerType: AiConnectionProviderType;
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
  active: boolean;
  isDefault: boolean;
  notes: string;
  vertexProjectId?: string;
  vertexLocation?: string;
  serviceAccountEmail?: string;
};

export type UpdateAiConnectionInput = Partial<
  Omit<CreateAiConnectionInput, "apiKey">
> & {
  apiKey?: string;
};

export type AiConnectionStore = {
  listConnections(): Promise<StoredAiConnectionRecord[]>;
  createConnection(
    record: StoredAiConnectionRecord,
  ): Promise<StoredAiConnectionRecord>;
  updateConnection(
    id: string,
    updater: (
      connections: StoredAiConnectionRecord[],
      existingConnection: StoredAiConnectionRecord,
    ) => StoredAiConnectionRecord[],
  ): Promise<StoredAiConnectionRecord | null>;
  deleteConnection(id: string): Promise<boolean>;
};

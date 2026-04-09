import {
  getDefaultAiConnectionPolicyWithSecret,
  recordAiConnectionRuntimeResult,
  type RuntimeAiConnectionWithProvider,
} from "./ai-connection-store";
import { getVertexAccessToken } from "./vertex-ai-auth";

export type OpenAiCompatibleTextGenerationInput = {
  connection: RuntimeAiConnectionWithProvider;
  developerPrompt: string;
  userPrompt: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  getVertexAccessToken?: typeof getVertexAccessToken;
};

export type OpenAiCompatibleTextGenerationResult = {
  text: string;
  model: string;
};

export type AiConnectionPolicyGenerationInput = {
  primaryConnection: RuntimeAiConnectionWithProvider;
  fallbackConnection?: RuntimeAiConnectionWithProvider | null;
  developerPrompt: string;
  userPrompt: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  getVertexAccessToken?: typeof getVertexAccessToken;
  now?: () => number;
  recordRuntimeResult?: typeof recordAiConnectionRuntimeResult;
};

export type AiConnectionPolicyGenerationResult =
  OpenAiCompatibleTextGenerationResult & {
    connectionUsed: RuntimeAiConnectionWithProvider;
    fallbackUsed: boolean;
  };

type ChatCompletionResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string; type?: string } | string>;
    };
  }>;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function extractAssistantText(payload: ChatCompletionResponse) {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part.text ?? ""))
      .join("")
      .trim();
  }

  throw new Error("AI runtime returned no assistant content.");
}

export async function generateOpenAiCompatibleText(
  input: OpenAiCompatibleTextGenerationInput,
): Promise<OpenAiCompatibleTextGenerationResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const authorizationToken =
    input.connection.providerType === "vertex-openai-compatible"
      ? await (input.getVertexAccessToken ?? getVertexAccessToken)(
          input.connection,
        )
      : input.connection.apiKey;
  const response = await fetchImpl(
    `${trimTrailingSlash(input.connection.baseUrl)}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authorizationToken}`,
      },
      signal: input.signal,
      body: JSON.stringify({
        model: input.connection.defaultModel,
        messages: [
          {
            role: "developer",
            content: input.developerPrompt,
          },
          {
            role: "user",
            content: input.userPrompt,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`AI runtime request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;

  return {
    text: extractAssistantText(payload),
    model: payload.model ?? input.connection.defaultModel,
  };
}

export async function generateTextWithConnectionPolicy(
  input: AiConnectionPolicyGenerationInput,
): Promise<AiConnectionPolicyGenerationResult> {
  const now = input.now ?? Date.now;
  const record = input.recordRuntimeResult ?? recordAiConnectionRuntimeResult;
  const primaryStartedAt = now();

  try {
    const primaryResult = await generateOpenAiCompatibleText({
      connection: input.primaryConnection,
      developerPrompt: input.developerPrompt,
      userPrompt: input.userPrompt,
      fetchImpl: input.fetchImpl,
      signal: input.signal,
      getVertexAccessToken: input.getVertexAccessToken,
    });
    const latencyMs = Math.max(now() - primaryStartedAt, 0);

    await record({
      connectionId: input.primaryConnection.id,
      status: "success",
      latencyMs,
      model: primaryResult.model,
    });

    return {
      ...primaryResult,
      connectionUsed: input.primaryConnection,
      fallbackUsed: false,
    };
  } catch (primaryError) {
    const primaryLatencyMs = Math.max(now() - primaryStartedAt, 0);
    const primaryErrorMessage =
      primaryError instanceof Error
        ? primaryError.message
        : "AI runtime request failed.";

    await record({
      connectionId: input.primaryConnection.id,
      status: "failed",
      latencyMs: primaryLatencyMs,
      errorMessage: primaryErrorMessage,
    });

    if (!input.fallbackConnection) {
      throw primaryError;
    }

    const fallbackStartedAt = now();

    try {
      const fallbackResult = await generateOpenAiCompatibleText({
        connection: input.fallbackConnection,
        developerPrompt: input.developerPrompt,
        userPrompt: input.userPrompt,
        fetchImpl: input.fetchImpl,
        signal: input.signal,
        getVertexAccessToken: input.getVertexAccessToken,
      });
      const fallbackLatencyMs = Math.max(now() - fallbackStartedAt, 0);

      await record({
        connectionId: input.fallbackConnection.id,
        status: "fallback-succeeded",
        latencyMs: fallbackLatencyMs,
        model: fallbackResult.model,
      });

      return {
        ...fallbackResult,
        connectionUsed: input.fallbackConnection,
        fallbackUsed: true,
      };
    } catch (fallbackError) {
      const fallbackLatencyMs = Math.max(now() - fallbackStartedAt, 0);
      const fallbackErrorMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : "AI fallback request failed.";

      await record({
        connectionId: input.fallbackConnection.id,
        status: "failed",
        latencyMs: fallbackLatencyMs,
        errorMessage: fallbackErrorMessage,
      });

      throw fallbackError;
    }
  }
}

export async function generateTextWithDefaultAiConnectionPolicy(
  input: Omit<
    AiConnectionPolicyGenerationInput,
    "primaryConnection" | "fallbackConnection" | "recordRuntimeResult"
  >,
) {
  const policy = await getDefaultAiConnectionPolicyWithSecret();

  if (!policy) {
    throw new Error("No default AI connection is configured.");
  }

  return generateTextWithConnectionPolicy({
    primaryConnection: policy.primaryConnection,
    fallbackConnection: policy.fallbackConnection,
    developerPrompt: input.developerPrompt,
    userPrompt: input.userPrompt,
    fetchImpl: input.fetchImpl,
    signal: input.signal,
    getVertexAccessToken: input.getVertexAccessToken,
    now: input.now,
  });
}

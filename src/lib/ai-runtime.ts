import type { RuntimeAiConnectionWithProvider } from "./ai-connection-store";
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

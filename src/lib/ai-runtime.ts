import type { RuntimeAiConnection } from "./ai-connection-store";

export type OpenAiCompatibleTextGenerationInput = {
  connection: RuntimeAiConnection;
  developerPrompt: string;
  userPrompt: string;
  fetchImpl?: typeof fetch;
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
  const response = await fetchImpl(
    `${trimTrailingSlash(input.connection.baseUrl)}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.connection.apiKey}`,
      },
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

import { Buffer } from "node:buffer";

import type { GeneratedDailyBriefDraft } from "./daily-brief-orchestrator";
import { buildDailyBriefKnowledgeBank } from "./daily-brief-knowledge-bank";
import type { DailyBriefKnowledgeBankSection } from "./daily-brief-knowledge-bank";
import type {
  DailyBriefNotebookWeeklyRecap,
} from "./daily-brief-notebook-weekly-recap";
import type {
  DailyBriefNotebookWeeklyRecapRecord,
} from "./daily-brief-notebook-weekly-recap-store";
import type { ParentProfile } from "./mvp-types";
import type { NotionConnectionSecretRecord } from "./mvp-types";
import { clearNotionConnectionSecret, getNotionConnectionSecret, setNotionConnectionSecret } from "./notion-connection-store";
import { getNotionConfig } from "./notion-config";
import { decryptNotionToken, encryptNotionToken } from "./notion-crypto";
import { buildOutboundDailyBriefPacket } from "./outbound-daily-brief-packet";

type OAuthTokenResponse = {
  access_token: string;
  refresh_token?: string | null;
  workspace_id: string;
  workspace_name?: string | null;
  bot_id: string;
  expires_in?: number | null;
};

type NotionPageOption = {
  id: string;
  title: string;
  url: string;
};

type NotionArchiveRecord = {
  databaseId: string;
  databaseName: string;
  dataSourceId: string | null;
};

type NotionTestSyncResult = {
  pageId: string;
  pageUrl: string | null;
};

type NotionBlock = Record<string, unknown>;

function createBasicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

function normalizeNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toExpiresAt(expiresIn: number | null | undefined) {
  if (!expiresIn || !Number.isFinite(expiresIn)) {
    return null;
  }

  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

async function notionJsonRequest<T>(
  url: string,
  init: RequestInit,
  retryCount = 0,
): Promise<T> {
  const response = await fetch(url, init);

  if (response.status === 429 && retryCount < 2) {
    const retryAfterSeconds = Number.parseInt(
      response.headers.get("retry-after") ?? "1",
      10,
    );

    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(1, retryAfterSeconds) * 1000),
    );

    return notionJsonRequest<T>(url, init, retryCount + 1);
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      `Notion API request failed (${response.status}): ${bodyText || response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

function getPageTitle(page: Record<string, unknown>) {
  const properties =
    typeof page.properties === "object" && page.properties !== null
      ? (page.properties as Record<string, unknown>)
      : {};

  for (const value of Object.values(properties)) {
    if (
      typeof value === "object" &&
      value !== null &&
      (value as { type?: unknown }).type === "title" &&
      Array.isArray((value as { title?: unknown[] }).title)
    ) {
      const fragments = (value as { title: Array<{ plain_text?: unknown }> }).title
        .map((fragment) =>
          typeof fragment.plain_text === "string" ? fragment.plain_text : "",
        )
        .join("")
        .trim();

      if (fragments) {
        return fragments;
      }
    }
  }

  return "Untitled page";
}

function getNotionHeaders(accessToken: string) {
  const config = getNotionConfig();

  if (!config) {
    throw new Error("Notion is not configured.");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Notion-Version": config.notionVersion,
  };
}

function buildDailySparksBriefId(brief: GeneratedDailyBriefDraft) {
  return `daily-sparks-${brief.programme.toLowerCase()}-${brief.scheduledFor}`;
}

function buildDailySparksNotebookId(
  brief: Pick<GeneratedDailyBriefDraft, "programme" | "scheduledFor" | "headline">,
) {
  return `daily-sparks-notebook-${brief.programme.toLowerCase()}-${brief.scheduledFor}-${brief.headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)}`;
}

function toPlainRichText(content: string) {
  return [
    {
      type: "text",
      text: {
        content,
      },
    },
  ];
}

function toNotionParagraphBlock(content: string): NotionBlock {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: toPlainRichText(content),
    },
  };
}

function toNotionBulletedListItemBlock(content: string): NotionBlock {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: toPlainRichText(content),
    },
  };
}
function toNotionToDoBlock(content: string, checked = false): NotionBlock {
  return {
    object: "block",
    type: "to_do",
    to_do: {
      rich_text: toPlainRichText(content),
      checked,
    },
  };
}

function toNotionCalloutBlock(content: string, icon = "🚀"): NotionBlock {
  return {
    object: "block",
    type: "callout",
    callout: {
      rich_text: toPlainRichText(content),
      icon: {
        type: "emoji",
        emoji: icon,
      },
      color: "blue_background",
    },
  };
}

function buildNotionBriefPageChildren(
  brief: GeneratedDailyBriefDraft,
): NotionBlock[] {
  const packet = buildOutboundDailyBriefPacket({
    headline: brief.headline,
    scheduledFor: brief.scheduledFor,
    programme: brief.programme,
    editorialCohort: brief.editorialCohort,
    summary: brief.summary,
    topicTags: brief.topicTags,
    briefMarkdown: brief.briefMarkdown,
    sourceReferences: brief.sourceReferences,
    retrievalPrompts: brief.retrievalPrompts,
  });
  const knowledgeBank = buildDailyBriefKnowledgeBank(packet);
  const children: NotionBlock[] = [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: toPlainRichText("Brief"),
      },
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: toPlainRichText(packet.summaryTitle),
      },
    },
    toNotionParagraphBlock(packet.summaryBody),
  ];

  if (packet.themesTitle && packet.themesBody) {
    children.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: toPlainRichText(packet.themesTitle),
      },
    });
    children.push(toNotionParagraphBlock(packet.themesBody));
  }

  children.push({
    object: "block",
    type: "heading_3",
    heading_3: {
      rich_text: toPlainRichText(packet.readingTitle),
    },
  });

  for (const section of packet.readingSections) {
    const paragraph = section.title
      ? `${section.title}: ${section.body}`
      : section.body;
    children.push(toNotionParagraphBlock(paragraph));
  }

  if (packet.vocabularyTitle && packet.vocabularyItems.length > 0) {
    children.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: toPlainRichText(packet.vocabularyTitle),
      },
    });

    for (const item of packet.vocabularyItems) {
      children.push(
        toNotionBulletedListItemBlock(`${item.term}: ${item.definition}`),
      );
    }
  }

  if (packet.discussionPrompts.length > 0) {
    children.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: toPlainRichText(packet.discussionTitle),
      },
    });

    for (const prompt of packet.discussionPrompts) {
      children.push(toNotionBulletedListItemBlock(prompt));
    }
  }

  if (packet.bigIdeaTitle && packet.bigIdeaBody) {
    children.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: toPlainRichText(packet.bigIdeaTitle),
      },
    });
    children.push(toNotionParagraphBlock(packet.bigIdeaBody));
  }

  if (packet.retrievalPrompts.length > 0) {
    children.push({
      object: "block",
      type: "divider",
      divider: {},
    });
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: toPlainRichText("Daily Challenge ⚡️"),
      },
    });
    
    children.push(toNotionParagraphBlock("Complete these challenges in your Notion notebook to solidify your learning! Check them off once you've answered them."));

    for (const item of packet.retrievalPrompts) {
      children.push(toNotionToDoBlock(`${item.title}: ${item.prompt}`));
    }
    
    children.push({
      object: "block",
      type: "divider",
      divider: {},
    });
  }

  if (brief.sourceReferences.length > 0) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: toPlainRichText("Sources"),
      },
    });

    for (const reference of brief.sourceReferences) {
      children.push(
        toNotionBulletedListItemBlock(
          `${reference.sourceName}: ${reference.articleTitle} — ${reference.articleUrl}`,
        ),
      );
    }
  }

  children.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: toPlainRichText("Knowledge bank"),
    },
  });
  children.push(toNotionParagraphBlock(knowledgeBank.title));
  children.push(toNotionParagraphBlock(knowledgeBank.capturePrompt));

  for (const entry of knowledgeBank.entries) {
    children.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: toPlainRichText(entry.title),
      },
    });
    children.push(toNotionParagraphBlock(entry.body));
  }

  return children;
}

function buildNotionNotebookPageChildren(
  brief: Pick<
    GeneratedDailyBriefDraft,
    "headline" | "summary" | "scheduledFor" | "programme" | "topicTags"
  >,
  entries: DailyBriefKnowledgeBankSection[],
): NotionBlock[] {
  const children: NotionBlock[] = [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: toPlainRichText("Notebook entries"),
      },
    },
  ];

  for (const entry of entries) {
    children.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: toPlainRichText(entry.title),
      },
    });
    children.push(toNotionParagraphBlock(entry.body));
  }

  children.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: toPlainRichText("Source brief"),
    },
  });
  children.push(toNotionParagraphBlock(brief.headline));
  children.push(toNotionParagraphBlock(brief.summary));

  if (brief.topicTags.length > 0) {
    children.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: toPlainRichText("Topic tags"),
      },
    });

    for (const tag of brief.topicTags) {
      children.push(toNotionBulletedListItemBlock(tag));
    }
  }

  return children;
}

function buildDailySparksWeeklyRecapId(
  recap: DailyBriefNotebookWeeklyRecap | DailyBriefNotebookWeeklyRecapRecord,
) {
  return `daily-sparks-weekly-recap-${recap.programme.toLowerCase()}-${recap.weekKey}`;
}

function buildNotionWeeklyRecapPageChildren(
  recap: DailyBriefNotebookWeeklyRecap | DailyBriefNotebookWeeklyRecapRecord,
): NotionBlock[] {
  const children: NotionBlock[] = [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: toPlainRichText("Week in review"),
      },
    },
  ];

  for (const line of recap.summaryLines) {
    children.push(toNotionBulletedListItemBlock(line));
  }

  if (recap.topTags.length > 0) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: toPlainRichText("Focus areas"),
      },
    });

    for (const tag of recap.topTags) {
      children.push(toNotionBulletedListItemBlock(tag));
    }
  }

  if (recap.entryTypeBreakdown.length > 0) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: toPlainRichText("Entry mix"),
      },
    });

    for (const entry of recap.entryTypeBreakdown) {
      children.push(
        toNotionBulletedListItemBlock(`${entry.label}: ${entry.count}`),
      );
    }
  }

  if (recap.retrievalPrompts.length > 0) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: toPlainRichText("Retrieval prompts"),
      },
    });

    for (const prompt of recap.retrievalPrompts) {
      children.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: toPlainRichText(prompt.title),
        },
      });
      children.push(
        toNotionParagraphBlock(
          `${prompt.prompt} Source: ${prompt.sourceHeadline}.`,
        ),
      );
    }
  }

  if ("retrievalResponses" in recap && recap.retrievalResponses.length > 0) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: toPlainRichText("Retrieval responses"),
      },
    });

    for (const response of recap.retrievalResponses) {
      children.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: toPlainRichText(response.title),
        },
      });
      children.push(toNotionParagraphBlock(response.response));
      children.push(toNotionParagraphBlock(`Prompt: ${response.prompt}`));
    }
  }

  if (recap.highlights.length > 0) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: toPlainRichText("Notebook highlights"),
      },
    });

    for (const highlight of recap.highlights) {
      children.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: toPlainRichText(highlight.title),
        },
      });
      children.push(toNotionParagraphBlock(highlight.body));
    }
  }

  return children;
}

function createEncryptedConnectionRecord(
  parentId: string,
  payload: OAuthTokenResponse,
): NotionConnectionSecretRecord {
  const config = getNotionConfig();

  if (!config) {
    throw new Error("Notion is not configured.");
  }

  const timestamp = new Date().toISOString();

  return {
    parentId,
    accessTokenCiphertext: encryptNotionToken(
      config.encryptionSecret,
      payload.access_token,
    ),
    refreshTokenCiphertext: payload.refresh_token
      ? encryptNotionToken(config.encryptionSecret, payload.refresh_token)
      : null,
    workspaceId: payload.workspace_id,
    botId: payload.bot_id,
    expiresAt: toExpiresAt(payload.expires_in),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function refreshNotionAccessToken(connection: NotionConnectionSecretRecord) {
  const config = getNotionConfig();

  if (!config) {
    throw new Error("Notion is not configured.");
  }

  if (!connection.refreshTokenCiphertext) {
    return connection;
  }

  const refreshToken = decryptNotionToken(
    config.encryptionSecret,
    connection.refreshTokenCiphertext,
  );
  const payload = await notionJsonRequest<OAuthTokenResponse>(
    `${config.apiBaseUrl}/oauth/token`,
    {
      method: "POST",
      headers: {
        Authorization: createBasicAuthHeader(config.clientId, config.clientSecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    },
  );

  const nextRecord = createEncryptedConnectionRecord(connection.parentId, payload);
  nextRecord.createdAt = connection.createdAt;
  await setNotionConnectionSecret(nextRecord);
  return nextRecord;
}

async function getActiveConnection(parentId: string) {
  const config = getNotionConfig();

  if (!config) {
    throw new Error("Notion is not configured.");
  }

  const connection = await getNotionConnectionSecret(parentId);

  if (!connection) {
    return null;
  }

  if (
    connection.expiresAt &&
    new Date(connection.expiresAt).getTime() <= Date.now() + 60_000
  ) {
    return refreshNotionAccessToken(connection);
  }

  return connection;
}

async function getActiveAccessToken(parentId: string) {
  const config = getNotionConfig();

  if (!config) {
    throw new Error("Notion is not configured.");
  }

  const connection = await getActiveConnection(parentId);

  if (!connection) {
    return null;
  }

  return {
    connection,
    accessToken: decryptNotionToken(
      config.encryptionSecret,
      connection.accessTokenCiphertext,
    ),
  };
}

export function buildNotionAuthorizeUrl(state: string) {
  const config = getNotionConfig();

  if (!config) {
    throw new Error("Notion is not configured.");
  }

  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeNotionCode(code: string, parentId: string) {
  const config = getNotionConfig();

  if (!config) {
    throw new Error("Notion is not configured.");
  }

  const payload = await notionJsonRequest<OAuthTokenResponse>(
    `${config.apiBaseUrl}/oauth/token`,
    {
      method: "POST",
      headers: {
        Authorization: createBasicAuthHeader(config.clientId, config.clientSecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
      }),
    },
  );

  await setNotionConnectionSecret(createEncryptedConnectionRecord(parentId, payload));

  return {
    workspaceId: payload.workspace_id,
    workspaceName: normalizeNullableString(payload.workspace_name),
    botId: payload.bot_id,
  };
}

export async function listNotionParentPages(parentId: string): Promise<NotionPageOption[]> {
  const active = await getActiveAccessToken(parentId);

  if (!active) {
    return [];
  }

  const config = getNotionConfig();
  const result = await notionJsonRequest<{ results?: Array<Record<string, unknown>> }>(
    `${config!.apiBaseUrl}/search`,
    {
      method: "POST",
      headers: getNotionHeaders(active.accessToken),
      body: JSON.stringify({
        filter: {
          property: "object",
          value: "page",
        },
        page_size: 20,
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
      }),
    },
  );

  return (result.results ?? []).map((page) => ({
    id: typeof page.id === "string" ? page.id : "",
    title: getPageTitle(page),
    url: typeof page.url === "string" ? page.url : "",
  })).filter((page) => page.id);
}

export async function createNotionArchiveDatabase(
  parentId: string,
  parentPageId: string,
): Promise<NotionArchiveRecord> {
  const active = await getActiveAccessToken(parentId);

  if (!active) {
    throw new Error("Notion is not connected.");
  }

  const config = getNotionConfig();
  const result = await notionJsonRequest<Record<string, unknown>>(
    `${config!.apiBaseUrl}/databases`,
    {
      method: "POST",
      headers: getNotionHeaders(active.accessToken),
      body: JSON.stringify({
        parent: {
          type: "page_id",
          page_id: parentPageId,
        },
        title: [
          {
            type: "text",
            text: {
              content: "Daily Sparks Reading Archive",
            },
          },
        ],
        properties: {
          Title: {
            title: {},
          },
          Date: {
            date: {},
          },
          Programme: {
            select: {},
          },
          "Brief type": {
            select: {},
          },
          Theme: {
            rich_text: {},
          },
          Summary: {
            rich_text: {},
          },
          Prompt: {
            rich_text: {},
          },
          Student: {
            rich_text: {},
          },
          Status: {
            select: {},
          },
          "Daily Sparks ID": {
            rich_text: {},
          },
        },
      }),
    },
  );

  const dataSources = Array.isArray(result.data_sources)
    ? (result.data_sources as Array<Record<string, unknown>>)
    : [];
  const primaryDataSource = dataSources[0];

  return {
    databaseId: typeof result.id === "string" ? result.id : "",
    databaseName: "Daily Sparks Reading Archive",
    dataSourceId:
      typeof primaryDataSource?.id === "string" ? primaryDataSource.id : null,
  };
}

export async function createNotionTestPage(
  profile: ParentProfile,
): Promise<NotionTestSyncResult> {
  const active = await getActiveAccessToken(profile.parent.id);

  if (!active) {
    throw new Error("Notion is not connected.");
  }

  if (!profile.parent.notionDatabaseId) {
    throw new Error("Notion archive has not been created yet.");
  }

  const config = getNotionConfig();
  const today = new Date().toISOString();
  const briefId = `daily-sparks-${profile.student.programme.toLowerCase()}-${today.slice(0, 10)}`;
  const pageResult = await notionJsonRequest<Record<string, unknown>>(
    `${config!.apiBaseUrl}/pages`,
    {
      method: "POST",
      headers: getNotionHeaders(active.accessToken),
      body: JSON.stringify({
        parent: profile.parent.notionDataSourceId
          ? {
              type: "data_source_id",
              data_source_id: profile.parent.notionDataSourceId,
            }
          : {
              type: "database_id",
              database_id: profile.parent.notionDatabaseId,
            },
        properties: {
          Title: {
            title: [
              {
                type: "text",
                text: {
                  content: `${profile.student.programme} reading brief`,
                },
              },
            ],
          },
          Date: {
            date: {
              start: today,
            },
          },
          Programme: {
            select: {
              name: profile.student.programme,
            },
          },
          "Brief type": {
            select: {
              name: "Daily Brief",
            },
          },
          Theme: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Programme-aligned reading flow",
                },
              },
            ],
          },
          Summary: {
            rich_text: [
              {
                type: "text",
                text: {
                  content:
                    "This test page confirms that Daily Sparks can archive reading briefs into your Notion workspace.",
                },
              },
            ],
          },
          Prompt: {
            rich_text: [
              {
                type: "text",
                text: {
                  content:
                    "What idea from today’s reading would you like to discuss with your child tonight?",
                },
              },
            ],
          },
          Student: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: profile.student.studentName,
                },
              },
            ],
          },
          Status: {
            select: {
              name: "Synced",
            },
          },
          "Daily Sparks ID": {
            rich_text: [
              {
                type: "text",
                text: {
                  content: briefId,
                },
              },
            ],
          },
        },
      }),
    },
  );

  const pageId = typeof pageResult.id === "string" ? pageResult.id : "";
  const pageUrl =
    typeof pageResult.url === "string" && pageResult.url.trim()
      ? pageResult.url
      : null;

  if (pageId) {
    await notionJsonRequest<Record<string, unknown>>(
      `${config!.apiBaseUrl}/blocks/${pageId}/children`,
      {
        method: "PATCH",
        headers: getNotionHeaders(active.accessToken),
        body: JSON.stringify({
          children: [
            {
              object: "block",
              type: "heading_2",
              heading_2: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: "Daily Sparks test sync",
                    },
                  },
                ],
              },
            },
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content:
                        "This archive entry was created from the parent dashboard to confirm that your Notion workspace is connected.",
                    },
                  },
                ],
              },
            },
          ],
        }),
      },
    );
  }

  return {
    pageId,
    pageUrl,
  };
}

export async function createNotionBriefPage(
  profile: ParentProfile,
  brief: GeneratedDailyBriefDraft,
): Promise<NotionTestSyncResult> {
  const active = await getActiveAccessToken(profile.parent.id);

  if (!active) {
    throw new Error("Notion is not connected.");
  }

  if (!profile.parent.notionDatabaseId) {
    throw new Error("Notion archive has not been created yet.");
  }

  const config = getNotionConfig();
  const packet = buildOutboundDailyBriefPacket({
    headline: brief.headline,
    scheduledFor: brief.scheduledFor,
    programme: brief.programme,
    editorialCohort: brief.editorialCohort,
    summary: brief.summary,
    topicTags: brief.topicTags,
    briefMarkdown: brief.briefMarkdown,
    sourceReferences: brief.sourceReferences,
  });
  const knowledgeBank = buildDailyBriefKnowledgeBank(packet);
  const pageResult = await notionJsonRequest<Record<string, unknown>>(
    `${config!.apiBaseUrl}/pages`,
    {
      method: "POST",
      headers: getNotionHeaders(active.accessToken),
      body: JSON.stringify({
        parent: profile.parent.notionDataSourceId
          ? {
              type: "data_source_id",
              data_source_id: profile.parent.notionDataSourceId,
            }
          : {
              type: "database_id",
              database_id: profile.parent.notionDatabaseId,
            },
        properties: {
          Title: {
            title: toPlainRichText(brief.headline),
          },
          Date: {
            date: {
              start: brief.scheduledFor,
            },
          },
          Programme: {
            select: {
              name: brief.programme,
            },
          },
          "Brief type": {
            select: {
              name: config!.dailyBriefTypeName,
            },
          },
          Theme: {
            rich_text: toPlainRichText(brief.topicTags.join(", ")),
          },
          Summary: {
            rich_text: toPlainRichText(brief.summary),
          },
          Prompt: {
            rich_text: toPlainRichText(knowledgeBank.capturePrompt),
          },
          Student: {
            rich_text: toPlainRichText(profile.student.studentName),
          },
          Status: {
            select: {
              name: config!.dailyBriefStatusName,
            },
          },
          "Daily Sparks ID": {
            rich_text: toPlainRichText(buildDailySparksBriefId(brief)),
          },
        },
        children: buildNotionBriefPageChildren(brief),
      }),
    },
  );

  const pageId = typeof pageResult.id === "string" ? pageResult.id : "";
  const pageUrl =
    typeof pageResult.url === "string" && pageResult.url.trim()
      ? pageResult.url
      : null;

  return {
    pageId,
    pageUrl,
  };
}

export async function createNotionNotebookEntriesPage(
  profile: ParentProfile,
  brief: Pick<
    GeneratedDailyBriefDraft,
    "headline" | "summary" | "scheduledFor" | "programme" | "topicTags"
  >,
  entries: DailyBriefKnowledgeBankSection[],
): Promise<NotionTestSyncResult> {
  const active = await getActiveAccessToken(profile.parent.id);

  if (!active) {
    throw new Error("Notion is not connected.");
  }

  if (!profile.parent.notionDatabaseId) {
    throw new Error("Notion archive has not been created yet.");
  }

  const config = getNotionConfig();
  const pageResult = await notionJsonRequest<Record<string, unknown>>(
    `${config!.apiBaseUrl}/pages`,
    {
      method: "POST",
      headers: getNotionHeaders(active.accessToken),
      body: JSON.stringify({
        parent: profile.parent.notionDataSourceId
          ? {
              type: "data_source_id",
              data_source_id: profile.parent.notionDataSourceId,
            }
          : {
              type: "database_id",
              database_id: profile.parent.notionDatabaseId,
            },
        properties: {
          Title: {
            title: toPlainRichText(`${brief.headline} notebook`),
          },
          Date: {
            date: {
              start: brief.scheduledFor,
            },
          },
          Programme: {
            select: {
              name: brief.programme,
            },
          },
          "Brief type": {
            select: {
              name: "Notebook Entry",
            },
          },
          Theme: {
            rich_text: toPlainRichText(brief.topicTags.join(", ")),
          },
          Summary: {
            rich_text: toPlainRichText(
              entries.length === 1
                ? entries[0]!.body
                : `${entries.length} notebook entries saved from the parent dashboard.`,
            ),
          },
          Prompt: {
            rich_text: toPlainRichText(entries[0]?.title ?? "Notebook entry"),
          },
          Student: {
            rich_text: toPlainRichText(profile.student.studentName),
          },
          Status: {
            select: {
              name: "Synced",
            },
          },
          "Daily Sparks ID": {
            rich_text: toPlainRichText(buildDailySparksNotebookId(brief)),
          },
        },
        children: buildNotionNotebookPageChildren(brief, entries),
      }),
    },
  );

  const pageId = typeof pageResult.id === "string" ? pageResult.id : "";
  const pageUrl =
    typeof pageResult.url === "string" && pageResult.url.trim()
      ? pageResult.url
      : null;

  return {
    pageId,
    pageUrl,
  };
}

export async function createNotionNotebookWeeklyRecapPage(
  profile: ParentProfile,
  recap: DailyBriefNotebookWeeklyRecap | DailyBriefNotebookWeeklyRecapRecord,
): Promise<NotionTestSyncResult> {
  const active = await getActiveAccessToken(profile.parent.id);

  if (!active) {
    throw new Error("Notion is not connected.");
  }

  if (!profile.parent.notionDatabaseId) {
    throw new Error("Notion archive has not been created yet.");
  }

  const config = getNotionConfig();
  const pageResult = await notionJsonRequest<Record<string, unknown>>(
    `${config!.apiBaseUrl}/pages`,
    {
      method: "POST",
      headers: getNotionHeaders(active.accessToken),
      body: JSON.stringify({
        parent: profile.parent.notionDataSourceId
          ? {
              type: "data_source_id",
              data_source_id: profile.parent.notionDataSourceId,
            }
          : {
              type: "database_id",
              database_id: profile.parent.notionDatabaseId,
            },
        properties: {
          Title: {
            title: toPlainRichText(recap.title),
          },
          Date: {
            date: {
              start: recap.weekKey,
            },
          },
          Programme: {
            select: {
              name: recap.programme,
            },
          },
          "Brief type": {
            select: {
              name: "Weekly Recap",
            },
          },
          Theme: {
            rich_text: toPlainRichText(recap.topTags.join(", ")),
          },
          Summary: {
            rich_text: toPlainRichText(recap.summaryLines.join(" ")),
          },
          Prompt: {
            rich_text: toPlainRichText(
              recap.retrievalPrompts[0]?.prompt ??
                "Which notebook idea should your family revisit next?",
            ),
          },
          Student: {
            rich_text: toPlainRichText(profile.student.studentName),
          },
          Status: {
            select: {
              name: "Synced",
            },
          },
          "Daily Sparks ID": {
            rich_text: toPlainRichText(buildDailySparksWeeklyRecapId(recap)),
          },
        },
        children: buildNotionWeeklyRecapPageChildren(recap),
      }),
    },
  );

  return {
    pageId: typeof pageResult.id === "string" ? pageResult.id : "",
    pageUrl:
      typeof pageResult.url === "string" && pageResult.url.trim()
        ? pageResult.url
        : null,
  };
}

export async function removeNotionConnection(parentId: string) {
  await clearNotionConnectionSecret(parentId);
}
export type NotionPageInteractionSummary = {
  totalTasks: number;
  completedTasks: number;
  hasActivity: boolean;
};

export async function fetchNotionPageInteractions(
  parentId: string,
  pageId: string,
): Promise<NotionPageInteractionSummary> {
  const active = await getActiveAccessToken(parentId);

  if (!active) {
    throw new Error("Notion is not connected.");
  }

  const config = getNotionConfig();
  const result = await notionJsonRequest<Record<string, unknown>>(
    `${config!.apiBaseUrl}/blocks/${pageId}/children?page_size=100`,
    {
      method: "GET",
      headers: getNotionHeaders(active.accessToken),
    },
  );

  const blocks = Array.isArray(result.results) ? result.results : [];
  let totalTasks = 0;
  let completedTasks = 0;

  for (const block of blocks as any[]) {
    if (block.type === "to_do") {
      totalTasks += 1;
      if (block.to_do?.checked === true) {
        completedTasks += 1;
      }
    }
  }

  return {
    totalTasks,
    completedTasks,
    hasActivity: totalTasks > 0 && completedTasks > 0,
  };
}

import { getNotionConfig } from "./notion-config";

// IB DP Notion Template Factory
// -------------------------------------------------------------------------

const NOTION_API_BASE_URL = "https://api.notion.com/v1";

async function notionJsonRequest<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      `Notion API request failed (${response.status}): ${bodyText || response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

function getNotionHeaders(accessToken: string) {
  const config = getNotionConfig();
  if (!config) throw new Error("Notion is not configured.");

  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Notion-Version": config.notionVersion,
  };
}

// -------------------------------------------------------------------------
// Schemas
// -------------------------------------------------------------------------

const SUBJECTS_SCHEMA = {
  Title: { title: {} },
  Level: { select: { options: [{ name: "HL", color: "red" }, { name: "SL", color: "blue" }] } },
  "Target Grade": { number: { format: "number" } },
  "Current Average": { number: { format: "number" } },
  "Grade Progress": {
    formula: {
      expression: 'if(prop("Current Average") >= prop("Target Grade"), "✅ On Track", "⚠️ Below Target")'
    }
  },
  "IA Deadline": { date: {} },
};

const EE_HUB_SCHEMA = {
  "Topic / Title": { title: {} },
  Status: { status: { options: [
    { name: "Researching", color: "blue" },
    { name: "Drafting", color: "orange" },
    { name: "Finished", color: "green" },
  ]}},
  "Word Count": { number: { format: "number" } },
  "RPPF Reflection 1": { checkbox: {} },
  "RPPF Reflection 2": { checkbox: {} },
};

// -------------------------------------------------------------------------
// Deployment
// -------------------------------------------------------------------------

export async function deployStandardIbTemplate(parentPageId: string, accessToken: string) {
  const headers = getNotionHeaders(accessToken);

  // 1. Subjects DB
  const subjectsDb = await notionJsonRequest<any>(`${NOTION_API_BASE_URL}/databases`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: "📚 IB Subjects & Grades" } }],
      properties: SUBJECTS_SCHEMA,
    }),
  });

  // 2. EE Hub
  const eeHub = await notionJsonRequest<any>(`${NOTION_API_BASE_URL}/databases`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: "🖋️ Extended Essay (EE) Hub" } }],
      properties: EE_HUB_SCHEMA,
    }),
  });

  // 3. Main Dashboard Page
  const dashboard = await notionJsonRequest<any>(`${NOTION_API_BASE_URL}/pages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parentPageId },
      properties: {
        title: { title: [{ text: { content: "🎯 IB DP Ultimate Dashboard" } }] },
      },
      children: [
        {
          object: "block",
          type: "callout",
          callout: {
            rich_text: [{ type: "text", text: { content: "Welcome to your automated IB DP workspace! Track your subjects and deadlines here." } }],
            icon: { type: "emoji", emoji: "🚀" },
            color: "blue_background",
          },
        },
        {
          object: "block",
          type: "heading_2",
          heading_2: { rich_text: [{ type: "text", text: { content: "Navigation" } }] },
        },
        {
           object: "block",
           type: "paragraph",
           paragraph: { rich_text: [{ type: "text", text: { content: "Quick links to your academic trackers." } }] }
        }
      ],
    }),
  });

  return {
    subjectsDbId: subjectsDb.id,
    eeHubId: eeHub.id,
    dashboardPageId: dashboard.id,
    dashboardUrl: dashboard.url,
  };
}

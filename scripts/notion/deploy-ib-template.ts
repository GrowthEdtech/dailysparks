import { Buffer } from "node:buffer";

// IB DP Notion Template Factory
// -------------------------------------------------------------------------
// This script creates a professional IB DP Dashboard in a Notion workspace.

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

const CLIENT_ID = process.env.NOTION_OAUTH_CLIENT_ID || "335d872b-594c-8127-8bae-0037c94dabc3";
const CLIENT_SECRET = process.env.NOTION_OAUTH_CLIENT_SECRET;

// -------------------------------------------------------------------------
// Helper: Notion Request
// -------------------------------------------------------------------------
async function notionRequest(endpoint: string, { method = "GET", body, token }: { method?: string; body?: any; token: string }) {
  const response = await fetch(`${NOTION_API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notion API Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// -------------------------------------------------------------------------
// Database Schemas
// -------------------------------------------------------------------------

/**
 * 1. Subjects Database Schema
 */
const SUBJECTS_DB_SCHEMA = {
  Title: { title: {} },
  Level: { select: { options: [{ name: "HL", color: "red" }, { name: "SL", color: "blue" }] } },
  "Subject Group": { select: { options: [
    { name: "Group 1: Language & Literature", color: "orange" },
    { name: "Group 2: Language Acquisition", color: "yellow" },
    { name: "Group 3: Individuals & Societies", color: "green" },
    { name: "Group 4: Sciences", color: "purple" },
    { name: "Group 5: Mathematics", color: "pink" },
    { name: "Group 6: The Arts", color: "gray" },
  ]}},
  "Target Grade": { number: { format: "number" } },
  "Current Average": { number: { format: "number" } },
  "Grade Progress": {
    formula: {
      expression: 'if(prop("Current Average") >= prop("Target Grade"), "✅ On Track", "⚠️ Below Target")'
    }
  },
  "Days to IA Deadline": {
    formula: {
      expression: 'dateBetween(prop("IA Deadline"), now(), "days")'
    }
  },
  "IA Deadline": { date: {} },
};

/**
 * 2. EE Hub Schema
 */
const EE_HUB_SCHEMA = {
  "Topic / Title": { title: {} },
  Supervisor: { people: {} },
  Status: { status: { options: [
    { name: "Not Started", color: "default" },
    { name: "Researching", color: "blue" },
    { name: "Drafting", color: "orange" },
    { name: "Reviewing", color: "purple" },
    { name: "Finished", color: "green" },
  ]}},
  "Word Count": { number: { format: "number" } },
  "RPPF Reflection 1": { checkbox: {} },
  "RPPF Reflection 2": { checkbox: {} },
  "RPPF Reflection 3": { checkbox: {} },
};

/**
 * 3. CAS Portfolio Schema
 */
const CAS_PORTFOLIO_SCHEMA = {
  Experience: { title: {} },
  Strand: { multi_select: { options: [
    { name: "Creativity", color: "red" },
    { name: "Activity", color: "blue" },
    { name: "Service", color: "green" },
  ]}},
  "Total Hours": { number: { format: "number" } },
  Status: { status: { options: [
    { name: "Planned", color: "gray" },
    { name: "In Progress", color: "blue" },
    { name: "Completed", color: "green" },
  ]}},
  "Evidence Uploaded": { checkbox: {} },
};

// -------------------------------------------------------------------------
// Main Deployment Function
// -------------------------------------------------------------------------

export async function deployIbTemplateToParent(parentPageId: string, accessToken: string) {
  console.log(`Starting IB DP Template deployment to page: ${parentPageId}`);

  // 1. Create Subjects Database
  console.log("- Creating Subjects Database...");
  const subjectsDb = await notionRequest("/databases", {
    method: "POST",
    token: accessToken,
    body: {
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: "📚 IB Subjects & Grades" } }],
      properties: SUBJECTS_DB_SCHEMA,
    },
  });
  const subjectsDbId = subjectsDb.id;

  // 2. Create EE Hub
  console.log("- Creating EE Hub...");
  const eeHub = await notionRequest("/databases", {
    method: "POST",
    token: accessToken,
    body: {
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: "🖋️ Extended Essay (EE) Hub" } }],
      properties: EE_HUB_SCHEMA,
    },
  });

  // 3. Create CAS Portfolio
  console.log("- Creating CAS Portfolio...");
  const casPortfolio = await notionRequest("/databases", {
    method: "POST",
    token: accessToken,
    body: {
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: "🌟 CAS Portfolio" } }],
      properties: CAS_PORTFOLIO_SCHEMA,
    },
  });

  // 4. Create Main Dashboard Page with 2-Column Layout
  console.log("- Creating Main Dashboard with 2-Column Layout...");
  const dashboardPage = await notionRequest("/pages", {
    method: "POST",
    token: accessToken,
    body: {
      parent: { type: "page_id", page_id: parentPageId },
      properties: {
        title: { title: [{ text: { content: "🎯 IB DP Ultimate Dashboard" } }] },
      },
      children: [
        {
          object: "block",
          type: "column_list",
          column_list: {
            children: [
              {
                object: "block",
                type: "column",
                column: {
                  children: [
                    {
                      object: "block",
                      type: "callout",
                      callout: {
                        rich_text: [{ type: "text", text: { content: "GPA Tracker & Subjects Overview" } }],
                        icon: { type: "emoji", emoji: "📊" },
                        color: "blue_background",
                      },
                    },
                    {
                      object: "block",
                      type: "heading_3",
                      heading_3: { rich_text: [{ type: "text", text: { content: "Core Subjects" } }] },
                    },
                    {
                      object: "block",
                      type: "paragraph",
                      paragraph: { rich_text: [{ type: "text", text: { content: "Track your HL/SL grades here." } }] },
                    },
                  ],
                },
              },
              {
                object: "block",
                type: "column",
                column: {
                  children: [
                    {
                      object: "block",
                      type: "callout",
                      callout: {
                        rich_text: [{ type: "text", text: { content: "EE & TOK Radar" } }],
                        icon: { type: "emoji", emoji: "🕰️" },
                        color: "orange_background",
                      },
                    },
                    {
                      object: "block",
                      type: "heading_3",
                      heading_3: { rich_text: [{ type: "text", text: { content: "Deadlines" } }] },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  });

  console.log("Deployment Successful!");
  return {
    subjectsDbId,
    eeHubId: eeHub.id,
    casPortfolioId: casPortfolio.id,
    tokPageId: tokPage.id,
    dashboardPageId: dashboardPage.id,
  };
}

// -------------------------------------------------------------------------
// CLI Handler
// -------------------------------------------------------------------------
async function run() {
  const TEST_PAGE_ID = process.argv[2];
  const TEST_TOKEN = process.argv[3];

  if (TEST_PAGE_ID && TEST_TOKEN) {
    try {
      await deployIbTemplateToParent(TEST_PAGE_ID, TEST_TOKEN);
    } catch (error) {
      console.error("Deployment failed:", error);
    }
  } else {
    console.log("Usage: tsx scripts/notion/deploy-ib-template.ts <PAGE_ID> <TOKEN>");
  }
}

// Check if running directly via tsx
if (import.meta.url.startsWith("file:")) {
  const isDirectRun = process.argv[1]?.includes("deploy-ib-template.ts");
  if (isDirectRun) {
    run();
  }
}

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { GeneratedDailyBriefDraft } from "./daily-brief-orchestrator";
import type { ParentProfile } from "./mvp-types";
import { encryptNotionToken } from "./notion-crypto";
import { setNotionConnectionSecret } from "./notion-connection-store";
import { createNotionBriefPage } from "./notion";

const ORIGINAL_ENV = { ...process.env };
const fetchMock = vi.fn<typeof fetch>();
let tempDirectory = "";

function createProfile(): ParentProfile {
  return {
    parent: {
      id: "parent-1",
      email: "parent@example.com",
      fullName: "Parent Example",
      subscriptionStatus: "active",
      subscriptionPlan: "monthly",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialStartedAt: "2026-04-01T00:00:00.000Z",
      trialEndsAt: "2026-04-08T00:00:00.000Z",
      subscriptionActivatedAt: null,
      subscriptionRenewalAt: null,
      latestInvoiceId: null,
      latestInvoiceNumber: null,
      latestInvoiceStatus: null,
      latestInvoiceHostedUrl: null,
      latestInvoicePdfUrl: null,
      latestInvoiceAmountPaid: null,
      latestInvoiceCurrency: null,
      latestInvoicePaidAt: null,
      latestInvoicePeriodStart: null,
      latestInvoicePeriodEnd: null,
      notionWorkspaceId: "workspace-123",
      notionWorkspaceName: "Growth Education",
      notionBotId: "bot-123",
      notionDatabaseId: "database-123",
      notionDatabaseName: "Daily Sparks Reading Archive",
      notionDataSourceId: "data-source-123",
      notionAuthorizedAt: "2026-04-02T00:00:00.000Z",
      notionLastSyncedAt: null,
      notionLastSyncStatus: null,
      notionLastSyncMessage: null,
      notionLastSyncPageId: null,
      notionLastSyncPageUrl: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    student: {
      id: "student-1",
      parentId: "parent-1",
      studentName: "Katherine",
      programme: "MYP",
      programmeYear: 3,
      goodnotesEmail: "katherine@goodnotes.email",
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-01T00:00:00.000Z",
      goodnotesLastTestSentAt: null,
      goodnotesLastDeliveryStatus: null,
      goodnotesLastDeliveryMessage: null,
      notionConnected: true,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  };
}

function createGeneratedBrief(
  overrides: Partial<GeneratedDailyBriefDraft> = {},
): GeneratedDailyBriefDraft {
  return {
    scheduledFor: "2026-04-03",
    headline: "MYP ocean mapping brief",
    summary: "A generated summary about how students help scientists map sea turtles.",
    programme: "MYP",
    status: "draft",
    topicTags: ["oceans", "science"],
    sourceReferences: [
      {
        sourceId: "bbc",
        sourceName: "BBC",
        sourceDomain: "bbc.com",
        articleTitle: "Students map sea turtles",
        articleUrl: "https://www.bbc.com/news/world-123",
      },
      {
        sourceId: "npr",
        sourceName: "NPR",
        sourceDomain: "npr.org",
        articleTitle: "Young researchers tag turtles",
        articleUrl: "https://www.npr.org/2026/04/03/turtles",
      },
    ],
    aiConnectionId: "nf-relay",
    aiConnectionName: "NF Relay",
    aiModel: "gpt-5.4",
    promptPolicyId: "policy-1",
    promptVersionLabel: "v1.0.0",
    promptVersion: "v1.0.0",
    repetitionRisk: "low",
    repetitionNotes: "No overlapping briefs in the recent memory window.",
    adminNotes: "",
    briefMarkdown:
      "## Today\nStudents compare why ocean mapping helps scientists protect animals.",
    resolvedPrompt: "Resolved prompt text",
    sourceClusterKey: "students map sea turtles",
    candidateCount: 2,
    ...overrides,
  };
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-notion-lib-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    NOTION_OAUTH_CLIENT_ID: "notion-client-id",
    NOTION_OAUTH_CLIENT_SECRET: "notion-client-secret",
    NOTION_OAUTH_REDIRECT_URI:
      "https://dailysparks.geledtech.com/api/notion/callback",
    NOTION_TOKEN_ENCRYPTION_SECRET: "test-encryption-secret",
  };
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("notion delivery helpers", () => {
  test("creates a Notion page from generated brief content", async () => {
    const profile = createProfile();
    const brief = createGeneratedBrief();

    await setNotionConnectionSecret({
      parentId: profile.parent.id,
      accessTokenCiphertext: encryptNotionToken(
        "test-encryption-secret",
        "secret-access-token",
      ),
      refreshTokenCiphertext: null,
      workspaceId: "workspace-123",
      botId: "bot-123",
      expiresAt: null,
      createdAt: "2026-04-02T00:00:00.000Z",
      updatedAt: "2026-04-02T00:00:00.000Z",
    });

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "page-123",
          url: "https://www.notion.so/page-123",
        }),
        { status: 200 },
      ),
    );

    const result = await createNotionBriefPage(profile, brief);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0]!;
    expect(requestUrl).toBe("https://api.notion.com/v1/pages");
    expect(requestInit?.method).toBe("POST");

    const body = JSON.parse(String(requestInit?.body)) as {
      properties: Record<string, unknown>;
      children: Array<Record<string, unknown>>;
    };

    expect(body.properties.Title).toEqual({
      title: [
        {
          type: "text",
          text: {
            content: "MYP ocean mapping brief",
          },
        },
      ],
    });
    expect(body.properties.Summary).toEqual({
      rich_text: [
        {
          type: "text",
          text: {
            content:
              "A generated summary about how students help scientists map sea turtles.",
          },
        },
      ],
    });
    expect(body.properties.Theme).toEqual({
      rich_text: [
        {
          type: "text",
          text: {
            content: "oceans, science",
          },
        },
      ],
    });
    expect(body.properties.Prompt).toEqual({
      rich_text: [
        {
          type: "text",
          text: {
            content:
              "What stands out to your family about MYP ocean mapping brief?",
          },
        },
      ],
    });
    expect(body.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "heading_2",
        }),
        expect.objectContaining({
          type: "paragraph",
        }),
        expect.objectContaining({
          type: "bulleted_list_item",
        }),
      ]),
    );
    expect(result).toEqual({
      pageId: "page-123",
      pageUrl: "https://www.notion.so/page-123",
    });
  });
});

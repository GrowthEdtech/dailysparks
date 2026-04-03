import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as login } from "./login/route";
import { POST as connectNotion } from "./notion/connect/route";
import { GET as notionCallback } from "./notion/callback/route";
import { GET as notionPages } from "./notion/pages/route";
import { POST as notionDatabase } from "./notion/database/route";
import { POST as notionTestSync } from "./notion/test-sync/route";
import { POST as notionDisconnect } from "./notion/disconnect/route";
import { SESSION_COOKIE_NAME } from "../../lib/session";
import { getNotionConnectionSecret } from "../../lib/notion-connection-store";

const verifyIdTokenMock = vi.fn();
const createSessionCookieMock = vi.fn();
const verifySessionCookieMock = vi.fn();
const fetchMock = vi.fn<typeof fetch>();

vi.mock("../../lib/firebase-admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
  }),
}));

const ORIGINAL_ENV = { ...process.env };
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-notion-routes-"));
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_PATH: path.join(tempDirectory, "mvp-store.json"),
    NOTION_OAUTH_CLIENT_ID: "notion-client-id",
    NOTION_OAUTH_CLIENT_SECRET: "notion-client-secret",
    NOTION_OAUTH_REDIRECT_URI:
      "https://dailysparks.geledtech.com/api/notion/callback",
    NOTION_TOKEN_ENCRYPTION_SECRET: "test-encryption-secret",
  };
  verifyIdTokenMock.mockReset();
  createSessionCookieMock.mockReset();
  verifySessionCookieMock.mockReset();
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

async function signInParent() {
  verifyIdTokenMock.mockResolvedValue({
    uid: "firebase-parent-1",
    email: "parent@example.com",
    name: "Parent Example",
    auth_time: Math.floor(Date.now() / 1000),
  });
  createSessionCookieMock.mockResolvedValue("firebase-session-cookie");
  verifySessionCookieMock.mockResolvedValue({
    uid: "firebase-parent-1",
    email: "parent@example.com",
    name: "Parent Example",
  });

  await login(
    new Request("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        idToken: "firebase-id-token",
      }),
    }),
  );

  return `${SESSION_COOKIE_NAME}=firebase-session-cookie`;
}

describe("notion routes", () => {
  test("returns a Notion authorization URL and state cookie", async () => {
    const cookie = await signInParent();

    const response = await connectNotion(
      new Request("http://localhost:3000/api/notion/connect", {
        method: "POST",
        headers: {
          cookie,
        },
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authorizationUrl).toContain("api.notion.com/v1/oauth/authorize");
    expect(body.authorizationUrl).toContain("client_id=notion-client-id");
    expect(response.headers.get("set-cookie")).toContain("daily-sparks-notion-state=");
  });

  test("stores safe metadata and encrypted connection secrets on OAuth callback", async () => {
    const cookie = await signInParent();
    const connectResponse = await connectNotion(
      new Request("http://localhost:3000/api/notion/connect", {
        method: "POST",
        headers: {
          cookie,
        },
      }),
    );
    const stateCookie = connectResponse.headers.get("set-cookie") ?? "";
    const stateValue = stateCookie.match(/daily-sparks-notion-state=([^;]+)/)?.[1] ?? "";

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "secret-access-token",
          refresh_token: "refresh-token",
          workspace_id: "workspace-123",
          workspace_name: "Growth Education",
          bot_id: "bot-123",
          expires_in: 3600,
        }),
        { status: 200 },
      ),
    );

    const response = await notionCallback(
      new Request(
        `https://dailysparks.geledtech.com/api/notion/callback?code=oauth-code&state=${stateValue}`,
        {
          headers: {
            cookie: `${cookie}; ${stateCookie}`,
            "x-forwarded-host": "dailysparks.geledtech.com",
            "x-forwarded-proto": "https",
          },
        },
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://dailysparks.geledtech.com/dashboard?notion=connected",
    );

    const rawStore = JSON.parse(
      await readFile(process.env.DAILY_SPARKS_STORE_PATH!, "utf8"),
    ) as { parents: Array<Record<string, unknown>> };
    const parent = rawStore.parents[0];

    expect(parent.notionWorkspaceId).toBe("workspace-123");
    expect(parent.notionWorkspaceName).toBe("Growth Education");
    expect(parent.notionBotId).toBe("bot-123");

    const connection = await getNotionConnectionSecret(String(parent.id));
    expect(connection).not.toBeNull();
    expect(connection?.accessTokenCiphertext).not.toBe("secret-access-token");
  });

  test("creates a Notion archive, lists pages, sends a test page, and disconnects", async () => {
    const cookie = await signInParent();
    const connectResponse = await connectNotion(
      new Request("http://localhost:3000/api/notion/connect", {
        method: "POST",
        headers: {
          cookie,
        },
      }),
    );
    const stateCookie = connectResponse.headers.get("set-cookie") ?? "";
    const stateValue = stateCookie.match(/daily-sparks-notion-state=([^;]+)/)?.[1] ?? "";

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "secret-access-token",
          refresh_token: "refresh-token",
          workspace_id: "workspace-123",
          workspace_name: "Growth Education",
          bot_id: "bot-123",
          expires_in: 3600,
        }),
        { status: 200 },
      ),
    );

    await notionCallback(
      new Request(
        `https://dailysparks.geledtech.com/api/notion/callback?code=oauth-code&state=${stateValue}`,
        {
          headers: {
            cookie: `${cookie}; ${stateCookie}`,
          },
        },
      ),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              id: "page-123",
              url: "https://www.notion.so/page-123",
              properties: {
                title: {
                  type: "title",
                  title: [
                    {
                      plain_text: "Parent Home",
                    },
                  ],
                },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const pagesResponse = await notionPages(
      new Request("http://localhost:3000/api/notion/pages", {
        headers: {
          cookie,
        },
      }),
    );

    const pagesBody = await pagesResponse.json();
    expect(pagesResponse.status).toBe(200);
    expect(pagesBody.pages).toEqual([
      {
        id: "page-123",
        title: "Parent Home",
        url: "https://www.notion.so/page-123",
      },
    ]);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "database-123",
          data_sources: [
            {
              id: "data-source-123",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const databaseResponse = await notionDatabase(
      new Request("http://localhost:3000/api/notion/database", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          pageId: "page-123",
        }),
      }),
    );

    const databaseBody = await databaseResponse.json();
    expect(databaseResponse.status).toBe(200);
    expect(databaseBody.parent.notionDatabaseId).toBe("database-123");
    expect(databaseBody.parent.notionDataSourceId).toBe("data-source-123");
    expect(databaseBody.student.notionConnected).toBe(false);

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "page-sync-123",
            url: "https://www.notion.so/page-sync-123",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }));

    const syncResponse = await notionTestSync(
      new Request("http://localhost:3000/api/notion/test-sync", {
        method: "POST",
        headers: {
          cookie,
        },
      }),
    );
    const syncBody = await syncResponse.json();

    expect(syncResponse.status).toBe(200);
    expect(syncBody.parent.notionLastSyncStatus).toBe("success");
    expect(syncBody.parent.notionLastSyncPageUrl).toBe(
      "https://www.notion.so/page-sync-123",
    );
    expect(syncBody.student.notionConnected).toBe(true);

    const disconnectResponse = await notionDisconnect(
      new Request("http://localhost:3000/api/notion/disconnect", {
        method: "POST",
        headers: {
          cookie,
        },
      }),
    );
    const disconnectBody = await disconnectResponse.json();

    expect(disconnectResponse.status).toBe(200);
    expect(disconnectBody.parent.notionWorkspaceId).toBeNull();
    expect(disconnectBody.parent.notionDatabaseId).toBeNull();
    expect(disconnectBody.student.notionConnected).toBe(false);
  });

  test("keeps notion unverified when the first test sync fails", async () => {
    const cookie = await signInParent();
    const connectResponse = await connectNotion(
      new Request("http://localhost:3000/api/notion/connect", {
        method: "POST",
        headers: {
          cookie,
        },
      }),
    );
    const stateCookie = connectResponse.headers.get("set-cookie") ?? "";
    const stateValue = stateCookie.match(/daily-sparks-notion-state=([^;]+)/)?.[1] ?? "";

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "secret-access-token",
          refresh_token: "refresh-token",
          workspace_id: "workspace-123",
          workspace_name: "Growth Education",
          bot_id: "bot-123",
          expires_in: 3600,
        }),
        { status: 200 },
      ),
    );

    await notionCallback(
      new Request(
        `https://dailysparks.geledtech.com/api/notion/callback?code=oauth-code&state=${stateValue}`,
        {
          headers: {
            cookie: `${cookie}; ${stateCookie}`,
          },
        },
      ),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "database-123",
          data_sources: [{ id: "data-source-123" }],
        }),
        { status: 200 },
      ),
    );

    await notionDatabase(
      new Request("http://localhost:3000/api/notion/database", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          pageId: "page-123",
        }),
      }),
    );

    fetchMock.mockRejectedValueOnce(new Error("notion sync exploded"));

    const syncResponse = await notionTestSync(
      new Request("http://localhost:3000/api/notion/test-sync", {
        method: "POST",
        headers: {
          cookie,
        },
      }),
    );
    const syncBody = await syncResponse.json();

    expect(syncResponse.status).toBe(502);
    expect(syncBody.parent.notionLastSyncStatus).toBe("failed");
    expect(syncBody.student.notionConnected).toBe(false);
  });
});

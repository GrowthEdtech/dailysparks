import { afterEach, describe, expect, test } from "vitest";

import { getNotionConfig, isNotionConfigured } from "./notion-config";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("notion config", () => {
  test("returns null when required env vars are missing", () => {
    delete process.env.NOTION_OAUTH_CLIENT_ID;
    delete process.env.NOTION_OAUTH_CLIENT_SECRET;
    delete process.env.NOTION_OAUTH_REDIRECT_URI;
    delete process.env.NOTION_TOKEN_ENCRYPTION_SECRET;

    expect(getNotionConfig()).toBeNull();
    expect(isNotionConfigured()).toBe(false);
  });

  test("returns the normalized Notion config when env vars are present", () => {
    process.env.NOTION_OAUTH_CLIENT_ID = "notion-client-id";
    process.env.NOTION_OAUTH_CLIENT_SECRET = "notion-client-secret";
    process.env.NOTION_OAUTH_REDIRECT_URI =
      "https://dailysparks.geledtech.com/api/notion/callback";
    process.env.NOTION_TOKEN_ENCRYPTION_SECRET = "test-encryption-secret";

    expect(getNotionConfig()).toEqual(
      expect.objectContaining({
        clientId: "notion-client-id",
        clientSecret: "notion-client-secret",
        redirectUri: "https://dailysparks.geledtech.com/api/notion/callback",
        encryptionSecret: "test-encryption-secret",
        dailyBriefTypeName: "Daily Brief",
        dailyBriefStatusName: "Generated",
      }),
    );
    expect(isNotionConfigured()).toBe(true);
  });

  test("allows overriding daily brief delivery labels", () => {
    process.env.NOTION_OAUTH_CLIENT_ID = "notion-client-id";
    process.env.NOTION_OAUTH_CLIENT_SECRET = "notion-client-secret";
    process.env.NOTION_OAUTH_REDIRECT_URI =
      "https://dailysparks.geledtech.com/api/notion/callback";
    process.env.NOTION_TOKEN_ENCRYPTION_SECRET = "test-encryption-secret";
    process.env.NOTION_DAILY_BRIEF_TYPE_NAME = "Reading Run";
    process.env.NOTION_DAILY_BRIEF_STATUS_NAME = "Delivered";

    expect(getNotionConfig()).toEqual(
      expect.objectContaining({
        dailyBriefTypeName: "Reading Run",
        dailyBriefStatusName: "Delivered",
      }),
    );
  });
});

const DEFAULT_NOTION_API_BASE_URL = "https://api.notion.com/v1";
const DEFAULT_NOTION_VERSION = "2026-03-11";

export type NotionConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encryptionSecret: string;
  apiBaseUrl: string;
  notionVersion: string;
  dailyBriefTypeName: string;
  dailyBriefStatusName: string;
};

function normalizeEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

export function getNotionConfig(): NotionConfig | null {
  const clientId = normalizeEnvValue(process.env.NOTION_OAUTH_CLIENT_ID);
  const clientSecret = normalizeEnvValue(process.env.NOTION_OAUTH_CLIENT_SECRET);
  const redirectUri = normalizeEnvValue(process.env.NOTION_OAUTH_REDIRECT_URI);
  const encryptionSecret = normalizeEnvValue(process.env.NOTION_TOKEN_ENCRYPTION_SECRET);

  if (!clientId || !clientSecret || !redirectUri || !encryptionSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    encryptionSecret,
    apiBaseUrl:
      normalizeEnvValue(process.env.NOTION_API_BASE_URL) || DEFAULT_NOTION_API_BASE_URL,
    notionVersion:
      normalizeEnvValue(process.env.NOTION_API_VERSION) || DEFAULT_NOTION_VERSION,
    dailyBriefTypeName:
      normalizeEnvValue(process.env.NOTION_DAILY_BRIEF_TYPE_NAME) || "Daily Brief",
    dailyBriefStatusName:
      normalizeEnvValue(process.env.NOTION_DAILY_BRIEF_STATUS_NAME) || "Generated",
  };
}

export function isNotionConfigured() {
  return getNotionConfig() !== null;
}

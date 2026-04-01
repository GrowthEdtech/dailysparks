import { randomUUID } from "node:crypto";

export const NOTION_STATE_COOKIE_NAME = "daily-sparks-notion-state";

function serializeCookie(name: string, value: string, maxAgeSeconds: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAgeSeconds}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function createNotionStateValue() {
  return randomUUID();
}

export function createNotionStateCookieHeader(state: string) {
  return serializeCookie(NOTION_STATE_COOKIE_NAME, state, 60 * 10);
}

export function clearNotionStateCookieHeader() {
  return serializeCookie(NOTION_STATE_COOKIE_NAME, "", 0);
}

export function getNotionStateCookieValue(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.split("=");

    if (rawName === NOTION_STATE_COOKIE_NAME) {
      return decodeURIComponent(rawValueParts.join("="));
    }
  }

  return null;
}

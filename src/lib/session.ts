export const SESSION_COOKIE_NAME = "daily-sparks-session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type CookieOptions = {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  parts.push(`Path=${options.path ?? "/"}`);

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function createSessionCookieHeader(email: string) {
  return serializeCookie(SESSION_COOKIE_NAME, email, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookieHeader() {
  return serializeCookie(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function getSessionEmailFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.split("=");

    if (rawName === SESSION_COOKIE_NAME) {
      return decodeURIComponent(rawValueParts.join("="));
    }
  }

  return null;
}

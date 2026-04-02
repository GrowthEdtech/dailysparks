import { createHmac, timingSafeEqual } from "node:crypto";

export const EDITORIAL_ADMIN_SESSION_COOKIE_NAME =
  "daily-sparks-editorial-admin";

const EDITORIAL_ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;
const EDITORIAL_ADMIN_SESSION_MAX_AGE_MS =
  EDITORIAL_ADMIN_SESSION_MAX_AGE * 1000;

export type EditorialAdminSession = {
  role: "editorial-admin";
  issuedAt: number;
  expiresAt: number;
};

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

function getEditorialAdminPassword() {
  return process.env.DAILY_SPARKS_EDITORIAL_ADMIN_PASSWORD ?? "";
}

function getEditorialAdminSessionSecret() {
  return process.env.DAILY_SPARKS_EDITORIAL_ADMIN_SESSION_SECRET ?? "";
}

function createEditorialAdminSessionCookieHeader(sessionCookie: string) {
  return serializeCookie(EDITORIAL_ADMIN_SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    maxAge: EDITORIAL_ADMIN_SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function parseCookieValue(cookieHeader: string, cookieName: string) {
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.split("=");

    if (rawName === cookieName) {
      return decodeURIComponent(rawValueParts.join("="));
    }
  }

  return null;
}

function createSessionSignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function timingSafeEqualString(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseSessionPayload(payload: string): EditorialAdminSession | null {
  try {
    const decodedPayload = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<EditorialAdminSession>;

    if (
      decodedPayload.role !== "editorial-admin" ||
      typeof decodedPayload.issuedAt !== "number" ||
      typeof decodedPayload.expiresAt !== "number"
    ) {
      return null;
    }

    return {
      role: "editorial-admin",
      issuedAt: decodedPayload.issuedAt,
      expiresAt: decodedPayload.expiresAt,
    };
  } catch {
    return null;
  }
}

export function isEditorialAdminAuthConfigured() {
  return Boolean(
    getEditorialAdminPassword() && getEditorialAdminSessionSecret(),
  );
}

export function verifyEditorialAdminPassword(password: string) {
  const configuredPassword = getEditorialAdminPassword();

  if (!configuredPassword) {
    return false;
  }

  return timingSafeEqualString(password, configuredPassword);
}

export function createEditorialAdminSession() {
  const sessionSecret = getEditorialAdminSessionSecret();

  if (!sessionSecret) {
    throw new Error("Editorial admin session secret is not configured.");
  }

  const issuedAt = Date.now();
  const session: EditorialAdminSession = {
    role: "editorial-admin",
    issuedAt,
    expiresAt: issuedAt + EDITORIAL_ADMIN_SESSION_MAX_AGE_MS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createSessionSignature(payload, sessionSecret);
  const cookieValue = `${payload}.${signature}`;

  return {
    session,
    cookieHeader: createEditorialAdminSessionCookieHeader(cookieValue),
  };
}

export function clearEditorialAdminSessionCookieHeader() {
  return serializeCookie(EDITORIAL_ADMIN_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function getEditorialAdminSessionFromCookieValue(
  sessionCookie: string | null | undefined,
) {
  if (!sessionCookie) {
    return null;
  }

  const sessionSecret = getEditorialAdminSessionSecret();

  if (!sessionSecret) {
    return null;
  }

  const [payload, signature, ...rest] = sessionCookie.split(".");

  if (!payload || !signature || rest.length > 0) {
    return null;
  }

  const expectedSignature = createSessionSignature(payload, sessionSecret);

  if (!timingSafeEqualString(signature, expectedSignature)) {
    return null;
  }

  const session = parseSessionPayload(payload);

  if (!session || Date.now() >= session.expiresAt) {
    return null;
  }

  return session;
}

export function getEditorialAdminSessionFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  return getEditorialAdminSessionFromCookieValue(
    parseCookieValue(cookieHeader, EDITORIAL_ADMIN_SESSION_COOKIE_NAME),
  );
}

export function getEditorialAdminSessionFromCookieStore(cookieStore: {
  get(name: string): { value: string } | undefined;
}) {
  return getEditorialAdminSessionFromCookieValue(
    cookieStore.get(EDITORIAL_ADMIN_SESSION_COOKIE_NAME)?.value,
  );
}

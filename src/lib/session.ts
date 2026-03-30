import type { DecodedIdToken } from "firebase-admin/auth";

import { getFirebaseAdminAuth } from "./firebase-admin";

export const SESSION_COOKIE_NAME = "daily-sparks-session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 14;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE * 1000;
const RECENT_AUTH_WINDOW_SECONDS = 60 * 5;

export type SessionIdentity = {
  uid: string;
  email: string;
  name: string;
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

function createSessionCookieHeader(sessionCookie: string) {
  return serializeCookie(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function toSessionIdentity(decodedToken: DecodedIdToken | null): SessionIdentity | null {
  if (!decodedToken?.email) {
    return null;
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email.trim().toLowerCase(),
    name: typeof decodedToken.name === "string" ? decodedToken.name.trim() : "",
  };
}

function getSessionCookieFromHeader(cookieHeader: string) {
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.split("=");

    if (rawName === SESSION_COOKIE_NAME) {
      return decodeURIComponent(rawValueParts.join("="));
    }
  }

  return null;
}

export async function createSessionFromIdToken(idToken: string) {
  const auth = getFirebaseAdminAuth();
  const decodedToken = await auth.verifyIdToken(idToken);
  const authTime = decodedToken.auth_time ?? 0;
  const signedInRecently =
    Number.isFinite(authTime) &&
    Date.now() - authTime * 1000 <= RECENT_AUTH_WINDOW_SECONDS * 1000;

  if (!signedInRecently) {
    throw new Error("Please sign in with Google again to continue.");
  }

  const identity = toSessionIdentity(decodedToken);

  if (!identity) {
    throw new Error("Google sign-in did not return an email address.");
  }

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  return {
    cookieHeader: createSessionCookieHeader(sessionCookie),
    identity,
  };
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

export async function getSessionFromCookieValue(
  sessionCookie: string | null | undefined,
) {
  if (!sessionCookie) {
    return null;
  }

  try {
    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifySessionCookie(sessionCookie);
    return toSessionIdentity(decodedToken);
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  return getSessionFromCookieValue(getSessionCookieFromHeader(cookieHeader));
}

export async function getSessionFromCookieStore(cookieStore: {
  get(name: string): { value: string } | undefined;
}) {
  return getSessionFromCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function getSessionEmailFromRequest(request: Request) {
  const session = await getSessionFromRequest(request);
  return session?.email ?? null;
}

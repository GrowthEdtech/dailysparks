import { cookies } from "next/headers";
import { getEditorialAdminSessionFromCookieStore } from "./editorial-admin-auth";

const DAILY_BRIEF_SCHEDULER_HEADER = "x-daily-sparks-scheduler-secret";

export function getDailyBriefSchedulerSecret() {
  return process.env.DAILY_SPARKS_SCHEDULER_SECRET?.trim() ?? "";
}

export function isDailyBriefSchedulerConfigured() {
  return Boolean(getDailyBriefSchedulerSecret());
}

export function hasValidDailyBriefSchedulerSecret(request: Request) {
  const configuredSecret = getDailyBriefSchedulerSecret();

  if (!configuredSecret) {
    return false;
  }

  return request.headers.get(DAILY_BRIEF_SCHEDULER_HEADER) === configuredSecret;
}

export function getDailyBriefSchedulerHeaderName() {
  return DAILY_BRIEF_SCHEDULER_HEADER;
}

export async function requireAdminServerSession() {
  const cookieStore = await cookies();
  const session = getEditorialAdminSessionFromCookieStore(cookieStore);

  if (!session) {
    throw new Error("Unauthorized: Editorial admin session required.");
  }

  return session;
}

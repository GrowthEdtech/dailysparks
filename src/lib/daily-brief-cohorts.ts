import type { ParentProfile } from "./mvp-types";

export const DAILY_BRIEF_EDITORIAL_COHORTS = [
  "APAC",
  "EMEA",
  "AMER",
] as const;

export type DailyBriefEditorialCohort =
  (typeof DAILY_BRIEF_EDITORIAL_COHORTS)[number];

export function isDailyBriefEditorialCohort(
  value: unknown,
): value is DailyBriefEditorialCohort {
  return DAILY_BRIEF_EDITORIAL_COHORTS.includes(
    value as DailyBriefEditorialCohort,
  );
}

function parseOffsetLabel(value: string) {
  const normalized = value.replace("UTC", "GMT");
  const match = normalized.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i);

  if (!match) {
    return null;
  }

  const [, sign, rawHours, rawMinutes] = match;
  const hours = Number.parseInt(rawHours, 10);
  const minutes = Number.parseInt(rawMinutes ?? "0", 10);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  const direction = sign === "-" ? -1 : 1;

  return direction * (hours * 60 + minutes);
}

export function getUtcOffsetMinutesForTimeZone(
  timeZone: string,
  evaluationDate = new Date(),
) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  });
  const timeZoneName = formatter
    .formatToParts(evaluationDate)
    .find((part) => part.type === "timeZoneName")?.value;

  return parseOffsetLabel(timeZoneName ?? "GMT+00:00") ?? 0;
}

export function getEditorialCohortFromUtcOffsetMinutes(
  utcOffsetMinutes: number,
): DailyBriefEditorialCohort {
  if (utcOffsetMinutes >= 7 * 60) {
    return "APAC";
  }

  if (utcOffsetMinutes <= -2 * 60) {
    return "AMER";
  }

  return "EMEA";
}

export function getEditorialCohortForTimeZone(
  timeZone: string,
  evaluationDate = new Date(),
) {
  return getEditorialCohortFromUtcOffsetMinutes(
    getUtcOffsetMinutesForTimeZone(timeZone, evaluationDate),
  );
}

export function getEditorialCohortForProfile(
  profile: ParentProfile,
  evaluationDate = new Date(),
) {
  return getEditorialCohortForTimeZone(
    profile.parent.deliveryTimeZone,
    evaluationDate,
  );
}

export function buildEditorialCohortEvaluationDate(runDate: string) {
  return new Date(`${runDate}T12:00:00.000Z`);
}

export function filterProfilesByEditorialCohort(
  profiles: ParentProfile[],
  editorialCohort: DailyBriefEditorialCohort,
  evaluationDate = new Date(),
) {
  return profiles.filter(
    (profile) =>
      getEditorialCohortForProfile(profile, evaluationDate) === editorialCohort,
  );
}

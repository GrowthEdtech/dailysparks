import {
  formatPreferredDeliveryLocalTime,
  formatTimeZoneLabel,
} from "./delivery-locale";
import type { ParentProfile } from "./mvp-types";

export type DeliveryWindowAssessment = {
  profile: ParentProfile;
  localDate: string;
  localTime: string;
  due: boolean;
  overdue: boolean;
  windowLabel: string;
};

function getLocalParts(timestamp: string, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(timestamp));
  const lookup = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: lookup.get("year") ?? "1970",
    month: lookup.get("month") ?? "01",
    day: lookup.get("day") ?? "01",
    hour: lookup.get("hour") ?? "00",
    minute: lookup.get("minute") ?? "00",
  };
}

export function parsePreferredDeliveryLocalTime(value: string) {
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number.parseInt(rawHour ?? "", 10);
  const minute = Number.parseInt(rawMinute ?? "", 10);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

export function assessProfileDeliveryWindow(input: {
  profile: ParentProfile;
  runDate: string;
  dispatchTimestamp: string;
}) {
  const { profile, runDate, dispatchTimestamp } = input;
  const localParts = getLocalParts(
    dispatchTimestamp,
    profile.parent.deliveryTimeZone,
  );
  const localDate = `${localParts.year}-${localParts.month}-${localParts.day}`;
  const localTime = `${localParts.hour}:${localParts.minute}`;
  const localMinutes =
    Number.parseInt(localParts.hour, 10) * 60 +
    Number.parseInt(localParts.minute, 10);
  const preferredMinutes =
    parsePreferredDeliveryLocalTime(profile.parent.preferredDeliveryLocalTime) ?? 540;
  const overdue = localDate > runDate;
  const due =
    overdue ||
    (localDate === runDate && localMinutes >= preferredMinutes);

  return {
    profile,
    localDate,
    localTime,
    due,
    overdue,
    windowLabel: `${formatPreferredDeliveryLocalTime(
      profile.parent.preferredDeliveryLocalTime,
    )} · ${formatTimeZoneLabel(profile.parent.deliveryTimeZone)}`,
  } satisfies DeliveryWindowAssessment;
}

export function splitProfilesByDeliveryWindow(input: {
  profiles: ParentProfile[];
  runDate: string;
  dispatchTimestamp: string;
}) {
  return input.profiles.reduce<{
    dueProfiles: ParentProfile[];
    pendingProfiles: ParentProfile[];
    assessments: DeliveryWindowAssessment[];
  }>(
    (result, profile) => {
      const assessment = assessProfileDeliveryWindow({
        profile,
        runDate: input.runDate,
        dispatchTimestamp: input.dispatchTimestamp,
      });

      return {
        dueProfiles: assessment.due
          ? [...result.dueProfiles, profile]
          : result.dueProfiles,
        pendingProfiles: assessment.due
          ? result.pendingProfiles
          : [...result.pendingProfiles, profile],
        assessments: [...result.assessments, assessment],
      };
    },
    {
      dueProfiles: [],
      pendingProfiles: [],
      assessments: [],
    },
  );
}

export function buildProfileLocalDeliveryWindowLabel(profile: ParentProfile) {
  return `${formatPreferredDeliveryLocalTime(
    profile.parent.preferredDeliveryLocalTime,
  )} · ${formatTimeZoneLabel(profile.parent.deliveryTimeZone)}`;
}

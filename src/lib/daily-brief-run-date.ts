const DAILY_BRIEF_BUSINESS_TIME_ZONE = "Asia/Hong_Kong";

const businessDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DAILY_BRIEF_BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getDailyBriefBusinessDate(now = new Date()) {
  const parts = businessDateFormatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

export function getNextDailyBriefBusinessDate(now = new Date()) {
  return getDailyBriefBusinessDate(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
  );
}

export function getDailyBriefDispatchRunDates(now = new Date()) {
  const currentBusinessDate = getDailyBriefBusinessDate(now);
  const previousBusinessDate = getDailyBriefBusinessDate(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
  );

  return currentBusinessDate === previousBusinessDate
    ? [currentBusinessDate]
    : [currentBusinessDate, previousBusinessDate];
}

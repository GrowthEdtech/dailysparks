import type {
  DailyBriefNotebookWeeklyRecapRecord,
} from "../../lib/daily-brief-notebook-weekly-recap-store";

function formatTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function resolveSelectedWeeklyRecap(
  records: DailyBriefNotebookWeeklyRecapRecord[],
  selectedId: string | null,
) {
  if (records.length === 0) {
    return null;
  }

  if (!selectedId) {
    return records[0] ?? null;
  }

  return records.find((record) => record.id === selectedId) ?? records[0] ?? null;
}

export function buildWeeklyRecapHistoryPreview(
  record: DailyBriefNotebookWeeklyRecapRecord,
) {
  const summary = record.summaryLines[0]?.trim();

  if (summary) {
    return summary;
  }

  if (record.topTags.length > 0) {
    return `Focus tags: ${record.topTags.join(", ")}`;
  }

  return `${record.totalEntries} notebook ${record.totalEntries === 1 ? "entry" : "entries"} saved this week.`;
}

export function getWeeklyRecapEmailStatusLabel(
  record: DailyBriefNotebookWeeklyRecapRecord,
) {
  if (record.emailLastStatus === "sent") {
    return record.emailLastSentAt
      ? `Sent ${formatTimestamp(record.emailLastSentAt) ?? "recently"}`
      : "Sent";
  }

  if (record.emailLastStatus === "failed") {
    return record.emailLastErrorMessage
      ? `Failed: ${record.emailLastErrorMessage}`
      : "Failed";
  }

  if (record.emailLastStatus === "skipped") {
    return record.emailLastErrorMessage
      ? `Skipped: ${record.emailLastErrorMessage}`
      : "Skipped";
  }

  return "Not yet delivered";
}

export function getWeeklyRecapNotionStatusLabel(
  record: DailyBriefNotebookWeeklyRecapRecord,
) {
  if (record.notionLastSyncedAt) {
    return `Synced to Notion${record.notionLastSyncPageUrl ? "" : ""}`;
  }

  return "Not yet synced";
}

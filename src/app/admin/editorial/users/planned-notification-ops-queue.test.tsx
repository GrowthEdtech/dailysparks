import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import PlannedNotificationOpsQueue from "./planned-notification-ops-queue";

describe("PlannedNotificationOpsQueue", () => {
  test("renders aging controls and sort controls for ops triage", () => {
    const markup = renderToStaticMarkup(
      <PlannedNotificationOpsQueue
        summary={{
          totalCount: 1,
          pendingCount: 1,
          retryDueCount: 0,
          coolingDownCount: 0,
          escalatedCount: 0,
          dedupedCount: 0,
          under24hCount: 1,
          between24hAnd72hCount: 0,
          over72hCount: 0,
        }}
        items={[
          {
            id: "parent-1:trial-ending-reminder",
            parentId: "parent-1",
            parentEmail: "parent@example.com",
            parentName: "Parent Example",
            studentName: "Katherine",
            programmeLabel: "PYP 5",
            notificationFamily: "trial-ending-reminder",
            notificationLabel: "Trial ending",
            queueLabel: "Pending",
            detail: "Trial expires soon.",
            lastSentAt: null,
            lastResolvedAt: null,
            lastFailureAt: null,
            retryAvailableAt: null,
            failureCount: 0,
            deduped: false,
            ageStartedAt: "2026-04-05T18:00:00.000Z",
            ageHours: 6,
            agingLabel: "Under 24h",
          },
        ]}
      />,
    );

    expect(markup).toContain("Age / SLA");
    expect(markup).toContain("Older than 72h");
    expect(markup).toContain("Sort by");
    expect(markup).toContain("Oldest unresolved first");
  });
});

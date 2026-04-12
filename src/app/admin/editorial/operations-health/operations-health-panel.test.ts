import { describe, expect, test } from "vitest";

import * as operationsHealthPanel from "./operations-health-panel";

describe("operations health panel polling helpers", () => {
  test("detects when a completed immutable run is newer than the queued request", () => {
    expect(
      typeof operationsHealthPanel.hasCompletedOperationsHealthRunAfterQueuedAt,
    ).toBe("function");

    const run = {
      completedAt: "2026-04-12T03:27:30.000Z",
    };

    expect(
      operationsHealthPanel.hasCompletedOperationsHealthRunAfterQueuedAt(
        run,
        "2026-04-12T03:27:08.000Z",
      ),
    ).toBe(true);
    expect(
      operationsHealthPanel.hasCompletedOperationsHealthRunAfterQueuedAt(
        run,
        "2026-04-12T03:28:00.000Z",
      ),
    ).toBe(false);
  });
});

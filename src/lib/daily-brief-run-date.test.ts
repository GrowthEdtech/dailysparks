import { describe, expect, test } from "vitest";

import { getDailyBriefBusinessDate } from "./daily-brief-run-date";

describe("daily brief business date", () => {
  test("uses the Hong Kong calendar date instead of the raw UTC ISO date", () => {
    expect(
      getDailyBriefBusinessDate(new Date("2026-04-03T17:30:00.000Z")),
    ).toBe("2026-04-04");
  });

  test("keeps late-morning Hong Kong timestamps on the same business date", () => {
    expect(
      getDailyBriefBusinessDate(new Date("2026-04-04T01:30:00.000Z")),
    ).toBe("2026-04-04");
  });
});

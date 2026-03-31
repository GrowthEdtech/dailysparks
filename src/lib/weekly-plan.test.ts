import { describe, expect, test } from "vitest";

import {
  getProgrammeStageSummary,
  getWeeklyPlan,
} from "./weekly-plan";

describe("weekly plan programme differentiation", () => {
  test("returns a programme-level title instead of year-specific copy", () => {
    expect(getWeeklyPlan("PYP", 5).title).toBe("PYP weekly rhythm");
    expect(getWeeklyPlan("MYP", 3).title).toBe("MYP weekly rhythm");
    expect(getWeeklyPlan("DP", 1).title).toBe("DP weekly rhythm");
  });

  test("describes each programme with a clearly different reading mode", () => {
    expect(getProgrammeStageSummary("PYP").description).toContain("curiosity");
    expect(getProgrammeStageSummary("MYP").description).toContain("analysis");
    expect(getProgrammeStageSummary("DP").description).toContain("argument");
  });

  test("provides concise selector labels for each programme", () => {
    expect(getProgrammeStageSummary("PYP").selectorLabel).toBe("Theme-based");
    expect(getProgrammeStageSummary("MYP").selectorLabel).toBe("Analytical");
    expect(getProgrammeStageSummary("DP").selectorLabel).toBe("Argument-based");
  });
});

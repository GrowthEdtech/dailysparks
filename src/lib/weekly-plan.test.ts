import { describe, expect, test } from "vitest";

import { getWeeklyPlan } from "./weekly-plan";

describe("weekly plan", () => {
  test("builds a pyp weekly plan with a sunday special", () => {
    const plan = getWeeklyPlan("PYP", 5);

    expect(plan.title).toMatch(/PYP/i);
    expect(plan.weekdays).toHaveLength(6);
    expect(plan.weekdays[0]?.day).toBe("Monday");
    expect(plan.sunday.label).toMatch(/Sunday Special/i);
  });

  test("builds a dp weekly plan with tok style sunday language", () => {
    const plan = getWeeklyPlan("DP", 2);

    expect(plan.title).toMatch(/DP/i);
    expect(plan.sunday.theme).toMatch(/TOK|extended/i);
  });
});

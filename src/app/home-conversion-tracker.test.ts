import { describe, expect, test } from "vitest";

import { getReachedScrollMilestones } from "./home-conversion-tracker";

describe("home conversion tracker milestones", () => {
  test("returns only untracked milestones that have been reached", () => {
    expect(getReachedScrollMilestones(12, new Set())).toEqual([]);
    expect(getReachedScrollMilestones(25, new Set())).toEqual([25]);
    expect(getReachedScrollMilestones(78, new Set([25, 50]))).toEqual([75]);
    expect(getReachedScrollMilestones(95, new Set([25, 50, 75]))).toEqual([
      90,
    ]);
  });

  test("does not repeat milestones that were already tracked", () => {
    expect(
      getReachedScrollMilestones(100, new Set([25, 50, 75, 90])),
    ).toEqual([]);
  });
});

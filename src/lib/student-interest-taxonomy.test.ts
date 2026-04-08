import { describe, expect, test } from "vitest";

import {
  DEFAULT_PUBLIC_PROGRAMME,
  getInterestTaxonomyForProgramme,
  getPublicProgrammeOptions,
  getPublicProgrammeYear,
  sanitizeInterestTagsForProgramme,
} from "./student-interest-taxonomy";

describe("student interest taxonomy", () => {
  test("exposes only MYP and DP as public programme options", () => {
    expect(getPublicProgrammeOptions()).toEqual(["MYP", "DP"]);
    expect(DEFAULT_PUBLIC_PROGRAMME).toBe("MYP");
    expect(getPublicProgrammeYear("MYP")).toBe(3);
    expect(getPublicProgrammeYear("DP")).toBe(1);
  });

  test("returns programme-aware interest taxonomy", () => {
    expect(getInterestTaxonomyForProgramme("MYP")).toEqual([
      "Tech & Innovation",
      "Earth & Environment",
      "Society & Culture",
      "History & Individuals",
    ]);

    expect(getInterestTaxonomyForProgramme("DP")).toEqual([
      "Economics",
      "Global Politics",
      "Psychology",
      "Science & Technology",
      "History",
      "Philosophy",
      "Law",
      "TOK",
    ]);
  });

  test("prunes incompatible or duplicate interest tags by programme", () => {
    expect(
      sanitizeInterestTagsForProgramme("MYP", [
        "Tech & Innovation",
        "TOK",
        "Tech & Innovation",
        " Society & Culture ",
      ]),
    ).toEqual(["Tech & Innovation", "Society & Culture"]);

    expect(
      sanitizeInterestTagsForProgramme("DP", [
        "TOK",
        "Law",
        "Earth & Environment",
      ]),
    ).toEqual(["TOK", "Law"]);

    expect(
      sanitizeInterestTagsForProgramme("PYP", [
        "Tech & Innovation",
        "TOK",
      ]),
    ).toEqual([]);
  });
});

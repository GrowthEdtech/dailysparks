import { describe, expect, test } from "vitest";

import {
  DEFAULT_PUBLIC_PROGRAMME,
  getAdminProgrammeOptions,
  getEditoriallyActiveProgrammes,
  getPublicProgrammeOptions,
  isLegacyProgramme,
  isProgrammeEditoriallyActive,
  isProgrammePubliclyAvailable,
} from "./programme-availability-policy";

describe("programme availability policy", () => {
  test("keeps only MYP and DP publicly available", () => {
    expect(getPublicProgrammeOptions()).toEqual(["MYP", "DP"]);
    expect(DEFAULT_PUBLIC_PROGRAMME).toBe("MYP");
    expect(isProgrammePubliclyAvailable("MYP")).toBe(true);
    expect(isProgrammePubliclyAvailable("DP")).toBe(true);
    expect(isProgrammePubliclyAvailable("PYP")).toBe(false);
  });

  test("limits editorially active programmes to the MYP and DP product line", () => {
    expect(getEditoriallyActiveProgrammes()).toEqual(["MYP", "DP"]);
    expect(isProgrammeEditoriallyActive("MYP")).toBe(true);
    expect(isProgrammeEditoriallyActive("DP")).toBe(true);
    expect(isProgrammeEditoriallyActive("PYP")).toBe(false);
  });

  test("retains PYP as a legacy admin-visible programme", () => {
    expect(getAdminProgrammeOptions()).toEqual(["MYP", "DP", "PYP"]);
    expect(isLegacyProgramme("PYP")).toBe(true);
    expect(isLegacyProgramme("MYP")).toBe(false);
  });
});

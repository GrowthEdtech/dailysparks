import { describe, expect, test } from "vitest";

import {
  GOODNOTES_EMAIL_SUFFIX,
  getGoodnotesLocalPart,
  isValidGoodnotesAddress,
  normalizeGoodnotesAddress,
} from "./goodnotes-address";

describe("goodnotes-address", () => {
  test("builds a full Goodnotes destination from a local part", () => {
    expect(normalizeGoodnotesAddress(" Katherine ")).toBe(
      `katherine${GOODNOTES_EMAIL_SUFFIX}`,
    );
  });

  test("accepts an existing full Goodnotes destination", () => {
    expect(normalizeGoodnotesAddress("katherine@goodnotes.email")).toBe(
      "katherine@goodnotes.email",
    );
  });

  test("rejects other email domains", () => {
    expect(normalizeGoodnotesAddress("katherine@example.com")).toBe("");
  });

  test("extracts the local part for display", () => {
    expect(getGoodnotesLocalPart("katherine@goodnotes.email")).toBe("katherine");
  });

  test("validates only goodnotes.email destinations", () => {
    expect(isValidGoodnotesAddress("katherine@goodnotes.email")).toBe(true);
    expect(isValidGoodnotesAddress("katherine@example.com")).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  getEditorialAdminEmails,
  isEditorialAdminEmail,
} from "./editorial-admin";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("editorial admin config", () => {
  test("parses the configured admin allowlist from env", () => {
    process.env.DAILY_SPARKS_ADMIN_EMAILS =
      " parent@example.com , ops@example.com\neditor@example.com ";

    expect(getEditorialAdminEmails()).toEqual([
      "parent@example.com",
      "ops@example.com",
      "editor@example.com",
    ]);
  });

  test("matches admin emails case-insensitively", () => {
    process.env.DAILY_SPARKS_ADMIN_EMAILS = "parent@example.com";

    expect(isEditorialAdminEmail(" Parent@Example.com ")).toBe(true);
    expect(isEditorialAdminEmail("student@example.com")).toBe(false);
    expect(isEditorialAdminEmail("")).toBe(false);
  });
});

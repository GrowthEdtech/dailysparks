import { describe, expect, test } from "vitest";

import { getAccountMenuInitials } from "./account-menu";

describe("account menu initials", () => {
  test("uses the first letters from the first two name parts", () => {
    expect(getAccountMenuInitials("Lora Green")).toBe("LG");
  });

  test("falls back to email initials when the full name is blank", () => {
    expect(getAccountMenuInitials("   ", "admin@geledtech.com")).toBe("AG");
  });

  test("falls back to Daily Sparks initials when no name or email is available", () => {
    expect(getAccountMenuInitials("", "")).toBe("DS");
  });
});

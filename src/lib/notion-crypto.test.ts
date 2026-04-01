import { describe, expect, test } from "vitest";

import { decryptNotionToken, encryptNotionToken } from "./notion-crypto";

describe("notion crypto", () => {
  test("encrypts and decrypts token payloads", () => {
    const cipherText = encryptNotionToken("secret-key", "notion-access-token");

    expect(cipherText).not.toBe("notion-access-token");
    expect(decryptNotionToken("secret-key", cipherText)).toBe("notion-access-token");
  });
});

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  buildAiConnectionApiKeyPreview,
  decryptAiConnectionApiKey,
  encryptAiConnectionApiKey,
  getAiConnectionEncryptionSecret,
  isAiConnectionEncryptionConfigured,
} from "./ai-connection-crypto";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_AI_CONFIG_ENCRYPTION_SECRET:
      "test-ai-connection-encryption-secret",
  };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("ai connection crypto", () => {
  test("reports whether AI connection encryption is configured", () => {
    expect(isAiConnectionEncryptionConfigured()).toBe(true);
    expect(getAiConnectionEncryptionSecret()).toBe(
      "test-ai-connection-encryption-secret",
    );

    delete process.env.DAILY_SPARKS_AI_CONFIG_ENCRYPTION_SECRET;

    expect(isAiConnectionEncryptionConfigured()).toBe(false);
  });

  test("encrypts and decrypts an AI API key", () => {
    const plaintextApiKey = "dummy-token-example-1234567890";
    const cipherText = encryptAiConnectionApiKey(
      "test-ai-connection-encryption-secret",
      plaintextApiKey,
    );

    expect(cipherText).not.toBe(plaintextApiKey);
    expect(
      decryptAiConnectionApiKey(
        "test-ai-connection-encryption-secret",
        cipherText,
      ),
    ).toBe(plaintextApiKey);
  });

  test("builds a masked preview instead of returning the full key", () => {
    expect(buildAiConnectionApiKeyPreview("dummy-token-abcdef1234567890")).toBe(
      "••••••••7890",
    );
    expect(buildAiConnectionApiKeyPreview("tiny")).toBe("••••");
  });
});

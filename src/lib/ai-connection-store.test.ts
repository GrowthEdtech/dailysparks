import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createAiConnection,
  deleteAiConnection,
  getDefaultAiConnection,
  getDefaultAiConnectionWithSecret,
  listAiConnections,
  updateAiConnection,
} from "./ai-connection-store";

const ORIGINAL_ENV = { ...process.env };
const PRIMARY_TEST_API_KEY = "test-key-example-1234567890";
const PRIMARY_ROTATED_TEST_API_KEY = "test-key-backup-87654321";
const FIRST_DEFAULT_TEST_API_KEY = "test-key-primary-12345678";
const SECONDARY_TEST_API_KEY = "test-key-backup-12345678";
const DISPOSABLE_TEST_API_KEY = "test-key-disposable-12345678";
let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(
    path.join(tmpdir(), "daily-sparks-ai-connections-"),
  );
  process.env = {
    ...ORIGINAL_ENV,
    DAILY_SPARKS_STORE_BACKEND: "local",
    DAILY_SPARKS_AI_CONNECTION_STORE_PATH: path.join(
      tempDirectory,
      "ai-connections.json",
    ),
    DAILY_SPARKS_AI_CONFIG_ENCRYPTION_SECRET:
      "test-ai-connection-encryption-secret",
  };
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("ai connection store", () => {
  test("creates and lists masked AI connections", async () => {
    const createdConnection = await createAiConnection({
      name: "NF Relay",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: PRIMARY_TEST_API_KEY,
      active: true,
      isDefault: true,
      notes: "Primary relay connection.",
    });
    const listedConnections = await listAiConnections();

    expect(createdConnection.apiKeyPreview).toBe("••••••••7890");
    expect(createdConnection.hasApiKey).toBe(true);
    expect(createdConnection.apiKeyCiphertext).not.toBe(PRIMARY_TEST_API_KEY);
    expect(listedConnections).toHaveLength(1);
    expect(listedConnections[0]?.isDefault).toBe(true);
  });

  test("switches the default connection and replaces API keys safely", async () => {
    const firstConnection = await createAiConnection({
      name: "Primary",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: FIRST_DEFAULT_TEST_API_KEY,
      active: true,
      isDefault: true,
      notes: "",
    });
    const secondConnection = await createAiConnection({
      name: "Backup",
      providerType: "openai-compatible",
      baseUrl: "https://relay.example.com/v1",
      defaultModel: "gpt-4.1",
      apiKey: SECONDARY_TEST_API_KEY,
      active: true,
      isDefault: false,
      notes: "",
    });

    const updatedConnection = await updateAiConnection(secondConnection.id, {
      isDefault: true,
      apiKey: PRIMARY_ROTATED_TEST_API_KEY,
    });
    const listedConnections = await listAiConnections();
    const refreshedFirst = listedConnections.find(
      (connection) => connection.id === firstConnection.id,
    );
    const refreshedSecond = listedConnections.find(
      (connection) => connection.id === secondConnection.id,
    );

    expect(updatedConnection?.isDefault).toBe(true);
    expect(updatedConnection?.apiKeyPreview).toBe("••••••••4321");
    expect(refreshedFirst?.isDefault).toBe(false);
    expect(refreshedSecond?.isDefault).toBe(true);
  });

  test("deletes saved AI connections", async () => {
    const createdConnection = await createAiConnection({
      name: "Disposable",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: DISPOSABLE_TEST_API_KEY,
      active: false,
      isDefault: false,
      notes: "",
    });

    await deleteAiConnection(createdConnection.id);

    expect(await listAiConnections()).toHaveLength(0);
  });

  test("returns the default AI connection for runtime use", async () => {
    await createAiConnection({
      name: "Backup",
      providerType: "openai-compatible",
      baseUrl: "https://relay.example.com/v1",
      defaultModel: "gpt-4.1",
      apiKey: SECONDARY_TEST_API_KEY,
      active: true,
      isDefault: false,
      notes: "",
    });
    await createAiConnection({
      name: "Primary",
      providerType: "openai-compatible",
      baseUrl: "https://relay.nf.video/v1",
      defaultModel: "gpt-5.4",
      apiKey: FIRST_DEFAULT_TEST_API_KEY,
      active: true,
      isDefault: true,
      notes: "",
    });

    const defaultConnection = await getDefaultAiConnection();
    const defaultConnectionWithSecret = await getDefaultAiConnectionWithSecret();

    expect(defaultConnection?.name).toBe("Primary");
    expect(defaultConnectionWithSecret?.apiKey).toBe(FIRST_DEFAULT_TEST_API_KEY);
    expect(defaultConnectionWithSecret?.defaultModel).toBe("gpt-5.4");
  });

  test("returns null when no default AI connection exists", async () => {
    expect(await getDefaultAiConnection()).toBeNull();
    expect(await getDefaultAiConnectionWithSecret()).toBeNull();
  });
});

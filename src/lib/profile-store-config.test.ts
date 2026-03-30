import { afterEach, describe, expect, test } from "vitest";

import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

const FIREBASE_ENV_KEYS = [
  "DAILY_SPARKS_STORE_BACKEND",
  "FIREBASE_PROJECT_ID",
] as const;

afterEach(() => {
  for (const key of FIREBASE_ENV_KEYS) {
    delete process.env[key];
  }

  process.env.NODE_ENV = "test";
});

describe("profile store config", () => {
  test("uses the local backend when firebase admin env vars are missing", () => {
    expect(getProfileStoreBackend()).toBe("local");
  });

  test("uses the firestore backend when the backend env is explicitly enabled", () => {
    process.env.DAILY_SPARKS_STORE_BACKEND = "firestore";
    process.env.FIREBASE_PROJECT_ID = "daily-sparks";

    expect(getProfileStoreBackend()).toBe("firestore");
  });

  test("rejects local storage in production", () => {
    process.env.NODE_ENV = "production";

    expect(() => validateProfileStoreConfig()).toThrow(/production.*firestore/i);
  });

  test("requires a firebase project id when firestore is enabled", () => {
    process.env.DAILY_SPARKS_STORE_BACKEND = "firestore";

    expect(() => validateProfileStoreConfig()).toThrow(/firebase_project_id/i);
  });
});

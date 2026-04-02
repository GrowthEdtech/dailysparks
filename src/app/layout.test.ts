import { describe, expect, test } from "vitest";

import { metadata } from "./layout";

const iconVersion = "2026-04-02-2";

describe("root layout metadata", () => {
  test("declares the full site icon set and web manifest", () => {
    expect(metadata.icons).toEqual({
      icon: [
        { url: `/favicon.ico?v=${iconVersion}`, sizes: "any" },
        { url: `/icon.png?v=${iconVersion}`, type: "image/png" },
      ],
      apple: [{ url: `/apple-icon.png?v=${iconVersion}`, type: "image/png" }],
    });
    expect(metadata.manifest).toBe(`/site.webmanifest?v=${iconVersion}`);
  });
});

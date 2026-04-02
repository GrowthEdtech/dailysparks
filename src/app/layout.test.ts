import { describe, expect, test } from "vitest";

import { metadata } from "./layout";

describe("root layout metadata", () => {
  test("declares the full site icon set and web manifest", () => {
    expect(metadata.icons).toEqual({
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.png", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png", type: "image/png" }],
    });
    expect(metadata.manifest).toBe("/site.webmanifest");
  });
});

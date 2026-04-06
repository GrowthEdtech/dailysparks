import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import RootLayout, { metadata } from "./layout";

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

  test("renders baseline Organization JSON-LD for machine-readability", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        RootLayout,
        undefined,
        React.createElement("div", undefined, "hello"),
      ),
    );

    expect(markup).toContain("application/ld+json");
    expect(markup).toContain("Growth Education Limited");
    expect(markup).toContain("Daily Sparks");
  });
});

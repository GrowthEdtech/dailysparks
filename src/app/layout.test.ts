import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import RootLayout, { metadata } from "./layout";

const iconVersion = "2026-04-02-2";
const baseUrl = "https://dailysparks.geledtech.com";

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

  test("declares search-facing site metadata defaults", () => {
    expect(metadata.metadataBase?.toString()).toBe(`${baseUrl}/`);
    expect(metadata.title).toEqual({
      default: "Daily Sparks | IB MYP + DP Reading Support",
      template: "%s | Daily Sparks",
    });
    expect(metadata.description).toBe(
      "Daily Sparks helps IB families build calmer reading habits for MYP and DP with Goodnotes delivery, Notion archive, and weekly recap support.",
    );
    expect(metadata.alternates).toEqual({
      canonical: "/",
    });
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
    expect(markup).toContain("WebSite");
  });

  test("renders Google Analytics bootstrap when a measurement id is configured", () => {
    const previousMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST1234";

    const markup = renderToStaticMarkup(
      React.createElement(
        RootLayout,
        undefined,
        React.createElement("div", undefined, "hello"),
      ),
    );

    expect(markup).toContain(
      "https://www.googletagmanager.com/gtag/js?id=G-TEST1234",
    );
    expect(markup).toContain("gtag('config', 'G-TEST1234'");

    if (previousMeasurementId === undefined) {
      delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
      return;
    }

    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = previousMeasurementId;
  });

  test("renders Google Analytics bootstrap from the default site stream when env is missing", () => {
    const previousMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

    const markup = renderToStaticMarkup(
      React.createElement(
        RootLayout,
        undefined,
        React.createElement("div", undefined, "hello"),
      ),
    );

    expect(markup).toContain(
      "https://www.googletagmanager.com/gtag/js?id=G-R5DPW78Q2Z",
    );
    expect(markup).toContain("gtag('config', 'G-R5DPW78Q2Z'");

    if (previousMeasurementId === undefined) {
      delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
      return;
    }

    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = previousMeasurementId;
  });
});

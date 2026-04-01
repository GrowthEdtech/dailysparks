/* eslint-disable @next/next/no-img-element */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import LandingIntegrationsSection from "./landing-integrations-section";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

describe("LandingIntegrationsSection", () => {
  test("renders the premium integrations showcase with both branded logos", () => {
    const markup = renderToStaticMarkup(<LandingIntegrationsSection />);

    expect(markup).toContain(
      "Deliver to one app, archive in another, or run both together.",
    );
    expect(markup).toContain("Student-ready delivery");
    expect(markup).toContain("Searchable family archive");
    expect(markup).toContain("/integrations/goodnotes-logo.svg");
    expect(markup).toContain("/integrations/notion-logo.svg");
  });
});

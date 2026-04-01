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
  test("renders a clear Goodnotes-versus-Notion comparison board", () => {
    const markup = renderToStaticMarkup(<LandingIntegrationsSection />);

    expect(markup).toContain(
      "Choose the setup that fits how your family reads and keeps records.",
    );
    expect(markup).toContain(
      "Best when the student reads in Goodnotes each day.",
    );
    expect(markup).toContain(
      "Best when parents want a searchable archive at home.",
    );
    expect(markup).toContain("Use one or both.");
    expect(markup).toContain("/integrations/goodnotes-logo.svg");
    expect(markup).toContain("/integrations/notion-logo.svg");
    expect(markup).not.toContain("Student-ready delivery");
    expect(markup).not.toContain("Premium but simple");
  });
});

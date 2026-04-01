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

    expect(markup).toContain("text-balance");
    expect(markup).not.toContain("max-w-[13ch]");
    expect(markup).not.toContain("md:max-w-[15ch]");
    expect(markup).not.toContain(
      "xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]",
    );
    expect(markup).not.toContain("xl:max-w-[30rem]");
    expect(markup).not.toContain(
      "xl:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.82fr)]",
    );
    expect(markup).not.toContain("xl:max-w-[25rem]");
    expect(markup).not.toContain("xl:justify-self-end");
    expect(markup).not.toContain("xl:col-start-2");
    expect(markup).not.toContain("lg:max-w-[42rem]");
    expect(markup).toContain("md:max-w-none");
    expect(markup).toContain("lg:max-w-none");
    expect(markup).toContain(
      'xl:whitespace-nowrap',
    );
    expect(markup).toContain(
      'xl:max-w-none',
    );
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

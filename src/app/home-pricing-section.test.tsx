import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import HomePricingSection from "./home-pricing-section";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../lib/marketing-analytics", () => ({
  trackMarketingEvent: vi.fn(),
}));

describe("HomePricingSection", () => {
  test("renders readable monthly and yearly CTA buttons", () => {
    const markup = renderToStaticMarkup(
      <HomePricingSection initialPricingMarket="intl" />,
    );

    expect(markup).toContain("Select monthly");
    expect(markup).toContain("Select yearly");
    expect(markup).toContain("Most Popular");
    expect(markup).toContain("text-[#f8fafc]");
    expect(markup).toContain("group flex w-full items-center justify-center gap-3");
  });
});

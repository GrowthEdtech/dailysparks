import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import Home from "./page";

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

vi.mock("./home-pricing-section", () => ({
  default: () => <div data-testid="pricing-section">Pricing</div>,
}));

vi.mock("./landing-integrations-section", () => ({
  default: () => <div data-testid="integrations-section">Integrations</div>,
}));

const informationalPages = [
  {
    href: "/privacy",
    label: "Privacy",
    loader: () => import("./privacy/page"),
    expectedTitle: "Privacy Policy",
    expectedDetail: "What we collect",
  },
  {
    href: "/terms",
    label: "Terms",
    loader: () => import("./terms/page"),
    expectedTitle: "Terms of Service",
    expectedDetail: "Subscriptions and billing",
  },
  {
    href: "/about",
    label: "About",
    loader: () => import("./about/page"),
    expectedTitle: "About Daily Sparks",
    expectedDetail: "Built for IB families",
  },
  {
    href: "/contact",
    label: "Contact",
    loader: () => import("./contact/page"),
    expectedTitle: "Contact Daily Sparks",
    expectedDetail: "info@geledtech.com",
  },
] as const;

describe("informational pages", () => {
  test("home footer links point to real informational routes", async () => {
    const markup = renderToStaticMarkup(await Home());

    for (const page of informationalPages) {
      expect(markup).toContain(`href="${page.href}"`);
      expect(markup).toContain(page.label);
    }

    expect(markup).not.toContain('href="#"');
  });

  test.each(informationalPages)(
    "$label page renders substantive content",
    async ({ loader, expectedTitle, expectedDetail }) => {
      const pageModule = await loader();
      const Page = pageModule.default;
      const markup = renderToStaticMarkup(<Page />);

      expect(markup).toContain(expectedTitle);
      expect(markup).toContain(expectedDetail);
      expect(markup).toContain("Daily Sparks");
    },
  );
});

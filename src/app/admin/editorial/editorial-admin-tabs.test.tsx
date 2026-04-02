import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

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

import EditorialAdminTabs from "./editorial-admin-tabs";

describe("EditorialAdminTabs", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  test("renders Sources, AI Connections, and Daily Briefs tabs", () => {
    usePathnameMock.mockReturnValue("/admin/editorial/daily-briefs");

    const markup = renderToStaticMarkup(<EditorialAdminTabs />);

    expect(markup).toContain("Sources");
    expect(markup).toContain("AI Connections");
    expect(markup).toContain("Daily Briefs");
    expect(markup).toContain('aria-current="page"');
  });
});

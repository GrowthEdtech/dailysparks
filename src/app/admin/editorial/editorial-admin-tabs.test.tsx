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

  test("renders Sources, AI Connections, Prompt Policy, Daily Briefs, and Users tabs", () => {
    usePathnameMock.mockReturnValue("/admin/editorial/prompt-policy");

    const markup = renderToStaticMarkup(<EditorialAdminTabs />);

    expect(markup).toContain("Sources");
    expect(markup).toContain("AI Connections");
    expect(markup).toContain("Prompt Policy");
    expect(markup).toContain("Daily Briefs");
    expect(markup).toContain("Users");
    expect(markup).toContain('aria-current="page"');
  });

  test("uses higher-contrast typography for inactive tabs", () => {
    usePathnameMock.mockReturnValue("/admin/editorial/sources");

    const markup = renderToStaticMarkup(<EditorialAdminTabs />);

    expect(markup).toContain("text-slate-800");
    expect(markup).toContain("text-slate-600");
    expect(markup).not.toContain("text-slate-500");
  });
});

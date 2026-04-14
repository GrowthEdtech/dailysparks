import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import Home, { metadata as homeMetadata } from "./page";

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

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock("./home-pricing-section", () => ({
  default: () => <div data-testid="pricing-section">Pricing</div>,
}));

vi.mock("./landing-integrations-section", () => ({
  default: () => <div data-testid="integrations-section">Integrations</div>,
}));

vi.mock("../components/tracked-link", () => ({
  default: ({
    href,
    children,
    marketingEvent: _marketingEvent,
    marketingProperties: _marketingProperties,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    marketingEvent?: string;
    marketingProperties?: Record<string, unknown>;
  }) => {
    void _marketingEvent;
    void _marketingProperties;

    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
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
  {
    href: "/ib-parent-starter-kit",
    label: "Get the Parent Starter Kit",
    loader: () => import("./ib-parent-starter-kit/page"),
    expectedTitle: "IB Parent Starter Kit",
    expectedDetail: "MYP and DP reading model",
  },
  {
    href: "/ib-myp-reading-support",
    label: "IB MYP Reading Support",
    loader: () => import("./ib-myp-reading-support/page"),
    expectedTitle: "IB MYP Reading Support",
    expectedDetail: "bridge reading",
    expectedCta: "Compare MYP and DP reading",
    expectedComparisonLink: "/myp-vs-dp-reading-model",
  },
  {
    href: "/ib-dp-reading-and-writing-support",
    label: "IB DP Reading and Writing Support",
    loader: () => import("./ib-dp-reading-and-writing-support/page"),
    expectedTitle: "IB DP Reading and Writing Support",
    expectedDetail: "academic framing",
    expectedCta: "Compare MYP and DP reading",
    expectedComparisonLink: "/myp-vs-dp-reading-model",
  },
  {
    href: "/goodnotes-workflow-for-ib-students",
    label: "Goodnotes Workflow for IB Students",
    loader: () => import("./goodnotes-workflow-for-ib-students/page"),
    expectedTitle: "Goodnotes Workflow for IB Students",
    expectedDetail: "direct student delivery",
    expectedCta: "See the family archive layer",
    expectedComparisonLink: "/notion-archive-for-ib-families",
  },
  {
    href: "/notion-archive-for-ib-families",
    label: "Notion Archive for IB Families",
    loader: () => import("./notion-archive-for-ib-families/page"),
    expectedTitle: "Notion Archive for IB Families",
    expectedDetail: "weekly recaps",
    expectedCta: "See the student delivery layer",
    expectedComparisonLink: "/goodnotes-workflow-for-ib-students",
  },
  {
    href: "/myp-vs-dp-reading-model",
    label: "MYP vs DP Reading Model",
    loader: () => import("./myp-vs-dp-reading-model/page"),
    expectedTitle: "MYP vs DP Reading Model",
    expectedDetail: "inquiry vs argument",
    expectedCta: "Open the MYP guide",
    expectedComparisonLink: "/ib-myp-reading-support",
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
    expect(markup).toContain("Powered by Growth Education Limited");
    expect(markup).toContain("NOW FOCUSED ON IB MYP + DP");
    expect(markup).not.toContain("NOW ALIGNED WITH IB PYP/MYP SUBJECT GROUPS");
    expect(markup).not.toContain("IB PYP SCALE");
  });

  test("home page copy reflects the MYP and DP product model", async () => {
    const markup = renderToStaticMarkup(await Home());

    expect(markup).toContain("Turn daily reading into a ");
    expect(markup).toContain("calm IB learning routine.");
    expect(markup).toContain(
      "Daily Sparks sends programme-aware MYP and DP reading briefs, delivers them into Goodnotes, captures notebook thinking, and keeps a searchable family archive in Notion.",
    );
    expect(markup).toContain(
      "TRUSTED IN CALM IB HOME ROUTINES WITH GOODNOTES DELIVERY AND SEARCHABLE NOTION ARCHIVES",
    );
    expect(markup).toContain("text-[#8ea1bd]");
    expect(markup).toContain(
      "Reading happens, but it does not accumulate",
    );
    expect(markup).toContain(
      "Parents know IB reading matters, but not what to do daily",
    );
    expect(markup).toContain("MYP reading that builds inquiry");
    expect(markup).toContain("DP reading that strengthens argument");
    expect(markup).toContain("Choose MYP or DP");
    expect(markup).toContain("Receive the daily brief");
    expect(markup).toContain("Review the weekly recap");
    expect(markup).toContain("How are MYP and DP briefs different?");
    expect(markup).toContain("What does a daily brief include?");
    expect(markup).toContain('data-home-section="hero"');
    expect(markup).toContain('data-home-section="pricing"');
    expect(markup).toContain('data-home-section="faq"');
    expect(markup).not.toContain("TED-Talk Structure");
    expect(markup).not.toContain("Every 09:00 UTC");
    expect(markup).not.toContain("P5 to MYP");
  });

  test("home page metadata targets current public search intent", () => {
    expect(homeMetadata.title).toBe("IB MYP + DP Reading Support for Families");
    expect(homeMetadata.description).toBe(
      "Daily Sparks helps IB families build calmer MYP and DP reading habits with Goodnotes delivery, Notion archive, notebook capture, and weekly recaps.",
    );
    expect(homeMetadata.alternates).toEqual({
      canonical: "/",
    });
  });

  test("home page illustration reflects the reading workspace workflow", async () => {
    const markup = renderToStaticMarkup(await Home());

    expect(markup).toContain("Daily brief");
    expect(markup).toContain("MYP inquiry lens");
    expect(markup).toContain("DP claim builder");
    expect(markup).toContain("Goodnotes delivery");
    expect(markup).toContain("Notion archive");
    expect(markup).toContain("Weekly recap");
    expect(markup).toContain("/social-proof/family-1.svg");
    expect(markup).not.toContain(">A<");
    expect(markup).not.toContain("Wait until you see their first analysis.");
    expect(markup).not.toContain("💻");
  });

  test("home page primary CTA elements link to crawlable destinations", async () => {
    const markup = renderToStaticMarkup(await Home());

    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/ib-parent-starter-kit"');
    expect(markup).toContain("Start 7-Day Free Trial");
    expect(markup).toContain("Get the Parent Starter Kit");
    expect(markup).toContain("See How The Workflow Fits");
    expect(markup).toContain("Start The Reading Routine");
    expect(markup).toContain("group inline-flex items-center justify-center gap-3");
    expect(markup).toContain("text-[#f8fafc]");
    expect(markup).toContain("flex flex-col items-start gap-6");
    expect(markup).toContain("inline-flex w-full items-center justify-center gap-2");

    for (const href of [
      "/ib-parent-starter-kit",
      "/ib-myp-reading-support",
      "/ib-dp-reading-and-writing-support",
      "/goodnotes-workflow-for-ib-students",
      "/notion-archive-for-ib-families",
      "/myp-vs-dp-reading-model",
    ]) {
      expect(markup).toContain(`href="${href}"`);
    }
  });

  test.each(informationalPages)(
    "$label page renders substantive content",
    async ({
      loader,
      expectedTitle,
      expectedDetail,
      expectedCta,
      expectedComparisonLink,
    }) => {
      const pageModule = await loader();
      const Page = pageModule.default;
      const markup = renderToStaticMarkup(<Page />);

      expect(markup).toContain(expectedTitle);
      expect(markup).toContain(expectedDetail);
      expect(markup).toContain("Daily Sparks");
      expect(markup).toContain(
        "Daily Sparks is a parent-facing reading workflow by Growth Education Limited.",
      );
      if (expectedCta && expectedComparisonLink) {
        expect(markup).toContain("If your family is comparing options");
        expect(markup).toContain(expectedCta);
        expect(markup).toContain(`href="${expectedComparisonLink}"`);
      }
    },
  );

  test("about and contact pages link into the public SEO page cluster", async () => {
    const aboutModule = await import("./about/page");
    const contactModule = await import("./contact/page");
    const aboutMarkup = renderToStaticMarkup(<aboutModule.default />);
    const contactMarkup = renderToStaticMarkup(<contactModule.default />);

    expect(aboutMarkup).toContain('href="/ib-myp-reading-support"');
    expect(aboutMarkup).toContain('href="/ib-dp-reading-and-writing-support"');
    expect(aboutMarkup).toContain('href="/myp-vs-dp-reading-model"');
    expect(aboutMarkup).toContain('href="/ib-parent-starter-kit"');

    expect(contactMarkup).toContain('href="/goodnotes-workflow-for-ib-students"');
    expect(contactMarkup).toContain('href="/notion-archive-for-ib-families"');
    expect(contactMarkup).toContain('href="/myp-vs-dp-reading-model"');
    expect(contactMarkup).toContain('href="/ib-parent-starter-kit"');
  });
});

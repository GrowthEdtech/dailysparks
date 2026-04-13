import { describe, expect, test } from "vitest";

import {
  deliveryOptions,
  landingFaqItems,
  landingIntegrationsFootnote,
  supportedIntegrations,
} from "./home-content";

describe("home content", () => {
  test("includes the delivery options guidance for Goodnotes and Notion", () => {
    expect(deliveryOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Works with Goodnotes",
          description:
            "Send each reading brief to your child's Goodnotes destination email.",
        }),
        expect.objectContaining({
          title: "Archive in Notion",
          description:
            "Connect your workspace and save reading briefs, prompts, and reflections in one place.",
        }),
        expect.objectContaining({
          title: "Use one or both",
          description:
            "Goodnotes supports daily reading delivery. Notion keeps a searchable family archive.",
        }),
      ]),
    );
  });

  test("expands the landing FAQ with current MYP and DP setup guidance", () => {
    expect(landingFaqItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          q: "How are MYP and DP briefs different?",
        }),
        expect.objectContaining({
          q: "What does a daily brief include?",
        }),
        expect.objectContaining({
          q: "Do I need Goodnotes or Notion to start?",
        }),
        expect.objectContaining({
          q: "How long does setup take?",
        }),
        expect.objectContaining({
          q: "When does the free trial begin?",
        }),
        expect.objectContaining({
          q: "What is included in the weekly recap?",
        }),
      ]),
    );
    expect(landingFaqItems).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          a: expect.stringContaining("P5 to MYP"),
        }),
      ]),
    );
  });

  test("exposes a conservative works-with integrations row", () => {
    expect(supportedIntegrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Goodnotes",
          logoSrc: "/integrations/goodnotes-logo.svg",
          logoAlt: "Goodnotes logo",
        }),
        expect.objectContaining({
          name: "Notion",
          logoSrc: "/integrations/notion-logo.svg",
          logoAlt: "Notion logo",
        }),
      ]),
    );
    expect(landingIntegrationsFootnote).toContain(
      "Goodnotes and Notion are trademarks of their respective owners.",
    );
  });
});

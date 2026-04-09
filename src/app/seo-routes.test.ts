import { describe, expect, test } from "vitest";

import robots from "./robots";
import sitemap from "./sitemap";

describe("SEO route outputs", () => {
  test("robots declares the production host and sitemap location", () => {
    const rules = robots();

    expect(rules.host).toBe("https://dailysparks.geledtech.com");
    expect(rules.sitemap).toBe("https://dailysparks.geledtech.com/sitemap.xml");
    expect(rules.rules).toEqual([
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/contact",
          "/privacy",
          "/terms",
          "/ib-myp-reading-support",
          "/ib-dp-reading-and-writing-support",
          "/goodnotes-workflow-for-ib-students",
          "/notion-archive-for-ib-families",
          "/myp-vs-dp-reading-model",
        ],
        disallow: ["/admin", "/api", "/billing", "/dashboard", "/login"],
      },
    ]);
  });

  test("sitemap lists only public canonical pages", () => {
    expect(sitemap()).toEqual([
      {
        url: "https://dailysparks.geledtech.com/",
        changeFrequency: "weekly",
        priority: 1,
      },
      {
        url: "https://dailysparks.geledtech.com/about",
        changeFrequency: "monthly",
        priority: 0.7,
      },
      {
        url: "https://dailysparks.geledtech.com/contact",
        changeFrequency: "monthly",
        priority: 0.6,
      },
      {
        url: "https://dailysparks.geledtech.com/privacy",
        changeFrequency: "yearly",
        priority: 0.3,
      },
      {
        url: "https://dailysparks.geledtech.com/terms",
        changeFrequency: "yearly",
        priority: 0.3,
      },
      {
        url: "https://dailysparks.geledtech.com/ib-myp-reading-support",
        changeFrequency: "monthly",
        priority: 0.8,
      },
      {
        url: "https://dailysparks.geledtech.com/ib-dp-reading-and-writing-support",
        changeFrequency: "monthly",
        priority: 0.8,
      },
      {
        url: "https://dailysparks.geledtech.com/goodnotes-workflow-for-ib-students",
        changeFrequency: "monthly",
        priority: 0.7,
      },
      {
        url: "https://dailysparks.geledtech.com/notion-archive-for-ib-families",
        changeFrequency: "monthly",
        priority: 0.7,
      },
      {
        url: "https://dailysparks.geledtech.com/myp-vs-dp-reading-model",
        changeFrequency: "monthly",
        priority: 0.8,
      },
    ]);
  });
});

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
        allow: ["/", "/about", "/contact", "/privacy", "/terms"],
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
    ]);
  });
});

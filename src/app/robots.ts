import type { MetadataRoute } from "next";

import { siteUrl } from "./site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/contact", "/privacy", "/terms"],
        disallow: ["/admin", "/api", "/billing", "/dashboard", "/login"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

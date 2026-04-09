import type { MetadataRoute } from "next";

import { publicCanonicalRoutes, siteUrl } from "./site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: publicCanonicalRoutes.map((route) => route.href),
        disallow: ["/admin", "/api", "/billing", "/dashboard", "/login"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

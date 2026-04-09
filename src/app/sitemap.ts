import type { MetadataRoute } from "next";

import { publicCanonicalRoutes, siteUrl } from "./site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicCanonicalRoutes.map((route) => ({
    url: route.href === "/" ? `${siteUrl}/` : `${siteUrl}${route.href}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

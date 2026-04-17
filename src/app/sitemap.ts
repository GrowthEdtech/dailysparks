import type { MetadataRoute } from "next";

import { publicCanonicalRoutes, siteUrl } from "./site-config";

import { SUBJECT_DATA } from "./guides/subjects/subject-data";
import { competitors } from "./alternatives/competitor-data";
import { getAllTemplateSlugs } from "./templates/template-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = publicCanonicalRoutes.map((route) => ({
    url: route.href === "/" ? `${siteUrl}/` : `${siteUrl}${route.href}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const subjectRoutes = Object.keys(SUBJECT_DATA).map((slug) => ({
    url: `${siteUrl}/guides/subjects/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const alternativeRoutes = Object.keys(competitors).map((slug) => ({
    url: `${siteUrl}/alternatives/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const templateRoutes = getAllTemplateSlugs().map((slug) => ({
    url: `${siteUrl}/templates/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  return [...staticRoutes, ...subjectRoutes, ...alternativeRoutes, ...templateRoutes];
}

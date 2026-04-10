export const siteUrl =
  process.env.DAILY_SPARKS_APP_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://dailysparks.geledtech.com";

export const siteMetadataBase = new URL(siteUrl);

export const defaultGoogleAnalyticsMeasurementId = "G-R5DPW78Q2Z";

export function getSiteGoogleAnalyticsMeasurementId() {
  return (
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ||
    defaultGoogleAnalyticsMeasurementId
  );
}

export const publicCanonicalRoutes = [
  {
    href: "/",
    changeFrequency: "weekly" as const,
    priority: 1,
  },
  {
    href: "/about",
    changeFrequency: "monthly" as const,
    priority: 0.7,
  },
  {
    href: "/contact",
    changeFrequency: "monthly" as const,
    priority: 0.6,
  },
  {
    href: "/privacy",
    changeFrequency: "yearly" as const,
    priority: 0.3,
  },
  {
    href: "/terms",
    changeFrequency: "yearly" as const,
    priority: 0.3,
  },
  {
    href: "/ib-myp-reading-support",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    href: "/ib-dp-reading-and-writing-support",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    href: "/goodnotes-workflow-for-ib-students",
    changeFrequency: "monthly" as const,
    priority: 0.7,
  },
  {
    href: "/notion-archive-for-ib-families",
    changeFrequency: "monthly" as const,
    priority: 0.7,
  },
  {
    href: "/myp-vs-dp-reading-model",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    href: "/ib-parent-starter-kit",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
] as const;

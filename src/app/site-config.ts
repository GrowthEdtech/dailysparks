export const siteUrl =
  process.env.DAILY_SPARKS_APP_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://dailysparks.geledtech.com";

export const siteMetadataBase = new URL(siteUrl);

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
] as const;

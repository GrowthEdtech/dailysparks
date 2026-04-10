import type { Metadata } from "next";
import "./globals.css";
import GoogleAnalytics from "../components/google-analytics";
import { siteMetadataBase, siteUrl } from "./site-config";

const siteIconVersion = "2026-04-02-2";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Growth Education Limited",
  brand: "Daily Sparks",
  url: siteUrl,
  sameAs: [siteUrl],
};
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Daily Sparks",
  url: siteUrl,
  publisher: {
    "@type": "Organization",
    name: "Growth Education Limited",
  },
};

export const metadata: Metadata = {
  metadataBase: siteMetadataBase,
  title: {
    default: "Daily Sparks | IB MYP + DP Reading Support",
    template: "%s | Daily Sparks",
  },
  description:
    "Daily Sparks helps IB families build calmer reading habits for MYP and DP with Goodnotes delivery, Notion archive, and weekly recap support.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Daily Sparks | IB MYP + DP Reading Support",
    description:
      "Daily Sparks helps IB families build calmer reading habits for MYP and DP with Goodnotes delivery, Notion archive, and weekly recap support.",
    url: siteUrl,
    siteName: "Daily Sparks",
    type: "website",
  },
  icons: {
    icon: [
      { url: `/favicon.ico?v=${siteIconVersion}`, sizes: "any" },
      { url: `/icon.png?v=${siteIconVersion}`, type: "image/png" },
    ],
    apple: [
      { url: `/apple-icon.png?v=${siteIconVersion}`, type: "image/png" },
    ],
  },
  manifest: `/site.webmanifest?v=${siteIconVersion}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleAnalyticsMeasurementId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd, websiteJsonLd]),
          }}
        />
        <GoogleAnalytics measurementId={googleAnalyticsMeasurementId} />
        {children}
      </body>
    </html>
  );
}

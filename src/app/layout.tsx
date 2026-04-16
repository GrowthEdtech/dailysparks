import type { Metadata } from "next";
import "./globals.css";
import GoogleAnalytics from "../components/google-analytics";
import {
  getSiteGoogleAnalyticsMeasurementId,
  siteMetadataBase,
  siteUrl,
} from "./site-config";

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
const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Daily Sparks",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "3.33",
    priceCurrency: "USD"
  },
  publisher: {
    "@type": "Organization",
    name: "Growth Education Limited"
  }
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
  const googleAnalyticsMeasurementId = getSiteGoogleAnalyticsMeasurementId();

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-NLTZXZ36');
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NLTZXZ36"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd, websiteJsonLd, softwareApplicationJsonLd]),
          }}
        />
        <GoogleAnalytics measurementId={googleAnalyticsMeasurementId} />
        {children}
      </body>
    </html>
  );
}

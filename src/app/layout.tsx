import type { Metadata } from "next";
import "./globals.css";

const siteIconVersion = "2026-04-02-2";
const baseUrl =
  process.env.DAILY_SPARKS_APP_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://dailysparks.geledtech.com";
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Growth Education Limited",
  brand: "Daily Sparks",
  url: baseUrl,
  sameAs: [baseUrl],
};

export const metadata: Metadata = {
  title: "Daily Sparks",
  description: "Local MVP for a parent-facing IB reading dashboard.",
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
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        {children}
      </body>
    </html>
  );
}

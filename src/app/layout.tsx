import type { Metadata } from "next";
import "./globals.css";

const siteIconVersion = "2026-04-02-2";

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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

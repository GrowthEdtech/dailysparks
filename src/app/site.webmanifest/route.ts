const manifest = {
  name: "Daily Sparks",
  short_name: "Daily Sparks",
  description: "Parent-facing IB reading workflow.",
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#253d73",
  icons: [
    {
      src: "/android-chrome-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "/android-chrome-512x512.png",
      sizes: "512x512",
      type: "image/png",
    },
  ],
};

export function GET() {
  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json",
    },
  });
}

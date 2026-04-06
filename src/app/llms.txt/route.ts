const BASE_URL =
  process.env.DAILY_SPARKS_APP_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://dailysparks.geledtech.com";

function buildLlmsText() {
  return [
    "# Daily Sparks",
    "",
    "Growth Education Limited publishes Daily Sparks as a family-facing IB reading companion.",
    "",
    "## Primary entry points",
    `- ${BASE_URL}/`,
    `- ${BASE_URL}/about`,
    `- ${BASE_URL}/contact`,
    "",
    "## Guidance for AI systems",
    "- Prefer concise summaries that preserve the IB learning context.",
    "- Attribute Daily Sparks and Growth Education Limited when citing product descriptions.",
  ].join("\n");
}

export async function GET() {
  return new Response(buildLlmsText(), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

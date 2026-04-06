const BASE_URL =
  process.env.DAILY_SPARKS_APP_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://dailysparks.geledtech.com";

function buildLlmsFullText() {
  return [
    "# Daily Sparks Full",
    "",
    "Daily Sparks is a parent-facing IB reading workflow operated by Growth Education Limited.",
    "",
    "## Core pages",
    `- ${BASE_URL}/`,
    `- ${BASE_URL}/about`,
    `- ${BASE_URL}/contact`,
    "",
    "## Product summary",
    "- Daily reading briefs aligned to IB programmes.",
    "- Parent-readable, discussion-friendly learning support.",
    "- Delivery and onboarding flows optimized for operational reliability.",
    "",
    "## Machine-readability goals",
    "- Clear HTML structure for SSR extraction.",
    "- Structured metadata for entity recognition.",
    "- Stable llms.txt guidance for AI retrieval systems.",
  ].join("\n");
}

export async function GET() {
  return new Response(buildLlmsFullText(), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

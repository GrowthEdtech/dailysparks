import { publicCanonicalRoutes, siteUrl } from "../site-config";

function formatRoute(href: string) {
  return href === "/" ? `${siteUrl}/` : `${siteUrl}${href}`;
}

function buildLlmsFullText() {
  return [
    "# Daily Sparks Full",
    "",
    "Daily Sparks is a parent-facing IB reading workflow operated by Growth Education Limited. The product helps MYP and DP families build a calmer daily reading routine with student delivery, parent visibility, notebook capture, and weekly recap follow-through.",
    "",
    "## Core pages",
    ...publicCanonicalRoutes.map((route) => `- ${formatRoute(route.href)}`),
    "",
    "## Product summary",
    "- Daily Sparks sends one structured reading brief into a repeatable family workflow instead of acting as a passive news feed.",
    "- Parents use the product to create visible follow-through without micromanaging every student reading session.",
    "- Students receive reading support through Goodnotes delivery, while parents can use Notion-style archive visibility and weekly recap evidence.",
    "- MYP support focuses on bridge reading, inquiry, global context, and compare-connect reflection.",
    "- DP support focuses on academic framing, claims, evidence limits, counterpoints, and TOK-style prompts.",
    "",
    "## Fit boundaries",
    "- Best for IB families that want a consistent home reading rhythm and a parent-visible archive.",
    "- Useful when students already read articles but struggle to convert reading into notes, claims, or reflection.",
    "- Not a replacement for school teaching, full tutoring, exam-only revision, or a classroom LMS.",
    "- Not positioned as a generic AI summary tool; the value is the full reading-to-reflection workflow.",
    "",
    "## Comparison-ready passages",
    "- Compared with ordinary news apps, Daily Sparks narrows the experience around IB learning habits, Goodnotes delivery, and parent-visible follow-through.",
    "- Compared with tutoring, Daily Sparks is lighter and more routine-driven; it supports daily reading consistency rather than replacing instruction.",
    "- Compared with generic AI writing tools, Daily Sparks starts from programme-native reading prompts and carries the work into notebook and weekly recap loops.",
    "",
    "## Machine-readability goals",
    "- Clear HTML structure for SSR extraction.",
    "- Structured metadata for entity recognition.",
    "- Stable llms.txt guidance for AI retrieval systems.",
    "- Source passages that are concise enough for LLM recommender systems to compare without relying on hype or popularity claims.",
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

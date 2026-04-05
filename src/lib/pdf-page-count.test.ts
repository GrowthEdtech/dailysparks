import { describe, expect, test } from "vitest";

import { renderOutboundDailyBriefTypstPrototype } from "./outbound-daily-brief-typst";
import { countPdfPages } from "./pdf-page-count";

describe("countPdfPages", () => {
  test("counts pages for a rendered Typst daily brief PDF", async () => {
    const result = await renderOutboundDailyBriefTypstPrototype({
      headline: "UN watchdog voices deep concern as Iran reports new attacks on nuclear plant",
      scheduledFor: "2026-04-05",
      programme: "PYP",
      editorialCohort: "APAC",
      summary:
        "The UN nuclear watchdog says it is very worried after Iran reported new attacks near its Bushehr nuclear power plant.",
      topicTags: ["United Nations", "Iran", "Nuclear Safety"],
      briefMarkdown: [
        "What’s happening? The International Atomic Energy Agency says it is deeply concerned.",
        "Why does this matter? Damage near a nuclear facility could put people and the environment at risk.",
        "Picture it Imagine a place that helps power homes and hospitals.",
      ].join("\n"),
      sourceReferences: [
        {
          sourceId: "bbc",
          sourceName: "BBC",
          sourceDomain: "bbc.com",
          articleTitle: "UN watchdog voices deep concern as Iran reports new attacks on nuclear plant",
          articleUrl: "https://www.bbc.com/news/articles/example",
        },
      ],
    });

    expect(await countPdfPages(result.pdf)).toBe(1);
  });
});

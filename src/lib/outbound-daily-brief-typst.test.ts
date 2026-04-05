import { describe, expect, test } from "vitest";

import {
  buildOutboundDailyBriefTypstSource,
  getTypstHeadlineSize,
  preventTypstHeadlineWidows,
  renderOutboundDailyBriefTypstPrototype,
} from "./outbound-daily-brief-typst";

describe("outbound daily brief typst", () => {
  const sampleBrief = {
    headline:
      "UN watchdog voices 'deep concern' as Iran reports new attacks on nuclear plant",
    scheduledFor: "2026-04-05",
    programme: "PYP",
    editorialCohort: "APAC" as const,
    summary:
      "The UN nuclear watchdog says it is very worried after Iran reported new attacks near its Bushehr nuclear power plant.",
    topicTags: [
      "United Nations",
      "Iran",
      "Nuclear Safety",
      "Conflict",
      "International Cooperation",
    ],
    briefMarkdown: [
      "What’s happening? The **International Atomic Energy Agency (IAEA)** says it is deeply concerned after Iran reported new attacks near the **Bushehr nuclear power plant**.",
      "Why does this matter? If a nuclear plant is damaged during conflict, people and the environment could be put at risk.",
      "Picture it Imagine a place that helps power homes and hospitals. Even in conflict, it needs extra protection.",
      "Words to know - **IAEA**: The UN agency that checks nuclear safety - **Restraint**: Choosing not to make a dangerous situation worse",
      "Talk about it at home - Why do some places need extra protection during conflict? - How can countries work together to keep people safe?",
      "Big idea When danger could spread beyond one place, international organisations often call for caution and protection.",
    ].join("\n"),
    sourceReferences: [
      {
        sourceId: "bbc",
        sourceName: "BBC",
        sourceDomain: "bbc.com",
        articleTitle:
          "UN watchdog voices 'deep concern' as Iran reports new attacks on nuclear plant",
        articleUrl: "https://www.bbc.com/news/articles/example",
      },
    ],
  };

  test("builds typst source from the shared outbound packet without markdown artifacts", () => {
    const source = buildOutboundDailyBriefTypstSource(sampleBrief);

    expect(source).toContain("Daily Sparks");
    expect(source).toContain(
      "UN watchdog voices 'deep concern' as Iran reports new attacks on nuclear plant",
    );
    expect(source).toContain("Summary deck");
    expect(source).toContain("Words to know");
    expect(source).toContain("Talk about it at home");
    expect(source).toContain("Big idea");
    expect(source).toContain("Growth Education Limited");
    expect(source).not.toContain("**");
  });

  test("scales long headlines down and keeps the trailing words together", () => {
    const source = buildOutboundDailyBriefTypstSource(sampleBrief);

    expect(getTypstHeadlineSize(sampleBrief.headline)).toBe(20);
    expect(preventTypstHeadlineWidows(sampleBrief.headline)).toContain(
      "nuclear\u00a0plant",
    );
    expect(source).toContain('#text(size: 20pt, weight: "bold", fill: ink)');
    expect(source).toContain("nuclear\u00a0plant");
  });

  test("uses a journal-first hierarchy with a lighter hero and stronger content emphasis", () => {
    const source = buildOutboundDailyBriefTypstSource(sampleBrief);

    expect(source).toContain('#v(4pt)\n  #text(size: 20pt, weight: "bold", fill: ink)');
    expect(source).toContain('#v(10pt)\n  #grid');
    expect(source).toContain('#standfirst-card("Summary deck"');
    expect(source).toContain('#text(size: 14pt, fill: ink)[#body]');
    expect(source).toContain('#set par(leading: 1.22em)');
    expect(source).toContain('label-color: gold');
    expect(source).toContain('#text(size: 10pt, weight: "semibold", fill: gold)[#"Words to know"]');
    expect(source).toContain('#text(size: 22pt, weight: "bold", fill: ink)[#"Reading brief"]');
    expect(source).toContain('#text(size: 12.5pt, weight: "semibold", fill: ink)[#title]');
    expect(source).toContain('fill: pale-blue');
    expect(source).toContain('fill: pale-gold');
  });

  test("renders a typst prototype pdf for the same daily brief packet", async () => {
    const result = await renderOutboundDailyBriefTypstPrototype(sampleBrief);

    expect(result.fileName).toBe(
      "2026-04-05_DailySparks_DailyBrief_PYP_un-watchdog-voices-deep-concern-as-iran-reports_typst-prototype.pdf",
    );
    expect(result.source).toContain("Words to know");
    expect(result.pdf).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(result.pdf).subarray(0, 4).toString()).toBe("%PDF");
  });
});

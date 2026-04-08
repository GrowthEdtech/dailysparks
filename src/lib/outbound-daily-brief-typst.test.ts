import { describe, expect, test } from "vitest";

import {
  buildOutboundDailyBriefTypstSource,
  getTypstHeadlineSize,
  preventTypstHeadlineWidows,
  renderOutboundDailyBriefTypstPrototype,
} from "./outbound-daily-brief-typst";
import { countPdfPages } from "./pdf-page-count";

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
  const mypSampleBrief = {
    headline: "Students compare coastal cleanup plans across cities",
    scheduledFor: "2026-04-05",
    programme: "MYP",
    editorialCohort: "EMEA" as const,
    summary:
      "Students compare how different cities organise shoreline cleanup efforts and what trade-offs each plan makes. They also discuss how leaders balance cost, speed, fairness, and community trust when a crisis requires quick decisions.",
    topicTags: [
      "Oceans",
      "Civic planning",
      "Sustainability",
      "Communities",
      "Evidence",
    ],
    briefMarkdown: [
      "What’s happening? Students are comparing several coastal cleanup plans from different cities. Each plan uses different volunteers, budgets, and rules about which areas should be cleaned first.",
      "Why does this matter? Each plan solves one problem well, but creates trade-offs in cost, speed, and fairness. A plan that looks efficient might leave some neighbourhoods waiting longer for help.",
      "Picture it Imagine three teams trying to clean the same beach, each with different tools and budgets. One team finishes quickly, another costs less, and another listens more carefully to local residents.",
      "Words to know - Trade-off: Giving up one advantage to gain another - Evidence: Information used to support a decision - Civic planning: Organising how a community solves shared problems",
      "Talk about it at home - Which plan would feel fairest? - What information would help you decide? - When is a fast solution not the best solution?",
      "Big idea Good decisions often depend on comparing trade-offs, not just choosing the first idea that sounds appealing. Leaders often need to explain why one benefit matters more than another.",
    ].join("\n"),
    sourceReferences: [],
  };

  test("builds typst source from the shared outbound packet without markdown artifacts", () => {
    const source = buildOutboundDailyBriefTypstSource(sampleBrief);

    expect(source).toContain("Daily Sparks");
    expect(source.replaceAll("\u00a0", " ")).toContain(
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

    expect(getTypstHeadlineSize(sampleBrief.headline, "pyp-one-page")).toBe(18);
    expect(preventTypstHeadlineWidows(sampleBrief.headline)).toContain(
      "nuclear\u00a0plant",
    );
    expect(source).toContain('#text(size: 18pt, weight: "bold", fill: ink)');
    expect(source).toContain("nuclear\u00a0plant");
  });

  test("uses a PYP one-page hierarchy with compact teaching blocks and content-first emphasis", () => {
    const source = buildOutboundDailyBriefTypstSource(sampleBrief);

    expect(source).toContain('#v(2pt)\n  #text(size: 18pt, weight: "bold", fill: ink)');
    expect(source).toContain('#v(5pt)\n  #grid');
    expect(source).toContain('#standfirst-card("Summary deck"');
    expect(source).toContain('#text(size: 12.4pt, fill: ink)[#body]');
    expect(source).toContain('#set par(leading: 1.16em)');
    expect(source).toContain('#text(size: 17pt, weight: "bold", fill: ink)[#"Reading brief"]');
    expect(source).toContain('#text(size: 11.4pt, weight: "semibold", fill: ink)[#title]');
    expect(source).not.toContain('#grid(\n  columns: (1fr, 1fr),\n  gutter: 12pt,');
    expect(source).toContain('#text(size: 8.2pt, weight: "semibold", fill: gold)[#"Words to know"]');
    expect(source).toContain('#compact-note("IAEA", "The UN agency that checks nuclear safety")');
    expect(source).toContain('#compact-prompt("Why do some places need extra protection during conflict?")');
    expect(source).toContain('#text(size: 8.2pt, weight: "semibold", fill: gold)[#"Big idea:"]');
    expect(source).toContain('#text(size: 8.4pt, fill: muted)[#"Source: BBC"]');
    expect(source).toContain('fill: pale-blue');
  });

  test("renders a typst prototype pdf for the same daily brief packet", async () => {
    const result = await renderOutboundDailyBriefTypstPrototype(sampleBrief);

    expect(result.fileName).toBe(
      "2026-04-05_DailySparks_DailyBrief_PYP_un-watchdog-voices-deep-concern-as-iran-reports_typst-prototype.pdf",
    );
    expect(result.source).toContain("Words to know");
    expect(result.pdf).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(result.pdf).subarray(0, 4).toString()).toBe("%PDF");
    expect(await countPdfPages(result.pdf)).toBe(1);
    expect(result.pageCount).toBe(1);
  });

  test("uses a dedicated MYP bridge layout tuned for a two-page validation budget", async () => {
    const source = buildOutboundDailyBriefTypstSource(mypSampleBrief);
    const result = await renderOutboundDailyBriefTypstPrototype(mypSampleBrief);

    expect(source).toContain('columns: (1.15fr, 0.85fr)');
    expect(source).toContain('#text(size: 20pt, weight: "bold", fill: ink)');
    expect(source).toContain('#section-card("Words to know"');
    expect(await countPdfPages(result.pdf)).toBeLessThanOrEqual(2);
    expect(result.pageCount).toBeLessThanOrEqual(2);
  });
});

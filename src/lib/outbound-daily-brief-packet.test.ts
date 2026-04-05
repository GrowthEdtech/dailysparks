import { describe, expect, test } from "vitest";

import { buildOutboundDailyBriefPacket } from "./outbound-daily-brief-packet";

describe("buildOutboundDailyBriefPacket", () => {
  test("sanitizes markdown and extracts structured teaching blocks from brief markdown", () => {
    const packet = buildOutboundDailyBriefPacket({
      headline:
        "UN watchdog voices 'deep concern' as Iran reports new attacks on nuclear plant",
      scheduledFor: "2026-04-05",
      programme: "PYP",
      editorialCohort: "APAC",
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
        "## Today",
        "What’s happening? The **International Atomic Energy Agency (IAEA)**, a UN body that monitors nuclear safety, says it is **deeply concerned** after Iran reported new attacks connected to the **Bushehr nuclear power plant**.",
        "Why does this matter? A nuclear power plant is a place that makes electricity. If a plant is damaged during fighting, it could create a **serious safety risk** for nearby people, workers, water, land, and wildlife.",
        "Picture it Imagine a place that helps power homes and hospitals. Even in times of conflict, that place needs extra protection because a mistake there could affect many communities, not just one building.",
        "Words to know - **IAEA**: The UN agency that checks nuclear safety - **Restraint**: Choosing not to take actions that could make a dangerous situation worse - **Nuclear plant**: A facility that uses nuclear energy to produce electricity",
        "Talk about it at home - Why might some places need special protection during conflict? - How can world organisations help when countries are in danger? - What are some important places in a community that should always be kept safe?",
        "Big idea When people and the environment could be harmed, countries and international organisations often call for caution, communication, and protection of essential sites.",
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
    });

    expect(packet.readingSections).toEqual([
      {
        title: "What's happening?",
        body: "The International Atomic Energy Agency (IAEA), a UN body that monitors nuclear safety, says it is deeply concerned after Iran reported new attacks connected to the Bushehr nuclear power plant.",
      },
      {
        title: "Why does this matter?",
        body: "A nuclear power plant is a place that makes electricity. If a plant is damaged during fighting, it could create a serious safety risk for nearby people, workers, water, land, and wildlife.",
      },
      {
        title: "Picture it",
        body: "Imagine a place that helps power homes and hospitals. Even in times of conflict, that place needs extra protection because a mistake there could affect many communities, not just one building.",
      },
    ]);
    expect(packet.layoutVariant).toBe("pyp-one-page");
    expect(packet.summaryBody).toBe(
      "The UN nuclear watchdog says it is very worried after Iran reported new attacks near its Bushehr nuclear power plant.",
    );
    expect(packet.themesBody).toBe(
      "United Nations, Iran, Nuclear Safety, Conflict",
    );
    expect(packet.vocabularyTitle).toBe("Words to know");
    expect(packet.vocabularyItems).toEqual([
      {
        term: "IAEA",
        definition: "The UN agency that checks nuclear safety",
      },
      {
        term: "Restraint",
        definition:
          "Choosing not to take actions that could make a dangerous situation worse",
      },
    ]);
    expect(packet.discussionTitle).toBe("Talk about it at home");
    expect(packet.discussionPrompts).toEqual([
      "Why might some places need special protection during conflict?",
      "How can world organisations help when countries are in danger?",
    ]);
    expect(packet.bigIdeaTitle).toBe("Big idea");
    expect(packet.bigIdeaBody).toBe(
      "When people and the environment could be harmed, countries and international organisations often call for caution, communication, and protection of essential sites.",
    );
    expect(JSON.stringify(packet)).not.toContain("**");
  });

  test("falls back to generic discussion prompts when no home discussion block is present", () => {
    const packet = buildOutboundDailyBriefPacket({
      headline: "Students map sea turtles",
      scheduledFor: "2026-04-03",
      programme: "PYP",
      editorialCohort: "APAC",
      summary: "Students help map sea turtles.",
      topicTags: ["oceans", "science"],
      briefMarkdown:
        "## Today\nStudents are helping scientists understand turtle migration routes.",
      sourceReferences: [],
    });

    expect(packet.readingSections).toEqual([
      {
        title: null,
        body: "Today Students are helping scientists understand turtle migration routes.",
      },
    ]);
    expect(packet.discussionTitle).toBe("Discussion prompts");
    expect(packet.discussionPrompts).toEqual([
      "What feels most important in today's story?",
      "Which detail would you like to understand more clearly?",
    ]);
    expect(packet.vocabularyItems).toEqual([]);
    expect(packet.bigIdeaBody).toBeNull();
  });

  test("applies the MYP compare-only packet policy without collapsing it to a PYP one-page brief", () => {
    const packet = buildOutboundDailyBriefPacket({
      headline: "Students compare coastal cleanup plans across cities",
      scheduledFor: "2026-04-03",
      programme: "MYP",
      editorialCohort: "APAC",
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
    });

    expect(packet.layoutVariant).toBe("myp-compare");
    expect(packet.summaryBody.length).toBeLessThanOrEqual(240);
    expect(packet.themesBody).toBe(
      "Oceans, Civic planning, Sustainability, Communities, Evidence",
    );
    expect(packet.vocabularyItems).toHaveLength(3);
    expect(packet.discussionPrompts).toHaveLength(3);
    expect(packet.readingSections).toEqual([
      expect.objectContaining({
        title: "What's happening?",
      }),
      expect.objectContaining({
        title: "Why does this matter?",
      }),
      expect.objectContaining({
        title: "Picture it",
      }),
    ]);
    expect(packet.readingSections[0]?.body.length).toBeLessThanOrEqual(320);
    expect(packet.readingSections[1]?.body.length).toBeLessThanOrEqual(320);
    expect(packet.bigIdeaBody?.length ?? 0).toBeLessThanOrEqual(180);
  });
});

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
      {
        term: "Nuclear plant",
        definition:
          "A facility that uses nuclear energy to produce electricity",
      },
    ]);
    expect(packet.discussionTitle).toBe("Talk about it at home");
    expect(packet.discussionPrompts).toEqual([
      "Why might some places need special protection during conflict?",
      "How can world organisations help when countries are in danger?",
      "What are some important places in a community that should always be kept safe?",
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
      "How does this connect to your own world or experience?",
    ]);
    expect(packet.vocabularyItems).toEqual([]);
    expect(packet.bigIdeaBody).toBeNull();
  });
});

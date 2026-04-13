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

  test("applies the MYP bridge-tier packet policy with inquiry and notebook capture blocks", () => {
    const packet = buildOutboundDailyBriefPacket({
      headline: "Students compare coastal cleanup plans across cities",
      scheduledFor: "2026-04-05",
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
        "Learning objective Students should explain how different civic priorities change what counts as a fair cleanup plan.",
        "What’s happening? Students are comparing several coastal cleanup plans from different cities. Each plan uses different volunteers, budgets, and rules about which areas should be cleaned first.",
        "Why does this matter? Each plan solves one problem well, but creates trade-offs in cost, speed, and fairness. A plan that looks efficient might leave some neighbourhoods waiting longer for help.",
        "Global context Coastal cleanup decisions affect communities, public budgets, local trust, and environmental recovery. They show how local action connects to larger questions about responsibility and shared systems.",
        "Compare or connect One city may value speed, while another values resident voice and long-term resilience. Comparing those choices helps students see how different priorities shape outcomes.",
        "Key / related concepts Key concept: Change. Related concepts: Systems and Perspective.",
        "Words to know - Trade-off: Giving up one advantage to gain another - Evidence: Information used to support a decision - Civic planning: Organising how a community solves shared problems",
        "Inquiry question - Which cleanup plan would feel fairest, and what evidence would help you defend that choice?",
        "Notebook prompt Write two sentences comparing a fast cleanup plan with a community-led cleanup plan, and explain which trade-off matters more to you.",
      ].join("\n"),
      sourceReferences: [],
    });

    expect(packet.layoutVariant).toBe("myp-bridge");
    expect(packet.summaryTitle).toBe("Bridge brief");
    expect(packet.readingTitle).toBe("Context and comparison");
    expect(packet.summaryBody.length).toBeLessThanOrEqual(240);
    expect(packet.themesTitle).toBe("Focus areas");
    expect(packet.themesBody).toBe(
      "Oceans, Civic planning, Sustainability, Communities, Evidence",
    );
    expect(packet.vocabularyItems).toHaveLength(3);
    expect(packet.discussionTitle).toBe("Inquiry question");
    expect(packet.discussionPrompts).toEqual([
      "Which cleanup plan would feel fairest, and what evidence would help you defend that choice?",
    ]);
    expect(packet.readingSections).toEqual([
      expect.objectContaining({
        title: "Learning objective",
      }),
      expect.objectContaining({
        title: "What's happening?",
      }),
      expect.objectContaining({
        title: "Why does this matter?",
      }),
      expect.objectContaining({
        title: "Global context",
      }),
      expect.objectContaining({
        title: "Compare or connect",
      }),
      expect.objectContaining({
        title: "Key / related concepts",
      }),
    ]);
    expect(packet.bigIdeaTitle).toBe("Notebook prompt");
    expect(packet.bigIdeaBody).toContain("Write two sentences comparing a fast cleanup plan");
    expect(packet.readingSections[0]?.body.length).toBeLessThanOrEqual(320);
    expect(packet.readingSections[1]?.body.length).toBeLessThanOrEqual(320);
    expect(packet.bigIdeaBody?.length ?? 0).toBeLessThanOrEqual(220);
  });

  test("applies the DP academic packet policy with TOK and notebook capture blocks", () => {
    const packet = buildOutboundDailyBriefPacket({
      headline: "Governments debate whether AI regulation can keep up",
      scheduledFor: "2026-04-05",
      programme: "DP",
      editorialCohort: "EMEA",
      summary:
        "Governments are debating how quickly AI regulation can respond to fast-moving tools, business pressure, and public risk. The issue matters because laws often move more slowly than technology, forcing societies to decide what level of uncertainty they can tolerate.",
      topicTags: ["AI", "Regulation", "Ethics", "Policy", "Evidence"],
      briefMarkdown: [
        "3-sentence abstract Governments are debating whether AI laws can move fast enough to regulate powerful new tools. Some policymakers want stronger guardrails now, while others warn that rushed rules could stifle useful innovation. The debate matters because the pace of technology may outstrip the pace of public accountability.",
        "Learning objective Students should evaluate how strong a policy claim remains when evidence, uncertainty, and competing priorities all stay in play.",
        "Core issue The central question is not whether AI matters, but how institutions should govern fast-changing systems without pretending that risk can be removed entirely.",
        "Claim Stronger regulation is justified when a tool can scale harm faster than existing oversight can respond.",
        "Counterpoint or evidence limit Regulation can also overreach when the evidence base is still incomplete or when policymakers target hypothetical harms without distinguishing high-risk uses from low-risk experimentation.",
        "Method focus Distinguish causal claims from confounding political pressure, and compare stronger evidence with weaker inference.",
        "TOK link Public self-confidence about regulation is not the same as justified knowledge about future harm.",
        "Why this matters for IB thinking This issue invites students to compare certainty with precaution, public good with innovation, and evidence with political pressure.",
        "Key academic term - Precautionary principle: The idea that policymakers may act to reduce harm even before all evidence is complete",
        "TOK / essay prompt - When evidence is incomplete, how should societies decide whether caution is wiser than freedom to experiment?",
        "Researchable question Which AI harms can already be measured directly, and which proposed harms still rely mainly on projection?",
        "Notebook capture Note one claim supporting faster regulation and one evidence limit that weakens a simplistic policy response.",
      ].join("\n"),
      sourceReferences: [],
    });

    expect(packet.layoutVariant).toBe("dp-academic");
    expect(packet.summaryTitle).toBe("3-sentence abstract");
    expect(packet.readingTitle).toBe("Academic frame");
    expect(packet.readingSections).toEqual([
      expect.objectContaining({
        title: "Learning objective",
        body: "Students should evaluate how strong a policy claim remains when evidence, uncertainty, and competing priorities all stay in play.",
      }),
      expect.objectContaining({ title: "Core issue" }),
      expect.objectContaining({
        title: "Claim",
        body: "Stronger regulation is justified when a tool can scale harm faster than existing oversight can respond.",
      }),
      expect.objectContaining({ title: "Counterpoint or evidence limit" }),
      expect.objectContaining({ title: "Method focus" }),
      expect.objectContaining({ title: "TOK link" }),
      expect.objectContaining({ title: "Why this matters for IB thinking" }),
      expect.objectContaining({ title: "Researchable question" }),
    ]);
    expect(packet.vocabularyTitle).toBe("Key academic term");
    expect(packet.vocabularyItems).toEqual([
      {
        term: "Precautionary principle",
        definition:
          "The idea that policymakers may act to reduce harm even before all evidence is complete",
      },
    ]);
    expect(packet.discussionTitle).toBe("TOK / essay prompt");
    expect(packet.discussionPrompts).toEqual([
      "When evidence is incomplete, how should societies decide whether caution is wiser than freedom to experiment?",
    ]);
    expect(packet.bigIdeaTitle).toBe("Notebook capture");
    expect(packet.bigIdeaBody).toContain(
      "Note one claim supporting faster regulation",
    );
  });

  test("compresses dense DP reading sections and support blocks for a two-page outbound budget", () => {
    const packet = buildOutboundDailyBriefPacket({
      headline:
        "Defending champion Rory McIlroy loses six-shot lead before the final Masters round",
      scheduledFor: "2026-04-13",
      programme: "DP",
      editorialCohort: "APAC",
      summary:
        "Rory McIlroy lost a six-shot lead at Augusta National before the final round of the Masters, turning his title defence into a far less certain contest. The episode matters because it illustrates how apparent numerical control can weaken quickly when execution, psychology, and competitive context all shift together.",
      topicTags: ["golf", "performance", "evidence", "psychology", "causation"],
      briefMarkdown: [
        "3-sentence abstract Rory McIlroy appeared to be in commanding control of the Masters after building a six-shot lead. That advantage disappeared before the final round, forcing observers to reconsider whether the collapse reflected psychology, technical execution, or competitive pressure. The event matters because it demonstrates how quickly a persuasive surface narrative can dissolve when causation is more complex than the score alone suggests.",
        "Learning objective Students should evaluate a performance claim by separating observable facts from inferred explanations and by keeping multiple causal pathways in view.",
        "Core issue The key issue is whether a sudden reversal in elite performance can be explained mainly by individual psychology or whether it should be understood as the result of interacting variables, including opponent performance, course conditions, and decision-making under pressure.",
        "Claim A large lead in elite individual sport does not guarantee victory because performance advantages remain vulnerable to psychological pressure, changing context, and execution errors.",
        "Counterpoint or evidence limit The strongest public evidence here is limited: score changes and athlete comments do not fully reveal whether the lost lead came mostly from McIlroy's own mistakes, exceptional play by others, or situational factors on the course. That means any single-cause explanation should be treated cautiously.",
        "Method focus Use causal reasoning with confounding variables in mind: distinguish what can be directly observed from what must be inferred, and compare stronger evidence with weaker interpretation.",
        "TOK link Public explanations by athletes and commentators can feel convincing, but persuasive interpretation is not the same as reliable knowledge about why an outcome changed.",
        "Why this matters for IB thinking This case rewards evidence-aware reasoning because students must weigh narrative simplicity against analytical accuracy. It also models a core IB habit: resisting the temptation to over-explain a complex event with only one attractive cause.",
        "Key academic term - Confounding variable: A factor that may influence an outcome while making it harder to isolate the true cause of change.",
        "TOK / essay prompt - When evidence is partial and emotionally charged, how should we decide which explanation deserves the most confidence?",
        "Researchable question Which indicators would best help an analyst distinguish psychological collapse from broader performance-context change in a high-stakes golf tournament?",
        "Notebook capture Record one defensible claim about why the lead disappeared, then add one evidence limit that prevents that claim from becoming too certain.",
      ].join("\n"),
      sourceReferences: [],
    });

    expect(packet.summaryBody.length).toBeLessThanOrEqual(300);
    expect(packet.readingSections.every((section) => section.body.length <= 220)).toBe(
      true,
    );
    expect(packet.vocabularyItems[0]?.definition.length ?? 0).toBeLessThanOrEqual(120);
    expect(packet.discussionPrompts[0]?.length ?? 0).toBeLessThanOrEqual(140);
    expect(packet.bigIdeaBody?.length ?? 0).toBeLessThanOrEqual(170);
  });
});

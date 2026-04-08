import { describe, expect, test } from "vitest";

import { buildOutboundDailyBriefPacket } from "./outbound-daily-brief-packet";
import { buildDailyBriefKnowledgeBank } from "./daily-brief-knowledge-bank";

describe("daily brief knowledge bank", () => {
  test("builds an inquiry notebook structure for MYP", () => {
    const packet = buildOutboundDailyBriefPacket({
      headline: "Students compare coastal cleanup plans across cities",
      scheduledFor: "2026-04-05",
      programme: "MYP",
      editorialCohort: "APAC",
      summary:
        "Students compare how different cities organise shoreline cleanup efforts and what trade-offs each plan makes.",
      topicTags: ["Oceans", "Civic planning", "Sustainability"],
      briefMarkdown: [
        "What’s happening? Students are comparing several coastal cleanup plans from different cities.",
        "Why does this matter? Each plan solves one problem well, but creates trade-offs in cost, speed, and fairness.",
        "Global context Coastal cleanup decisions affect communities, public budgets, and environmental recovery.",
        "Compare or connect One city may value speed, while another values resident voice and resilience.",
        "Inquiry question - Which cleanup plan would feel fairest, and what evidence would help you defend that choice?",
        "Notebook prompt Write two sentences comparing a fast cleanup plan with a community-led cleanup plan.",
      ].join("\n"),
      sourceReferences: [],
    });

    const knowledgeBank = buildDailyBriefKnowledgeBank(packet);

    expect(knowledgeBank.title).toBe("Inquiry notebook");
    expect(knowledgeBank.capturePrompt).toBe(
      "Which cleanup plan would feel fairest, and what evidence would help you defend that choice?",
    );
    expect(knowledgeBank.sections.map((section) => section.title)).toEqual([
      "Context and comparison",
      "Focus areas",
      "Inquiry question",
      "Notebook prompt",
    ]);
    expect(knowledgeBank.entries).toEqual([
      {
        title: "Inquiry notebook",
        body: "Which cleanup plan would feel fairest, and what evidence would help you defend that choice?",
      },
      {
        title: "Global context note",
        body: "Coastal cleanup decisions affect communities, public budgets, and environmental recovery.",
      },
      {
        title: "Compare-connect note",
        body: "One city may value speed, while another values resident voice and resilience.",
      },
      {
        title: "Vocabulary",
        body: "No structured vocabulary captured yet.",
      },
    ]);
  });

  test("builds an academic idea bank structure for DP", () => {
    const packet = buildOutboundDailyBriefPacket({
      headline: "Governments debate whether AI regulation can keep up",
      scheduledFor: "2026-04-05",
      programme: "DP",
      editorialCohort: "EMEA",
      summary:
        "Governments are debating how quickly AI regulation can respond to fast-moving tools and public risk.",
      topicTags: ["AI", "Regulation", "Ethics"],
      briefMarkdown: [
        "3-sentence abstract Governments are debating whether AI laws can move fast enough to regulate powerful new tools. Some policymakers want stronger guardrails now, while others warn that rushed rules could stifle useful innovation. The debate matters because the pace of technology may outstrip public accountability.",
        "Core issue The central question is how institutions should govern fast-changing systems without pretending that risk can be removed entirely.",
        "Claim Stronger regulation is justified when a tool can scale harm faster than existing oversight can respond.",
        "Counterpoint or evidence limit Regulation can overreach when the evidence base is still incomplete.",
        "Why this matters for IB thinking This issue invites students to compare certainty with precaution, public good with innovation, and evidence with political pressure.",
        "Key academic term - Precautionary principle: The idea that policymakers may act to reduce harm even before all evidence is complete",
        "TOK / essay prompt - When evidence is incomplete, how should societies decide whether caution is wiser than freedom to experiment?",
        "Notebook capture Note one claim supporting faster regulation and one evidence limit that weakens a simplistic policy response.",
      ].join("\n"),
      sourceReferences: [],
    });

    const knowledgeBank = buildDailyBriefKnowledgeBank(packet);

    expect(knowledgeBank.title).toBe("Academic idea bank");
    expect(knowledgeBank.capturePrompt).toBe(
      "When evidence is incomplete, how should societies decide whether caution is wiser than freedom to experiment?",
    );
    expect(knowledgeBank.sections.map((section) => section.title)).toEqual([
      "Academic frame",
      "Focus areas",
      "TOK / essay prompt",
      "Notebook capture",
    ]);
    expect(knowledgeBank.entries).toEqual([
      {
        title: "Claim",
        body: "Stronger regulation is justified when a tool can scale harm faster than existing oversight can respond.",
      },
      {
        title: "Counterpoint",
        body: "Regulation can overreach when the evidence base is still incomplete.",
      },
      {
        title: "TOK prompt",
        body: "When evidence is incomplete, how should societies decide whether caution is wiser than freedom to experiment?",
      },
      {
        title: "Notebook capture",
        body: "Note one claim supporting faster regulation and one evidence limit that weakens a simplistic policy response.",
      },
    ]);
  });

  test("normalizes a legacy MYP brief into inquiry-first capture prompts", () => {
    const packet = buildOutboundDailyBriefPacket({
      headline: "MYP ocean mapping brief",
      scheduledFor: "2026-04-05",
      programme: "MYP",
      editorialCohort: "APAC",
      summary:
        "Students compare why ocean mapping helps scientists protect animals and what wider systems depend on better evidence.",
      topicTags: ["Oceans", "Science"],
      briefMarkdown:
        "## MYP\nStudents compare why ocean mapping helps scientists protect animals.",
      sourceReferences: [],
    });

    const knowledgeBank = buildDailyBriefKnowledgeBank(packet);

    expect(packet.discussionTitle).toBe("Inquiry question");
    expect(packet.discussionPrompts).toEqual([
      "What global context or system-level connection stands out most in this brief?",
    ]);
    expect(packet.bigIdeaTitle).toBe("Notebook prompt");
    expect(packet.bigIdeaBody).toContain("wider system");
    expect(knowledgeBank.title).toBe("Inquiry notebook");
    expect(knowledgeBank.capturePrompt).toBe(
      "What global context or system-level connection stands out most in this brief?",
    );
    expect(knowledgeBank.entries).toEqual([
      {
        title: "Inquiry notebook",
        body: "What global context or system-level connection stands out most in this brief?",
      },
      {
        title: "Global context note",
        body: "Students compare why ocean mapping helps scientists protect animals.",
      },
      {
        title: "Compare-connect note",
        body: "Students compare why ocean mapping helps scientists protect animals.",
      },
      {
        title: "Vocabulary",
        body: "No structured vocabulary captured yet.",
      },
    ]);
  });

  test("normalizes a legacy DP brief into academic capture prompts", () => {
    const packet = buildOutboundDailyBriefPacket({
      headline: "DP ocean evidence brief",
      scheduledFor: "2026-04-05",
      programme: "DP",
      editorialCohort: "EMEA",
      summary:
        "Students evaluate why ocean evidence matters, what claim the reporting supports, and where the evidence remains incomplete.",
      topicTags: ["Oceans", "Evidence"],
      briefMarkdown:
        "## DP\nStudents evaluate why ocean evidence matters for policy decisions.",
      sourceReferences: [],
    });

    const knowledgeBank = buildDailyBriefKnowledgeBank(packet);

    expect(packet.discussionTitle).toBe("TOK / essay prompt");
    expect(packet.discussionPrompts).toEqual([
      "Which claim in this brief feels strongest, and what evidence limit or counterpoint should you keep in view?",
    ]);
    expect(packet.bigIdeaTitle).toBe("Notebook capture");
    expect(packet.bigIdeaBody).toContain("evidence limit");
    expect(knowledgeBank.title).toBe("Academic idea bank");
    expect(knowledgeBank.capturePrompt).toBe(
      "Which claim in this brief feels strongest, and what evidence limit or counterpoint should you keep in view?",
    );
    expect(knowledgeBank.entries).toEqual([
      {
        title: "Claim",
        body: "Students evaluate why ocean evidence matters for policy decisions.",
      },
      {
        title: "Counterpoint",
        body: "Students evaluate why ocean evidence matters for policy decisions.",
      },
      {
        title: "TOK prompt",
        body: "Which claim in this brief feels strongest, and what evidence limit or counterpoint should you keep in view?",
      },
      {
        title: "Notebook capture",
        body: "Capture one arguable claim, one evidence limit, and one question you would test further.",
      },
    ]);
  });
});

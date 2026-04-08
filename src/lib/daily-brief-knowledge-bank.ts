import type { OutboundDailyBriefPacket } from "./outbound-daily-brief-packet";
import { getDailyBriefProgrammeContentModel } from "./daily-brief-product-policy";

export type DailyBriefKnowledgeBankSection = {
  title: string;
  body: string;
};

export type DailyBriefKnowledgeBank = {
  title: string;
  capturePrompt: string;
  entries: DailyBriefKnowledgeBankSection[];
  sections: DailyBriefKnowledgeBankSection[];
};

function joinReadingSectionBodies(packet: OutboundDailyBriefPacket) {
  return packet.readingSections
    .map((section) =>
      section.title ? `${section.title}: ${section.body}` : section.body,
    )
    .join("\n\n")
    .trim();
}

function sanitizeKnowledgeEntryBody(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.replace(/^(PYP|MYP|DP)\s+/i, "").trim();
}

function findReadingSectionBody(
  packet: OutboundDailyBriefPacket,
  title: string,
) {
  const body =
    packet.readingSections.find((section) => section.title === title)?.body ?? null;

  return sanitizeKnowledgeEntryBody(body) || null;
}

function getFirstReadingSectionBody(packet: OutboundDailyBriefPacket) {
  return sanitizeKnowledgeEntryBody(
    packet.readingSections[0]?.body ?? packet.summaryBody,
  );
}

function buildVocabularyBody(packet: OutboundDailyBriefPacket) {
  if (packet.vocabularyItems.length === 0) {
    return "No structured vocabulary captured yet.";
  }

  return packet.vocabularyItems
    .map((item) => `${item.term}: ${item.definition}`)
    .join("\n");
}

function buildMypKnowledgeEntries(
  packet: OutboundDailyBriefPacket,
  capturePrompt: string,
) {
  return [
    {
      title: "Inquiry notebook",
      body: capturePrompt,
    },
    {
      title: "Global context note",
      body:
        findReadingSectionBody(packet, "Global context") ??
        getFirstReadingSectionBody(packet),
    },
    {
      title: "Compare-connect note",
      body:
        findReadingSectionBody(packet, "Compare or connect") ??
        getFirstReadingSectionBody(packet),
    },
    {
      title: "Vocabulary",
      body: buildVocabularyBody(packet),
    },
  ];
}

function buildDpKnowledgeEntries(
  packet: OutboundDailyBriefPacket,
  capturePrompt: string,
) {
  return [
    {
      title: "Claim",
      body: findReadingSectionBody(packet, "Claim") ?? getFirstReadingSectionBody(packet),
    },
    {
      title: "Counterpoint",
      body:
        findReadingSectionBody(packet, "Counterpoint or evidence limit") ??
        getFirstReadingSectionBody(packet),
    },
    {
      title: "TOK prompt",
      body: capturePrompt,
    },
    {
      title: "Notebook capture",
      body:
        sanitizeKnowledgeEntryBody(packet.bigIdeaBody) ??
        "Capture one reusable claim, tension, or evidence limit from today's brief.",
    },
  ];
}

function buildLegacyKnowledgeEntries(
  packet: OutboundDailyBriefPacket,
  capturePrompt: string,
) {
  return [
    {
      title: packet.title ?? "Knowledge bank",
      body: capturePrompt,
    },
  ];
}

export function buildDailyBriefKnowledgeBank(
  packet: OutboundDailyBriefPacket,
): DailyBriefKnowledgeBank {
  const contentModel = getDailyBriefProgrammeContentModel(packet.programme);
  const capturePrompt =
    packet.discussionPrompts[0] ?? packet.bigIdeaBody ?? packet.summaryBody;
  const sections: DailyBriefKnowledgeBankSection[] = [
    {
      title: packet.readingTitle,
      body: joinReadingSectionBodies(packet),
    },
  ];

  if (packet.themesTitle && packet.themesBody) {
    sections.push({
      title: packet.themesTitle,
      body: packet.themesBody,
    });
  }

  if (packet.discussionPrompts.length > 0) {
    sections.push({
      title: packet.discussionTitle,
      body: packet.discussionPrompts.join("\n"),
    });
  }

  if (packet.bigIdeaTitle && packet.bigIdeaBody) {
    sections.push({
      title: packet.bigIdeaTitle,
      body: packet.bigIdeaBody,
    });
  }

  const entries =
    packet.programme === "MYP"
      ? buildMypKnowledgeEntries(packet, capturePrompt)
      : packet.programme === "DP"
        ? buildDpKnowledgeEntries(packet, capturePrompt)
        : buildLegacyKnowledgeEntries(packet, capturePrompt);

  return {
    title: contentModel.knowledgeBankTitle,
    capturePrompt,
    entries,
    sections,
  };
}

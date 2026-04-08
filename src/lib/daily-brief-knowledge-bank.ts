import type { OutboundDailyBriefPacket } from "./outbound-daily-brief-packet";
import { getDailyBriefProgrammeContentModel } from "./daily-brief-product-policy";

export type DailyBriefKnowledgeBankSection = {
  title: string;
  body: string;
};

export type DailyBriefKnowledgeBank = {
  title: string;
  capturePrompt: string;
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

  return {
    title: contentModel.knowledgeBankTitle,
    capturePrompt,
    sections,
  };
}

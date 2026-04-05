import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";

import type { OutboundDailyBriefPacketInput } from "./outbound-daily-brief-packet";
import { buildOutboundDailyBriefPacket } from "./outbound-daily-brief-packet";

type TypstCompilerLike = {
  pdf(args: { mainFileContent: string }): Buffer | Uint8Array;
};

type RenderOutboundDailyBriefTypstPrototypeOptions = {
  createCompiler?: () => TypstCompilerLike;
};

function escapeTypstString(value: string) {
  return JSON.stringify(value);
}

function slugifyForPrototype(value: string, fallback: string, maxSegments = 8) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    return fallback;
  }

  return slug
    .split("-")
    .filter(Boolean)
    .slice(0, maxSegments)
    .join("-");
}

function toTypstPrototypeFileName(
  brief: Pick<OutboundDailyBriefPacketInput, "headline" | "programme" | "scheduledFor">,
) {
  return `${brief.scheduledFor}_DailySparks_DailyBrief_${brief.programme.toUpperCase()}_${slugifyForPrototype(brief.headline, "daily-reading")}_typst-prototype.pdf`;
}

function createDefaultCompiler(): TypstCompilerLike {
  return NodeCompiler.create();
}

export function getTypstHeadlineSize(headline: string) {
  const length = headline.trim().length;

  if (length >= 96) {
    return 18;
  }

  if (length >= 64) {
    return 20;
  }

  return 22;
}

export function preventTypstHeadlineWidows(headline: string) {
  const words = headline.trim().split(/\s+/).filter(Boolean);

  if (words.length < 4) {
    return headline.trim();
  }

  const trailingWord = words.pop();
  const trailingPairLead = words.pop();

  if (!trailingWord || !trailingPairLead) {
    return headline.trim();
  }

  return [...words, `${trailingPairLead}\u00a0${trailingWord}`].join(" ");
}

export function buildOutboundDailyBriefTypstSource(
  brief: OutboundDailyBriefPacketInput,
) {
  const packet = buildOutboundDailyBriefPacket(brief);
  const headline = preventTypstHeadlineWidows(packet.title);
  const headlineSize = getTypstHeadlineSize(headline);
  const metadataItems = packet.metadataItems
    .map((item) => `#pill(${escapeTypstString(item)})`)
    .join("\n        ");
  const readingBlocks = packet.readingSections
    .map((section) =>
      `#reading-block(${escapeTypstString(section.title ?? "")}, ${escapeTypstString(section.body)})`,
    )
    .join("\n");
  const vocabularyBlocks =
    packet.vocabularyTitle && packet.vocabularyItems.length > 0
      ? packet.vocabularyItems
          .map(
            (item) =>
              `#vocab-item(${escapeTypstString(item.term)}, ${escapeTypstString(item.definition)})`,
          )
          .join("\n")
      : "";
  const discussionBlocks = packet.discussionPrompts
    .map((prompt) => `#prompt-chip(${escapeTypstString(prompt)})`)
    .join("\n");
  const sourceBlocks = packet.sourceLines
    .map((line) => `#source-line(${escapeTypstString(line)})`)
    .join("\n");

  return `
#set page(width: 595pt, height: 842pt, margin: 48pt, fill: rgb("#fffdfa"))
#set par(justify: false, leading: 0.95em)
#set text(size: 11pt, fill: rgb("#475569"))

#let ink = rgb("#0f172a")
#let secondary = rgb("#475569")
#let muted = rgb("#64748b")
#let gold = rgb("#b45309")
#let pale-blue = rgb("#eef6ff")
#let pale-gold = rgb("#fdf7ea")
#let soft-border = rgb("#d9e4f2")
#let gold-border = rgb("#f1dfb9")

#let pill(value) = box(
  fill: rgb("#f8fbff"),
  stroke: (paint: soft-border, thickness: 1pt),
  inset: (x: 10pt, y: 5pt),
  radius: 999pt,
)[#text(size: 7.5pt, weight: "semibold", fill: muted)[#value]]

#let section-card(label, body, fill-color: white, border-color: soft-border, label-color: muted) = rect(
  width: 100%,
  fill: fill-color,
  stroke: (paint: border-color, thickness: 1pt),
  inset: 16pt,
  radius: 18pt,
)[
  #text(size: 9pt, weight: "semibold", fill: label-color)[#label]
  #v(8pt)
  #set par(leading: 1.14em)
  #text(size: 11.1pt, fill: secondary)[#body]
]

#let standfirst-card(label, body) = rect(
  width: 100%,
  fill: rgb("#fcfeff"),
  stroke: (paint: soft-border, thickness: 1pt),
  inset: 22pt,
  radius: 18pt,
)[
  #text(size: 9pt, weight: "semibold", fill: gold)[#label]
  #v(8pt)
  #set par(leading: 1.22em)
  #text(size: 14pt, fill: ink)[#body]
]

#let reading-block(title, body) = [
  #if title != "" [
    #text(size: 12.5pt, weight: "semibold", fill: ink)[#title]
    #v(4pt)
  ]
  #set par(leading: 1.18em)
  #text(size: 11.35pt, fill: secondary)[#body]
  #v(14pt)
]

#let vocab-item(term, definition) = [
  #text(size: 11pt, weight: "semibold", fill: ink)[#term]
  #v(3pt)
  #text(size: 11pt, fill: secondary)[#definition]
  #v(8pt)
]

#let prompt-chip(prompt) = box(
  fill: white,
  stroke: (paint: soft-border, thickness: 1pt),
  inset: 12pt,
  radius: 14pt,
)[#text(size: 10.5pt, fill: secondary)[#prompt]]

#let source-line(value) = [
  #text(size: 10pt, fill: secondary)[#value]
  #v(6pt)
]

#rect(
  width: 100%,
  fill: pale-blue,
  stroke: (paint: soft-border, thickness: 1pt),
  inset: 18pt,
  radius: 20pt,
)[
  #text(size: 8.5pt, weight: "semibold", fill: gold)[#${escapeTypstString(packet.eyebrow)}]
  #v(4pt)
  #text(size: ${headlineSize}pt, weight: "bold", fill: ink)[#${escapeTypstString(headline)}]
  #v(10pt)
  #grid(columns: (auto, auto, auto), gutter: 8pt,[
        ${metadataItems}
  ])
]

#v(12pt)
#standfirst-card(${escapeTypstString(packet.summaryTitle)}, ${escapeTypstString(packet.summaryBody)})

${
  packet.themesTitle && packet.themesBody
    ? `
#v(12pt)
#section-card(${escapeTypstString(packet.themesTitle)}, ${escapeTypstString(packet.themesBody)}, fill-color: pale-gold, border-color: gold-border, label-color: gold)
`
    : ""
}

#v(16pt)
#text(size: 22pt, weight: "bold", fill: ink)[#${escapeTypstString(packet.readingTitle)}]
#v(12pt)
${readingBlocks}

${
  packet.vocabularyTitle && packet.vocabularyItems.length > 0
    ? `
#v(6pt)
#rect(
  width: 100%,
  fill: pale-gold,
  stroke: (paint: gold-border, thickness: 1pt),
  inset: 18pt,
  radius: 18pt,
)[
  #text(size: 10pt, weight: "semibold", fill: gold)[#${escapeTypstString(packet.vocabularyTitle)}]
  #v(10pt)
  ${vocabularyBlocks}
]
`
    : ""
}

${
  packet.bigIdeaTitle && packet.bigIdeaBody
    ? `
#v(12pt)
#section-card(${escapeTypstString(packet.bigIdeaTitle)}, ${escapeTypstString(packet.bigIdeaBody)}, fill-color: pale-blue)
`
    : ""
}

#v(12pt)
#rect(
  width: 100%,
  fill: pale-blue,
  stroke: (paint: soft-border, thickness: 1pt),
  inset: 18pt,
  radius: 18pt,
)[
  #text(size: 10pt, weight: "semibold", fill: muted)[#${escapeTypstString(packet.discussionTitle)}]
  #v(10pt)
  ${discussionBlocks}
]

#v(12pt)
#rect(
  width: 100%,
  fill: white,
  stroke: (paint: soft-border, thickness: 1pt),
  inset: 18pt,
  radius: 18pt,
)[
  #text(size: 10pt, weight: "semibold", fill: muted)[#${escapeTypstString(packet.sourcesTitle)}]
  #v(8pt)
  ${sourceBlocks}
]

#v(14pt)
#line(length: 100%, stroke: (paint: soft-border, thickness: 1pt))
#v(8pt)
#text(size: 11pt, weight: "semibold", fill: ink)[#${escapeTypstString(packet.footerSignature)}]
`.trim();
}

export async function renderOutboundDailyBriefTypstPrototype(
  brief: OutboundDailyBriefPacketInput,
  options: RenderOutboundDailyBriefTypstPrototypeOptions = {},
) {
  const source = buildOutboundDailyBriefTypstSource(brief);
  const compiler = (options.createCompiler ?? createDefaultCompiler)();
  const pdf = compiler.pdf({ mainFileContent: source });

  return {
    source,
    pdf: pdf instanceof Uint8Array ? pdf : new Uint8Array(pdf),
    fileName: toTypstPrototypeFileName(brief),
  };
}

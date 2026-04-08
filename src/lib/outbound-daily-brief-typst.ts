import {
  NodeCompiler,
  type NodeTypstCompileResult,
  type NodeTypstDocument,
} from "@myriaddreamin/typst-ts-node-compiler";

import type { OutboundDailyBriefPacketInput } from "./outbound-daily-brief-packet";
import { buildOutboundDailyBriefPacket } from "./outbound-daily-brief-packet";

type TypstCompilerLike = {
  compile(args: { mainFileContent: string }): NodeTypstCompileResult;
  pdf(
    compiledOrBy: NodeTypstDocument | { mainFileContent: string },
  ): Buffer | Uint8Array;
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

function readTypstErrorMessage(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && "message" in value) {
    const message = value.message;

    return typeof message === "string" ? message : null;
  }

  return null;
}

function compileTypstDocument(compiler: TypstCompilerLike, source: string) {
  const compileResult = compiler.compile({ mainFileContent: source });
  const document = compileResult.result;

  if (document && !compileResult.hasError()) {
    return document;
  }

  const message =
    readTypstErrorMessage(compileResult.takeError()) ??
    readTypstErrorMessage(compileResult.takeDiagnostics()) ??
    "Typst compile failed.";

  throw new Error(message);
}

export function getTypstHeadlineSize(
  headline: string,
  layoutVariant:
    | "standard"
    | "pyp-one-page"
    | "myp-bridge"
    | "dp-academic" = "standard",
) {
  const length = headline.trim().length;

  if (layoutVariant === "pyp-one-page") {
    if (length >= 96) {
      return 16;
    }

    if (length >= 64) {
      return 18;
    }

    return 20;
  }

  if (layoutVariant === "myp-bridge") {
    if (length >= 96) {
      return 18;
    }

    if (length >= 64) {
      return 19;
    }

    return 20;
  }

  if (layoutVariant === "dp-academic") {
    if (length >= 96) {
      return 18;
    }

    if (length >= 64) {
      return 20;
    }

    return 21;
  }

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
  const isPypOnePage = packet.layoutVariant === "pyp-one-page";
  const isMypBridge = packet.layoutVariant === "myp-bridge";
  const isDpAcademic = packet.layoutVariant === "dp-academic";
  const headlineSize = getTypstHeadlineSize(headline, packet.layoutVariant);
  const metadataItems = packet.metadataItems
    .map((item) => `#pill(${escapeTypstString(item)})`)
    .join("\n        ");
  const readingBlocks = packet.readingSections
    .map((section) =>
      `#reading-block(${escapeTypstString(section.title ?? "")}, ${escapeTypstString(section.body)})`,
    )
    .join("\n");
  const discussionBlocks = packet.discussionPrompts
    .map((prompt) => `#prompt-chip(${escapeTypstString(prompt)})`)
    .join("\n");
  const compactDiscussionBlocks = packet.discussionPrompts
    .map((prompt) => `#compact-prompt(${escapeTypstString(prompt)})`)
    .join("\n");
  const sourceBlocks = packet.sourceLines
    .map((line) => `#source-line(${escapeTypstString(line)})`)
    .join("\n");
  const compactSourceLabel = packet.sourceLines[0]?.split(" - ")[0] ?? null;
  const compactSourceLine = compactSourceLabel
    ? `#text(size: 8.4pt, fill: muted)[#${escapeTypstString(`Source: ${compactSourceLabel}`)}]`
    : "";
  const compactVocabularyBlocks = packet.vocabularyItems
    .map(
      (item) =>
        `#compact-note(${escapeTypstString(item.term)}, ${escapeTypstString(item.definition)})`,
    )
    .join("\n");
  const compactThemeBlock =
    isPypOnePage && packet.themesTitle && packet.themesBody
      ? `
#v(6pt)
#text(size: 8.1pt, weight: "semibold", fill: gold)[#${escapeTypstString(packet.themesTitle)}]
#v(2pt)
#text(size: 9.6pt, fill: muted)[#${escapeTypstString(packet.themesBody)}]
`
      : "";
  const standardThemeBlock =
    !isPypOnePage && !isMypBridge && !isDpAcademic && packet.themesTitle && packet.themesBody
      ? `
#v(12pt)
#section-card(${escapeTypstString(packet.themesTitle)}, ${escapeTypstString(packet.themesBody)}, fill-color: pale-gold, border-color: gold-border, label-color: gold)
`
      : "";
  const mypThemeBlock =
    isMypBridge && packet.themesTitle && packet.themesBody
      ? `#section-card(${escapeTypstString(packet.themesTitle)}, ${escapeTypstString(packet.themesBody)}, fill-color: pale-gold, border-color: gold-border, label-color: gold)`
      : "";
  const mypVocabularyBody = packet.vocabularyItems
    .map((item) => `${item.term}: ${item.definition}`)
    .join(" / ");
  const mypDiscussionBody = packet.discussionPrompts
    .map((prompt) => `- ${prompt}`)
    .join(" ");
  const pypTeachingBlocks =
    isPypOnePage
      ? `
#v(8pt)
${packet.vocabularyTitle && packet.vocabularyItems.length > 0
  ? `#text(size: 8.2pt, weight: "semibold", fill: gold)[#${escapeTypstString(packet.vocabularyTitle)}]
#v(3pt)
${compactVocabularyBlocks}
#v(3pt)
`
  : ""}#text(size: 8.2pt, weight: "semibold", fill: muted)[#${escapeTypstString(packet.discussionTitle)}]
#v(3pt)
${compactDiscussionBlocks}
${packet.bigIdeaTitle && packet.bigIdeaBody
  ? `
#v(3pt)
#text(size: 8.2pt, weight: "semibold", fill: gold)[#${escapeTypstString(`${packet.bigIdeaTitle}:`)}]
#h(4pt)
#text(size: 9.2pt, fill: secondary)[#${escapeTypstString(packet.bigIdeaBody)}]
`
  : ""}
`
      : "";
  const pypFooterBlock =
    isPypOnePage
      ? `
#v(6pt)
#line(length: 100%, stroke: (paint: soft-border, thickness: 1pt))
#v(4pt)
${compactSourceLine}
#v(3pt)
#text(size: 9.4pt, weight: "semibold", fill: ink)[#${escapeTypstString(packet.footerSignature)}]
`
      : "";
  const standardTeachingBlocks =
    !isPypOnePage && !isMypBridge && !isDpAcademic
      ? `
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
  ${compactVocabularyBlocks.replace(/#compact-note/g, "#vocab-item")}
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
`
      : "";
  const mypCompareBlocks =
    isMypBridge
      ? `
#grid(
  columns: (1.15fr, 0.85fr),
  gutter: 16pt,
  [
    ${mypThemeBlock || '#box(width: 100%)[ ]'}
    #v(12pt)
    ${
      packet.vocabularyTitle && mypVocabularyBody
        ? `#section-card(${escapeTypstString(packet.vocabularyTitle)}, ${escapeTypstString(mypVocabularyBody)}, fill-color: pale-gold, border-color: gold-border, label-color: gold)`
        : '#box(width: 100%)[ ]'
    }
  ],
  [
    #section-card(${escapeTypstString(packet.discussionTitle)}, ${escapeTypstString(mypDiscussionBody)}, fill-color: pale-blue)
    ${
      packet.bigIdeaTitle && packet.bigIdeaBody
        ? `#v(12pt)
    #section-card(${escapeTypstString(packet.bigIdeaTitle)}, ${escapeTypstString(packet.bigIdeaBody)}, fill-color: white)`
        : ""
    }
  ],
)
`
      : "";

  return `
#set page(width: 595pt, height: 842pt, margin: ${isPypOnePage ? "36pt" : "48pt"}, fill: rgb("#fffdfa"))
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
  inset: (x: ${isPypOnePage ? "8pt" : "10pt"}, y: ${isPypOnePage ? "4pt" : "5pt"}),
  radius: 999pt,
)[#text(size: ${isPypOnePage ? "7.1pt" : "7.5pt"}, weight: "semibold", fill: muted)[#value]]

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
  inset: ${isPypOnePage ? "18pt" : isMypBridge ? "20pt" : "22pt"},
  radius: 18pt,
)[
  #text(size: ${isPypOnePage ? "8.5pt" : "9pt"}, weight: "semibold", fill: gold)[#label]
  #v(${isPypOnePage ? "6pt" : "8pt"})
  #set par(leading: ${isPypOnePage ? "1.16em" : "1.2em"})
  #text(size: ${isPypOnePage ? "12.4pt" : isMypBridge ? "12.6pt" : isDpAcademic ? "12.9pt" : "13.2pt"}, fill: ink)[#body]
]

#let reading-block(title, body) = [
  #if title != "" [
    #text(size: ${isPypOnePage ? "11.4pt" : isMypBridge ? "11.8pt" : isDpAcademic ? "12.1pt" : "12.5pt"}, weight: "semibold", fill: ink)[#title]
    #v(3pt)
  ]
  #set par(leading: ${isPypOnePage ? "1.1em" : isMypBridge ? "1.14em" : isDpAcademic ? "1.17em" : "1.18em"})
  #text(size: ${isPypOnePage ? "10.3pt" : isMypBridge ? "10.8pt" : isDpAcademic ? "11.05pt" : "11.35pt"}, fill: secondary)[#body]
  #v(${isPypOnePage ? "8pt" : isMypBridge ? "12pt" : isDpAcademic ? "13pt" : "14pt"})
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

#let compact-note(term, definition) = [
  #text(size: 9.7pt, weight: "semibold", fill: ink)[#term]
  #text(size: 9.7pt, fill: secondary)[": #definition"]
  #v(4pt)
]

#let compact-prompt(prompt) = [
  #text(size: 9.7pt, fill: secondary)[- #prompt]
  #v(4pt)
]

#let source-line(value) = [
  #text(size: 10pt, fill: secondary)[#value]
  #v(6pt)
]

#rect(
  width: 100%,
  fill: pale-blue,
  stroke: (paint: soft-border, thickness: 1pt),
  inset: ${isPypOnePage ? "12pt" : "18pt"},
  radius: ${isPypOnePage ? "14pt" : "20pt"},
)[
  #text(size: ${isPypOnePage ? "7pt" : "8.5pt"}, weight: "semibold", fill: gold)[#${escapeTypstString(packet.eyebrow)}]
  #v(${isPypOnePage ? "2pt" : "4pt"})
  #text(size: ${headlineSize}pt, weight: "bold", fill: ink)[#${escapeTypstString(headline)}]
  #v(${isPypOnePage ? "5pt" : isMypBridge ? "8pt" : isDpAcademic ? "9pt" : "10pt"})
  #grid(columns: (auto, auto, auto), gutter: 8pt,[
        ${metadataItems}
  ])
]

#v(${isPypOnePage ? "7pt" : isMypBridge ? "10pt" : isDpAcademic ? "11pt" : "12pt"})
#standfirst-card(${escapeTypstString(packet.summaryTitle)}, ${escapeTypstString(packet.summaryBody)})
${compactThemeBlock}
${standardThemeBlock}

#v(${isPypOnePage ? "10pt" : isMypBridge ? "14pt" : isDpAcademic ? "15pt" : "16pt"})
#text(size: ${isPypOnePage ? "17pt" : isMypBridge ? "20pt" : isDpAcademic ? "21pt" : "22pt"}, weight: "bold", fill: ink)[#${escapeTypstString(packet.readingTitle)}]
#v(${isPypOnePage ? "6pt" : isMypBridge ? "10pt" : isDpAcademic ? "11pt" : "12pt"})
${readingBlocks}
${pypTeachingBlocks}
${standardTeachingBlocks}
${mypCompareBlocks}

${!isPypOnePage && !isMypBridge && !isDpAcademic
  ? `#v(12pt)
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
#text(size: 11pt, weight: "semibold", fill: ink)[#${escapeTypstString(packet.footerSignature)}]`
  : isMypBridge || isDpAcademic
    ? `#v(12pt)
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
#text(size: 11pt, weight: "semibold", fill: ink)[#${escapeTypstString(packet.footerSignature)}]`
    : pypFooterBlock}
`.trim();
}

export async function renderOutboundDailyBriefTypstPrototype(
  brief: OutboundDailyBriefPacketInput,
  options: RenderOutboundDailyBriefTypstPrototypeOptions = {},
) {
  const source = buildOutboundDailyBriefTypstSource(brief);
  const compiler = (options.createCompiler ?? createDefaultCompiler)();
  const document = compileTypstDocument(compiler, source);
  const pdf = compiler.pdf(document);

  return {
    source,
    pdf: pdf instanceof Uint8Array ? pdf : new Uint8Array(pdf),
    fileName: toTypstPrototypeFileName(brief),
    pageCount: document.numOfPages,
  };
}

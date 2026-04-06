import {
  NodeCompiler,
  type NodeTypstCompileResult,
  type NodeTypstDocument,
} from "@myriaddreamin/typst-ts-node-compiler";

import type { ParentProfile } from "./mvp-types";
import {
  buildGoodnotesWelcomeNote,
  type GoodnotesWelcomeNote,
} from "./outbound-goodnotes-welcome-note";

type TypstCompilerLike = {
  compile(args: { mainFileContent: string }): NodeTypstCompileResult;
  pdf(
    compiledOrBy: NodeTypstDocument | { mainFileContent: string },
  ): Buffer | Uint8Array;
};

type RenderGoodnotesWelcomeNoteTypstOptions = {
  createCompiler?: () => TypstCompilerLike;
  generatedAt?: Date;
};

function escapeTypstString(value: string) {
  return JSON.stringify(value);
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

export function formatHongKongDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

export function toWelcomeNoteAttachmentFileName(
  programme: string,
  generatedAt = new Date(),
) {
  return `${formatHongKongDate(generatedAt)}_DailySparks_WelcomeNote_${programme.toUpperCase()}_getting-started_test.pdf`;
}

function buildDetailLines(lines: string[]) {
  return lines
    .map((line) => `#detail-line(${escapeTypstString(line)})`)
    .join("\n");
}

function buildNextSteps(steps: string[]) {
  return steps
    .map((step) => `#step-line(${escapeTypstString(step)})`)
    .join("\n");
}

function buildWelcomeNoteTypstSource(note: GoodnotesWelcomeNote) {
  const detailLines = buildDetailLines(note.detailLines);
  const nextSteps = buildNextSteps(note.nextSteps);

  return `
#set page(width: 595pt, height: 842pt, margin: 40pt, fill: rgb("#fffdfa"))
#set text(size: 11pt, fill: rgb("#475569"))
#set par(justify: false, leading: 1.34em)

#let ink = rgb("#0f172a")
#let secondary = rgb("#475569")
#let muted = rgb("#64748b")
#let gold = rgb("#b45309")
#let pale-blue = rgb("#eef6ff")
#let pale-gold = rgb("#fdf7ea")
#let soft-border = rgb("#d9e4f2")
#let gold-border = rgb("#f1dfb9")

#let panel(body, fill-color: white, border-color: soft-border, inset: 18pt) = rect(
  width: 100%,
  radius: 20pt,
  fill: fill-color,
  stroke: (paint: border-color, thickness: 1pt),
  inset: inset,
)[body]

#let detail-line(line) = block(
  above: 0pt,
  below: 6pt,
)[
  #text(size: 10pt, fill: secondary)[#line]
]

#let step-line(line) = block(
  above: 0pt,
  below: 8pt,
)[
  #grid(
    columns: (10pt, 1fr),
    gutter: 8pt,
    [
      #text(size: 10pt, weight: "semibold", fill: gold)[-]
    ],
    [
      #text(size: 10pt, fill: secondary)[#line]
    ],
  )
]

#align(left)[
  #panel(
    [
      #text(size: 8.4pt, weight: "semibold", fill: gold)[#${escapeTypstString(note.eyebrow)}]
      #v(10pt)
      #text(size: 28pt, weight: "bold", fill: ink)[#${escapeTypstString(note.title)}]
      #v(10pt)
      #text(size: 11.4pt, fill: secondary)[#${escapeTypstString(note.intro)}]
    ],
    fill-color: pale-blue,
  )

  #v(14pt)

  #panel(
    [
      #text(size: 17pt, weight: "bold", fill: ink)[#${escapeTypstString(note.confirmationTitle)}]
      #v(8pt)
      #text(size: 10.5pt, fill: secondary)[#${escapeTypstString(note.confirmationBody)}]
      #v(10pt)
      ${detailLines}
    ],
  )

  #v(12pt)

  #text(size: 16pt, weight: "bold", fill: ink)[#${escapeTypstString(note.expectationsTitle)}]
  #v(6pt)
  #text(size: 10.6pt, fill: secondary)[#${escapeTypstString(note.expectationsBody)}]

  #v(12pt)

  #panel(
    [
      #text(size: 16pt, weight: "bold", fill: ink)[#${escapeTypstString(note.weeklyRhythmTitle)}]
      #v(6pt)
      #text(size: 10.6pt, fill: secondary)[#${escapeTypstString(note.weeklyRhythmBody)}]
    ],
    fill-color: pale-gold,
    border-color: gold-border,
  )

  #v(12pt)

  #text(size: 16pt, weight: "bold", fill: ink)[#${escapeTypstString(note.nextStepsTitle)}]
  #v(8pt)
  ${nextSteps}

  #v(10pt)
  #line(length: 100%, stroke: (paint: soft-border, thickness: 1pt))
  #v(8pt)
  #text(size: 10pt, fill: secondary)[With care,]
  #v(4pt)
  #text(size: 11pt, weight: "semibold", fill: ink)[#${escapeTypstString(note.signature)}]
]
`;
}

export function buildGoodnotesWelcomeNoteTypstSource(profile: ParentProfile) {
  return buildWelcomeNoteTypstSource(buildGoodnotesWelcomeNote(profile));
}

export async function renderGoodnotesWelcomeNoteTypst(
  profile: ParentProfile,
  options: RenderGoodnotesWelcomeNoteTypstOptions = {},
) {
  const source = buildGoodnotesWelcomeNoteTypstSource(profile);
  const compiler = options.createCompiler?.() ?? createDefaultCompiler();
  const document = compileTypstDocument(compiler, source);
  const pdf = compiler.pdf(document);
  const generatedAt = options.generatedAt ?? new Date();

  return {
    source,
    pdf: new Uint8Array(pdf),
    pageCount: document.numOfPages,
    fileName: toWelcomeNoteAttachmentFileName(
      profile.student.programme,
      generatedAt,
    ),
  };
}

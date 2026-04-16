import { renderTypst } from "./typst-runtime";
import type { WeeklyProgressReportRecord } from "./weekly-report-schema";

export async function renderWeeklyProgressReportTypst(report: WeeklyProgressReportRecord) {
  const source = buildWeeklyReportTypstSource(report);
  const result = await renderTypst({
    source,
    format: "pdf",
  });

  return {
    pdf: result.pdf,
    fileName: `Weekly_Report_${report.studentName.replace(/\s+/g, '_')}_${report.weekKey}.pdf`,
    pageCount: result.pageCount,
  };
}

function escapeTypstString(value: string) {
  return value.replace(/([#*_{}\[\]])/g, '\\$1');
}

function buildWeeklyReportTypstSource(report: WeeklyProgressReportRecord) {
  const { reportContent, interactionStats } = report;

  return `
#set page(
  paper: "a4",
  margin: (x: 40pt, y: 50pt),
)
#set text(font: "Inter", size: 11pt, fill: rgb("#1e293b"))

#let primary = rgb("#0f172a")
#let secondary = rgb("#64748b")
#let accent = rgb("#d97706")
#let pale-blue = rgb("#f1f5f9")

#align(center)[
  #text(size: 24pt, weight: "bold", fill: primary)[Academic Growth Report]
  #v(4pt)
  #text(size: 14pt, fill: secondary)[${escapeTypstString(report.weekRangeLabel)}]
]

#v(20pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 20pt,
  [
    #text(size: 12pt, weight: "semibold", fill: primary)[Student:]
    #text(size: 12pt)[ ${escapeTypstString(report.studentName)}]
  ],
  [
    #text(size: 12pt, weight: "semibold", fill: primary)[Programme:]
    #text(size: 12pt)[ ${report.programme} Year ${report.studentName}]
  ]
)

#v(20pt)

#rect(
  width: 100%,
  fill: pale-blue,
  inset: 20pt,
  radius: 12pt,
  stroke: none,
)[
  #text(size: 14pt, weight: "bold", fill: primary)[Executive Summary]
  #v(8pt)
  #text(size: 11pt, fill: primary)[${escapeTypstString(reportContent.executiveSummary)}]
]

#v(24pt)

== Learning Engagement
#v(8pt)
#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 10pt,
  [
    #rect(width: 100%, inset: 10pt, radius: 8pt, stroke: rgb("#e2e8f0"))[
      #align(center)[
        #text(size: 9pt, fill: secondary)[BRIEFS SENT]
        #v(4pt)
        #text(size: 18pt, weight: "bold", fill: primary)[${interactionStats.totalBriefsSent}]
      ]
    ]
  ],
  [
    #rect(width: 100%, inset: 10pt, radius: 8pt, stroke: rgb("#e2e8f0"))[
      #align(center)[
        #text(size: 9pt, fill: secondary)[CHALLENGES]
        #v(4pt)
        #text(size: 18pt, weight: "bold", fill: primary)[${interactionStats.totalChallengesFound}]
      ]
    ]
  ],
  [
    #rect(width: 100%, inset: 10pt, radius: 8pt, stroke: rgb("#e2e8f0"))[
      #align(center)[
        #text(size: 9pt, fill: secondary)[COMPLETED]
        #v(4pt)
        #text(size: 18pt, weight: "bold", fill: accent)[${interactionStats.completedChallenges}]
      ]
    ]
  ]
)

#v(24pt)

== Concept Mastery
#v(8pt)
${reportContent.conceptMastery.map(c => `- ${escapeTypstString(c)}`).join("\n")}

#v(20pt)

== Vocabulary Highlights
#v(8pt)
${reportContent.vocabularyHighlights.map(v => `*${escapeTypstString(v.term)}*: ${escapeTypstString(v.context)}`).join("\n\n")}

#v(24pt)

== Thinking Skills & Growth
#v(8pt)
${escapeTypstString(reportContent.thinkingSkillsGrowth)}

#v(30pt)

#rect(
  width: 100%,
  fill: rgb("#f8fafc"),
  inset: 20pt,
  radius: 12pt,
  stroke: (paint: accent, thickness: 1pt, dash: "dashed"),
)[
  #text(size: 13pt, weight: "bold", fill: accent)[Weekend Parent-Child Discussion]
  #v(10pt)
  ${reportContent.weekendDiscussionPrompts.map(p => `- ${escapeTypstString(p)}`).join("\n")}
]

#v(1fr)
#align(center)[
  #text(size: 9pt, fill: secondary)[Daily Sparks Academic Growth Engine | growth-edtech.com]
]
  `.trim();
}

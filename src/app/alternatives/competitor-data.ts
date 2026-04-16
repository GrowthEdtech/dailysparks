export type CompetitorData = {
  slug: string;
  name: string;
  shortDescription: string;
  pros: string[];
  cons: string[];
  vsDailySparks: string;
  targetAudience: string;
  keyDifference: string;
};

export const competitors: Record<string, CompetitorData> = {
  managebac: {
    slug: "managebac",
    name: "ManageBac",
    shortDescription: "The leading planning, assessment, and reporting platform for IB World Schools.",
    pros: [
      "Official partner for IB curriculum",
      "Comprehensive school management features",
      "Wide adoption across IB schools"
    ],
    cons: [
      "Complex dashboard for students",
      "Focused on admin and grading, not daily reading habits",
      "Heavy overhead for simple daily tasks"
    ],
    vsDailySparks: "While ManageBac is excellent for school administration and grading, Daily Sparks is a specialized 'Daily Habit' tool. We don't replace ManageBac; we complement it by ensuring the reading and reflection actually happens daily in a low-friction environment like Goodnotes or Notion.",
    targetAudience: "School administrators and teachers (for school management).",
    keyDifference: "Daily Sparks is a student-first delivery tool; ManageBac is a school-first admin tool."
  },
  kognity: {
    slug: "kognity",
    name: "Kognity",
    shortDescription: "An intelligent textbook platform for IB DP and MYP.",
    pros: [
      "Complete digital textbooks for IB subjects",
      "Interactive questions and practice",
      "Teacher-assigned tasks and tracking"
    ],
    cons: [
      "Another screen-heavy platform for students",
      "Can feel like 'more school work' rather than a calm habit",
      "Textbook focus can be overwhelming for daily current event bridges"
    ],
    vsDailySparks: "Kognity is your digital library; Daily Sparks is your daily personal trainer. Kognity provides the deep theory, while Daily Sparks brings the 'Inquiry' (MYP) and 'Argument' (DP) skills to life using daily, fresh, programme-aligned content delivered to tools students already use.",
    targetAudience: "Schools looking for digital textbook replacements.",
    keyDifference: "Library vs. Routine. Kognity is for subject study; Daily Sparks is for building the global perspective reading habit."
  },
  toddle: {
    slug: "toddle",
    name: "Toddle",
    shortDescription: "A collaborative learning platform for IB schools.",
    pros: [
      "Beautiful user interface",
      "Strong support for PYP and MYP inquiry",
      "Integrated planning and portfolio tools"
    ],
    cons: [
      "Closed ecosystem",
      "Requires school-wide adoption",
      "Portfolios can become 'compliance tasks' rather than personal archives"
    ],
    vsDailySparks: "Toddle is a fantastic workspace for school-led inquiry. Daily Sparks offers a family-led alternative that ensures reading becomes an independent habit, archiving thoughts in a personal Notion space that the student owns forever, rather than leaving them in a school-managed platform.",
    targetAudience: "Progressive IB schools.",
    keyDifference: "School-managed vs. Family-owned. Daily Sparks focuses on the student's personal long-term digital garden."
  },
  "century-tech": {
    slug: "century-tech",
    name: "Century Tech",
    shortDescription: "AI-powered learning platform using neuroscience and data science.",
    pros: [
      "Personalized learning pathways",
      "Strong data analytics for teachers",
      "Covers broad curriculum areas"
    ],
    cons: [
      "Metric-driven, which can be stressful for some students",
      "Focus on 'nuggets' rather than long-form deep reading",
      "Gamified approach may not translate to academic reading maturity"
    ],
    vsDailySparks: "Century Tech is highly effective for diagnostic gaps in core subjects. Daily Sparks, however, solves for the 'Habit Gap'. We focus on the calm, daily rhythm of reading and handwriting (Goodnotes), which builds the stamina required for higher-level IB assessments that AI-nugget learning often skips.",
    targetAudience: "Schools focused on data-driven intervention.",
    keyDifference: "Efficiency vs. Stamina. Century Tech is for gap-filling; Daily Sparks is for building academic reading stamina."
  }
};

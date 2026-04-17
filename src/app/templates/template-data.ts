export type TemplateFeature = {
  title: string;
  included: boolean;
};

export type TemplateTier = "free" | "paid";

export type TemplateRecord = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  tier: TemplateTier;
  price: string | null;
  gumroadUrl: string | null;
  platform: "notion" | "goodnotes";
  programme: "DP" | "MYP" | "Both";
  features: TemplateFeature[];
  faq: { question: string; answer: string }[];
};

export const TEMPLATE_DATA: Record<string, TemplateRecord> = {
  "ib-dp-study-dashboard-lite": {
    slug: "ib-dp-study-dashboard-lite",
    name: "IB DP Study Dashboard Lite",
    tagline: "Your 6-subject command center — free, forever.",
    description:
      "A clean, minimal Notion dashboard built by IB curriculum experts. Track your 6 DP subjects, manage deadlines, and count down to exams — all in one workspace. Import in 5 minutes and start using it today.",
    tier: "free",
    price: null,
    gumroadUrl: null,
    platform: "notion",
    programme: "DP",
    features: [
      { title: "Dashboard homepage with 6-subject overview", included: true },
      { title: "Pre-filled IB 6 subject groups (HL/SL tags)", included: true },
      { title: "Assignment tracker with priority & deadline filters", included: true },
      { title: "Exam countdown (May / November session)", included: true },
      { title: "Daily Sparks reading integration", included: true },
      { title: "Extended Essay (EE) Hub", included: false },
      { title: "TOK Exhibition & Essay Workspace", included: false },
      { title: "CAS Portfolio & Reflection Log", included: false },
      { title: "IB Weighted Grade Calculator", included: false },
      { title: "IA Milestone Tracker (all subjects)", included: false },
      { title: "2-Year IB Timeline", included: false },
      { title: "University Application Tracker", included: false },
    ],
    faq: [
      {
        question: "Is this really free?",
        answer:
          "Yes. The Lite dashboard is completely free with no hidden costs. You can optionally tip on Gumroad if you find it useful.",
      },
      {
        question: "How do I import it into Notion?",
        answer:
          "After downloading, you will receive a Notion template link. Click it, choose your workspace, and the dashboard is ready in under 5 minutes.",
      },
      {
        question: "Can I upgrade to the Complete System later?",
        answer:
          "Absolutely. The Complete System includes everything in Lite plus EE, TOK, CAS, grade calculator, and more. Your existing data stays intact.",
      },
    ],
  },
  "ib-dp-complete-system": {
    slug: "ib-dp-complete-system",
    name: "IB DP Complete System",
    tagline: "Your entire two-year IB journey — one Notion workspace.",
    description:
      "The most comprehensive IB DP Notion template available. Manage your Extended Essay, TOK Exhibition, CAS Portfolio, Internal Assessments, grades, and university applications from Day 1 to Final Exam. Built by IB curriculum experts at Daily Sparks.",
    tier: "paid",
    price: "$16.99",
    gumroadUrl: null,
    platform: "notion",
    programme: "DP",
    features: [
      { title: "Enhanced Command Center with weekly focus", included: true },
      { title: "Pre-filled IB 6 subject groups (HL/SL tags)", included: true },
      { title: "Assignment tracker with priority & deadline filters", included: true },
      { title: "Exam countdown (May / November session)", included: true },
      { title: "Daily Sparks Reading Log integration", included: true },
      { title: "Extended Essay (EE) Hub with RPPF tracker", included: true },
      { title: "TOK Exhibition & Essay Workspace", included: true },
      { title: "CAS Portfolio with 7 Learning Outcomes", included: true },
      { title: "IB Weighted Grade Calculator", included: true },
      { title: "IA Milestone Tracker (all subjects)", included: true },
      { title: "2-Year IB Timeline", included: true },
      { title: "University Application Tracker", included: true },
    ],
    faq: [
      {
        question: "What makes this different from free IB templates?",
        answer:
          "This template is built by IB curriculum experts, not hobbyists. Every database is pre-structured with IB-specific fields (e.g., CAS Learning Outcomes, EE RPPF stages, TOK Exhibition prompts) so you spend zero time setting up.",
      },
      {
        question: "Will I receive updates?",
        answer:
          "Yes. Daily Sparks subscribers receive Monthly Template Drops — new mini-templates added to the system each month (e.g., midterm revision planner, IA writing organizer).",
      },
      {
        question: "Can I share it with my study group?",
        answer:
          "The license is for personal use. Each student should have their own copy to track individual progress accurately.",
      },
    ],
  },
};

export function getAllTemplates(): TemplateRecord[] {
  return Object.values(TEMPLATE_DATA);
}

export function getTemplateBySlug(slug: string): TemplateRecord | null {
  return TEMPLATE_DATA[slug] ?? null;
}

export function getAllTemplateSlugs(): string[] {
  return Object.keys(TEMPLATE_DATA);
}

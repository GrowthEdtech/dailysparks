export type IBSubject = {
  slug: string;
  name: string;
  programme: "DP" | "MYP";
  focus: string;
  exampleTitle: string;
  description: string;
  benefits: {
    title: string;
    description: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
};

export const SUBJECT_DATA: Record<string, IBSubject> = {
  "ib-dp-economics": {
    slug: "ib-dp-economics",
    name: "IB DP Economics",
    programme: "DP",
    focus: "Real-world claim building and contemporary case studies.",
    exampleTitle: "How Carbon Taxes in the EU shifted Elasticity Claims",
    description: "IB Economics students often struggle to find current, specific examples for their Paper 2 and Internal Assessments. Daily Sparks feeds them exactly what they need: real-world data wrapped in economic framing.",
    benefits: [
      {
        title: "Micro/Macro Links",
        description: "Every brief identifies which syllabus sections are triggered, from demand elasticities to global Trade barriers."
      },
      {
        title: "Claim & Counter-Claim",
        description: "We don't just provide news. We provide the economic argument structure that scores 7s."
      }
    ],
    faq: [
      {
        question: "Can I use these for my Economics IA?",
        answer: "Absolutely. These briefs act as primary-source markers, helping you find the specific articles and data required for a high-scoring IA."
      }
    ]
  },
  "ib-dp-biology": {
    slug: "ib-dp-biology",
    name: "IB DP Biology",
    programme: "DP",
    focus: "Contextualizing molecular biology within global health and environmental triggers.",
    exampleTitle: "CRISPR Breakthroughs in Coral Resilience: A Case Study",
    description: "Biology is more than memorizing diagrams. It's understanding how biological concepts play out in the 21st century. Our briefs connect syllabus points to real-world breakthroughs.",
    benefits: [
      {
        title: "Terminology in Context",
        description: "Read about enzyme behavior and DNA replication through the lens of current biotech startups."
      },
      {
        title: "Data Interpretation",
        description: "Practice looking at real health data and environmental trends before you face the exam Paper 3."
      }
    ],
    faq: [
      {
        question: "Is this for SL or HL?",
        answer: "Both. We highlight the core concepts that overlap, while providing deeper dives for HL students interested in research."
      }
    ]
  },
  "ib-dp-history": {
    slug: "ib-dp-history",
    name: "IB DP History",
    programme: "DP",
    focus: "Historiography and evidence-based argument building.",
    exampleTitle: "Revising the Cold War: New Archival Perspectives from 2024",
    description: "Score higher by using up-to-date historiographical perspectives. Daily Sparks helps History students see the past through the lens of modern discovery and archival release.",
    benefits: [
      {
        title: "Diverse Perspectives",
        description: "We surface non-Western and revisionist historians to give your essays the edge in Paper 2."
      },
      {
        title: "Evidence Limits",
        description: "Tackle OPVL (Origin, Purpose, Value, Limitation) exercises daily with bite-sized historical reports."
      }
    ],
    faq: [
      {
        question: "Does this cover Paper 1 sources?",
        answer: "Yes, we often include source-analysis prompts specifically designed to mirror the Paper 1 experience."
      }
    ]
  },
  "ib-dp-psychology": {
    slug: "ib-dp-psychology",
    name: "IB DP Psychology",
    programme: "DP",
    focus: "The biological, cognitive, and sociocultural levels of analysis in current events.",
    exampleTitle: "The Neuroscience of Social Isolation: Post-Pandemic Data",
    description: "Psychology thrives on research. We deliver current psychological studies and real-world behavioral analysis directly to your Goodnotes, ready for SAQ and ERQ practice.",
    benefits: [
      {
        title: "Critical Thinking",
        description: "Each brief includes an 'Evaluation' section, focusing on methodology and ethical considerations."
      },
      {
        title: "Application to Real Life",
        description: "Connect the 'Multistore Model' or 'Social Identity Theory' to modern social media behavior."
      }
    ],
    faq: [
      {
        question: "Will this help with my Psychology IA?",
        answer: "It will help you find inspiration for your replication studies and understand contemporary research methods."
      }
    ]
  },
  "ib-dp-tok": {
    slug: "ib-dp-tok",
    name: "IB Theory of Knowledge (TOK)",
    programme: "DP",
    focus: "Identifying Knowledge Questions within the news.",
    exampleTitle: "AI Ethics and the Method of Natural Sciences: A TOK Provocation",
    description: "TOK shouldn't be a once-a-week chore. It's a way of seeing the world. Daily Sparks turns the news into a constant stream of Knowledge Questions and prompts.",
    benefits: [
      {
        title: "KQ Generation",
        description: "We provide 3 potential Knowledge Questions for every article, ready for your TOK Exhibition or Essay."
      },
      {
        title: "Knowledge Assets",
        description: "Build a library of 'real-life situations' (RLS) that make your exhibition objects truly unique."
      }
    ],
    faq: [
      {
        question: "Is this for the Exhibition or the Essay?",
        answer: "Both. It helps you find objects for the Exhibition and provides contemporary evidence for the Essay."
      }
    ]
  }
};

import type { Programme } from "./mvp-types";

export type ProgrammeStageSummary = {
  title: string;
  description: string;
  badgeLabel: string;
  selectorLabel: string;
};

export type WeeklyPlanEntry = {
  day: string;
  label: string;
  theme: string;
  note: string;
};

export type WeeklyPlan = {
  title: string;
  description: string;
  weekdays: WeeklyPlanEntry[];
  sunday: Omit<WeeklyPlanEntry, "day">;
};

export function getProgrammeStageSummary(
  programme: Programme,
): ProgrammeStageSummary {
  if (programme === "MYP") {
    return {
      title: "Analysis-led secondary reading",
      description:
        "MYP mode leans into analysis, interdisciplinary thinking, and clearer written response without overwhelming the learner with full academic intensity.",
      badgeLabel: "MYP mode",
      selectorLabel: "Analytical",
    };
  }

  if (programme === "DP") {
    return {
      title: "Argument-led pre-university reading",
      description:
        "DP mode is built around evidence, argument, and reflective synthesis, so each reading feels closer to academic discussion and independent thinking.",
      badgeLabel: "DP mode",
      selectorLabel: "Argument-based",
    };
  }

  return {
    title: "Curiosity-led foundation reading",
    description:
      "PYP mode keeps the rhythm curiosity-led, broad, theme-based, and discussion-friendly so the reading habit feels inviting, connected, and easy to share at home.",
    badgeLabel: "PYP mode",
    selectorLabel: "Theme-based",
  };
}

function getPypPlan(): WeeklyPlan {
  return {
    title: "PYP weekly rhythm",
    description:
      "Daily Sparks rotates through the six PYP transdisciplinary themes in a curiosity-led rhythm that feels broad, connected, and easy to discuss as a family.",
    weekdays: [
      {
        day: "Monday",
        label: "Who we are",
        theme: "Identity, wellbeing, and personal growth",
        note: "A reflective reading to help the week start with self-awareness.",
      },
      {
        day: "Tuesday",
        label: "Where we are in place and time",
        theme: "History, migration, and global context",
        note: "A short brief that links the learner to time, place, and community.",
      },
      {
        day: "Wednesday",
        label: "How we express ourselves",
        theme: "Communication, story, and creativity",
        note: "A reading designed to support expression and response.",
      },
      {
        day: "Thursday",
        label: "How the world works",
        theme: "Science, systems, and natural inquiry",
        note: "A curiosity-led piece around scientific or technical understanding.",
      },
      {
        day: "Friday",
        label: "How we organize ourselves",
        theme: "Society, systems, and collaboration",
        note: "A practical reading about how people build structures together.",
      },
      {
        day: "Saturday",
        label: "Sharing the planet",
        theme: "Environment, responsibility, and empathy",
        note: "A wider-world brief with ethical or ecological perspective.",
      },
    ],
    sunday: {
      label: "Sunday Special",
      theme: "Family discussion and reflection reading",
      note: "A slower, discussion-friendly piece designed for weekend conversation.",
    },
  };
}

function getMypPlan(): WeeklyPlan {
  return {
    title: "MYP weekly rhythm",
    description:
      "Daily Sparks builds an analysis-led secondary-school rhythm with structured reading across subjects, perspectives, and transferable thinking habits.",
    weekdays: [
      {
        day: "Monday",
        label: "Language and literature",
        theme: "Close reading and response",
        note: "Start the week with interpretation, evidence, and strong expression.",
      },
      {
        day: "Tuesday",
        label: "Sciences",
        theme: "Discovery and explanation",
        note: "A science-led reading that builds clarity and analytical writing.",
      },
      {
        day: "Wednesday",
        label: "Mathematics",
        theme: "Patterns, models, and reasoning",
        note: "A mathematically framed article focused on logic and structure.",
      },
      {
        day: "Thursday",
        label: "Individuals and societies",
        theme: "Systems, history, and global issues",
        note: "A reading that asks the learner to connect events and perspectives.",
      },
      {
        day: "Friday",
        label: "Design and creative inquiry",
        theme: "Problem-solving and innovation",
        note: "A productized mix of design thinking, arts, and applied creativity.",
      },
      {
        day: "Saturday",
        label: "Wellness and interdisciplinary extension",
        theme: "Healthy living and cross-subject synthesis",
        note: "A broader reading that links learning habits, wellbeing, and transfer.",
      },
    ],
    sunday: {
      label: "Sunday Special",
      theme: "Deep-dive reading and discussion prompt",
      note: "A longer weekend brief that encourages slower reading and reflection.",
    },
  };
}

function getDpPlan(): WeeklyPlan {
  return {
    title: "DP weekly rhythm",
    description:
      "Daily Sparks shifts into an argument-led pre-university pattern with more evidence, reflection, and discipline-specific reading depth.",
    weekdays: [
      {
        day: "Monday",
        label: "Studies in language and literature",
        theme: "Argument, style, and interpretation",
        note: "A reading that sharpens textual analysis and authorial awareness.",
      },
      {
        day: "Tuesday",
        label: "Language acquisition",
        theme: "Meaning across languages and cultures",
        note: "A cross-cultural reading that builds nuance and precision.",
      },
      {
        day: "Wednesday",
        label: "Individuals and societies",
        theme: "Debate, perspective, and evidence",
        note: "A humanities brief oriented around argument and evaluation.",
      },
      {
        day: "Thursday",
        label: "Sciences",
        theme: "Mechanism, evidence, and explanation",
        note: "A deeper scientific reading that rewards disciplined note-taking.",
      },
      {
        day: "Friday",
        label: "Mathematics",
        theme: "Quantitative thinking and models",
        note: "A logic-heavy reading that links numbers to interpretation.",
      },
      {
        day: "Saturday",
        label: "Arts or elective exploration",
        theme: "Creative interpretation and wider perspective",
        note: "A flexible weekend brief for breadth and intellectual range.",
      },
    ],
    sunday: {
      label: "Sunday Special",
      theme: "TOK or extended reading special",
      note: "A slower, more demanding reading designed for reflection and synthesis.",
    },
  };
}

export function getWeeklyPlan(programme: Programme, programmeYear: number) {
  void programmeYear;

  if (programme === "MYP") {
    return getMypPlan();
  }

  if (programme === "DP") {
    return getDpPlan();
  }

  return getPypPlan();
}

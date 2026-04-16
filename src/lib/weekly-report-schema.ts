import type { Programme } from "./mvp-types";

export type WeeklyProgressReportTheme = {
  theme: string;
  relevance: string;
};

export type WeeklyProgressReportInteractionStats = {
  totalBriefsSent: number;
  totalChallengesFound: number;
  completedChallenges: number;
  interactionRate: number;
};

export type WeeklyProgressReportContent = {
  executiveSummary: string;
  conceptMastery: string[];
  vocabularyHighlights: { term: string; context: string }[];
  thinkingSkillsGrowth: string;
  weekendDiscussionPrompts: string[];
};

export type WeeklyProgressReportRecord = {
  id: string;
  parentId: string;
  parentEmail: string;
  studentId: string;
  studentName: string;
  programme: Programme;
  weekKey: string; // e.g. "2024-W16"
  weekRangeLabel: string; // e.g. "Apr 15 - Apr 21"
  interactionStats: WeeklyProgressReportInteractionStats;
  reportContent: WeeklyProgressReportContent;
  deliveredAt: string | null;
  status: "generated" | "delivered" | "failed";
  createdAt: string;
  updatedAt: string;
};

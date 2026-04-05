import type { ParentProfile } from "./mvp-types";
import { getProgrammeStageSummary, getWeeklyPlan } from "./weekly-plan";

export type GoodnotesWelcomeNote = {
  eyebrow: string;
  title: string;
  intro: string;
  confirmationTitle: string;
  confirmationBody: string;
  detailLines: string[];
  expectationsTitle: string;
  expectationsBody: string;
  weeklyRhythmTitle: string;
  weeklyRhythmBody: string;
  nextStepsTitle: string;
  nextSteps: string[];
  signature: string;
};

export function buildGoodnotesWelcomeNote(
  profile: ParentProfile,
): GoodnotesWelcomeNote {
  const stageSummary = getProgrammeStageSummary(profile.student.programme);
  const weeklyPlan = getWeeklyPlan(
    profile.student.programme,
    profile.student.programmeYear,
  );

  return {
    eyebrow: "Growth Education Limited",
    title: "Welcome to Daily Sparks",
    intro: `Hello ${profile.parent.fullName}, your Goodnotes destination is confirmed and ready for delivery. From your first Daily Sparks packet onward, each reading brief will arrive directly in ${profile.student.studentName}'s Goodnotes flow.`,
    confirmationTitle: "Goodnotes destination confirmed",
    confirmationBody:
      "Daily Sparks is now ready to place each reading brief into your family's Goodnotes rhythm with calm, dependable delivery.",
    detailLines: [
      `Programme: ${profile.student.programme} Year ${profile.student.programmeYear}`,
      `Goodnotes destination: ${profile.student.goodnotesEmail}`,
      `Prepared for: ${profile.student.studentName}`,
    ],
    expectationsTitle: "What to expect",
    expectationsBody: stageSummary.description,
    weeklyRhythmTitle: "Reading rhythm",
    weeklyRhythmBody: weeklyPlan.description,
    nextStepsTitle: "Your next steps",
    nextSteps: [
      "Watch for your first Daily Sparks brief to arrive in this Goodnotes destination.",
      "Use each packet as a calm reading moment, with space for parent-child discussion after the story.",
      "If your setup changes, you can update this destination from the dashboard at any time.",
    ],
    signature: "Growth Education Limited",
  };
}

import type { ParentProfile } from "./mvp-types";
import { getDailyBriefProgrammeWelcomeFocus } from "./daily-brief-product-policy";
import { getProgrammeStageSummary, getWeeklyPlan } from "./weekly-plan";

export type GoodnotesWelcomeNote = {
  eyebrow: string;
  title: string;
  intro: string;
  confirmationTitle: string;
  confirmationBody: string;
  detailLines: string[];
  programmeBadge: string;
  focusTitle: string;
  focusBody: string;
  focusPoints: string[];
  focusTone: "bridge" | "academic" | "legacy";
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
  const focus = getDailyBriefProgrammeWelcomeFocus(profile.student.programme);
  const weeklyPlan = getWeeklyPlan(
    profile.student.programme,
    profile.student.programmeYear,
  );
  const expectationsBody = profile.student.programme === "DP"
    ? "DP packets help students read for argument, evidence, and reflective academic thinking."
    : profile.student.programme === "MYP"
      ? "MYP packets help students read with context, comparison, and structured reflection."
      : stageSummary.description;
  const weeklyRhythmBody = profile.student.programme === "DP"
    ? "Weekdays build argument-led reading. TOK day widens the week through ethics and knowledge questions."
    : profile.student.programme === "MYP"
      ? "Weekdays build structured reading. Vision day widens the week through global context and curiosity."
      : `${weeklyPlan.description} ${weeklyPlan.sunday.label} keeps the week anchored in ${weeklyPlan.sunday.theme.toLowerCase()}.`;
  const nextSteps = profile.student.programme === "DP"
    ? [
        "Watch for your first Daily Sparks brief to arrive in this Goodnotes destination.",
        "After reading, save one claim, counterpoint, or TOK idea.",
        "If your setup changes, you can update this destination from the dashboard at any time.",
      ]
    : [
        "Watch for your first Daily Sparks brief to arrive in this Goodnotes destination.",
        "After reading, save one context or compare-connect idea.",
        "If your setup changes, you can update this destination from the dashboard at any time.",
      ];

  return {
    eyebrow: "Growth Education Limited",
    title: "Welcome to Daily Sparks",
    intro: `Hello ${profile.parent.fullName}, your Goodnotes destination is confirmed and ready for delivery. Starting with your first Daily Sparks packet, each reading brief will arrive directly in ${profile.student.studentName}'s Goodnotes flow.`,
    confirmationTitle: "Setup confirmed",
    confirmationBody:
      "Daily Sparks is now ready to place each reading brief into your family's Goodnotes rhythm with calm, dependable delivery.",
    detailLines: [
      `Programme: ${profile.student.programme} Year ${profile.student.programmeYear}`,
      `Goodnotes destination: ${profile.student.goodnotesEmail}`,
      `Prepared for: ${profile.student.studentName}`,
    ],
    programmeBadge: focus.programmeBadge,
    focusTitle: focus.focusTitle,
    focusBody: focus.focusBody,
    focusPoints: focus.focusPoints,
    focusTone: focus.focusTone,
    expectationsTitle: "What to expect",
    expectationsBody,
    weeklyRhythmTitle: "Weekly rhythm",
    weeklyRhythmBody,
    nextStepsTitle: "Your next steps",
    nextSteps,
    signature: "Growth Education Limited",
  };
}

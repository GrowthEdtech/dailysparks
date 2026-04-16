import type { Programme } from "./mvp-types";

export type GuideTarget = {
  slug: string;
  programme: Programme;
  subject: string;
  focusKeyword: string;
  metaTitle: string;
  metaDescription: string;
};

const GUIDE_DEFINITIONS: GuideTarget[] = [
  {
    slug: "ib-english-a-analysis-support",
    programme: "DP",
    subject: "English A",
    focusKeyword: "IB English A Analysis Support",
    metaTitle: "Mastering Literature Analysis | Daily Sparks IB Support",
    metaDescription: "Build a daily habit of deconstructing literary claims and counter-claims for IB English A."
  },
  {
    slug: "myp-humanities-global-contexts",
    programme: "MYP",
    subject: "Individuals and Societies",
    focusKeyword: "MYP Global Contexts Reading",
    metaTitle: "Connecting Current Events to MYP Contexts | Daily Sparks",
    metaDescription: "Help your child bridge daily reading with MYP Global Contexts and Inquiry Questions."
  }
];

export function listGuideTargets(): GuideTarget[] {
  return GUIDE_DEFINITIONS;
}

export function getGuideTargetBySlug(slug: string): GuideTarget | null {
  return GUIDE_DEFINITIONS.find(t => t.slug === slug) ?? null;
}

// TODO: Implement generateGuidePageProps for dynamic route injection

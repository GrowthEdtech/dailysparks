import type { Metadata } from "next";

import {
  InformationalPageShell,
  InfoSection,
} from "../informational-page-shell";

export const metadata: Metadata = {
  title: "About Daily Sparks",
  description:
    "Learn what Daily Sparks is for, how it fits into family reading routines, and why it pairs Goodnotes with Notion.",
};

export default function AboutPage() {
  return (
    <InformationalPageShell
      eyebrow="About"
      title="About Daily Sparks"
      intro="Daily Sparks helps families turn daily reading into a repeatable academic habit. The product is designed to feel calmer than a typical learning app: direct student delivery, clean parent visibility, and less fragmentation across tools."
      lastUpdated="April 2, 2026"
    >
      <InfoSection title="Built for IB families">
        <p>
          Daily Sparks is designed for parents who want structured, age-appropriate
          reading support without handing a child an endlessly distracting app
          experience. The goal is simple: make strong reading, reflection, and
          follow-through feel normal at home.
        </p>
      </InfoSection>

      <InfoSection title="How the workflow is designed">
        <p>
          We focus on one dependable loop: prepare the reading brief, deliver it
          where the student actually reads, and preserve a searchable family
          record. That is why the product emphasizes Goodnotes for direct student
          delivery and Notion for parent-facing archiving.
        </p>
        <p>
          Instead of forcing families into a brand-new ecosystem, Daily Sparks
          works with the tools they already trust.
        </p>
      </InfoSection>

      <InfoSection title="What we care about">
        <p>
          We care about clarity, consistency, and family visibility. That means
          fewer noisy dashboards, fewer tabs to manage, and a cleaner handoff
          between student reading time and parent oversight.
        </p>
        <p>
          Daily Sparks is part of the broader geledtech.com product work focused
          on practical education workflows that are easier to maintain in real
          family routines.
        </p>
      </InfoSection>
    </InformationalPageShell>
  );
}

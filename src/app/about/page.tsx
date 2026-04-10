import type { Metadata } from "next";
import Link from "next/link";

import {
  InformationalPageShell,
  InfoSection,
} from "../informational-page-shell";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn how Daily Sparks supports IB MYP and DP family reading routines with Goodnotes delivery, Notion archive, and calmer academic habits.",
  alternates: {
    canonical: "/about",
  },
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

      <InfoSection title="Explore the programme guides">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              href: "/ib-myp-reading-support",
              title: "IB MYP Reading Support",
              detail:
                "See how MYP bridge reading, global context, and inquiry prompts fit together.",
            },
            {
              href: "/ib-dp-reading-and-writing-support",
              title: "IB DP Reading and Writing Support",
              detail:
                "See how DP briefs turn daily reading into academic framing, claim, and TOK-style thinking.",
            },
            {
              href: "/myp-vs-dp-reading-model",
              title: "MYP vs DP Reading Model",
              detail:
                "Compare inquiry-driven MYP reading with argument-driven DP reading in one view.",
            },
            {
              href: "/ib-parent-starter-kit",
              title: "IB Parent Starter Kit",
              detail:
                "Get the calm first-step guide for choosing the right path before starting a trial.",
            },
          ].map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)] transition-transform hover:-translate-y-0.5"
            >
              <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0f172a]">
                {guide.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {guide.detail}
              </p>
            </Link>
          ))}
        </div>
      </InfoSection>
    </InformationalPageShell>
  );
}

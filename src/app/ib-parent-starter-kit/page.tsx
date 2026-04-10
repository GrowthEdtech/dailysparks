import type { Metadata } from "next";
import Link from "next/link";

import { InformationalPageShell, InfoSection } from "../informational-page-shell";
import { siteUrl } from "../site-config";
import StarterKitForm from "./starter-kit-form";

export const metadata: Metadata = {
  title: "IB Parent Starter Kit",
  description:
    "Get the Daily Sparks IB Parent Starter Kit to compare MYP and DP reading support, setup Goodnotes and Notion, and choose the calmest first step.",
  alternates: {
    canonical: "/ib-parent-starter-kit",
  },
  openGraph: {
    title: "IB Parent Starter Kit",
    description:
      "Get the Daily Sparks IB Parent Starter Kit to compare MYP and DP reading support, setup Goodnotes and Notion, and choose the calmest first step.",
    url: `${siteUrl}/ib-parent-starter-kit`,
    siteName: "Daily Sparks",
    type: "article",
  },
};

const starterKitSections = [
  {
    title: "Choose the right reading model",
    detail:
      "See how MYP bridge reading differs from DP academic framing, so your family starts with the right expectation and workload.",
  },
  {
    title: "Pick the first setup that matters",
    detail:
      "Understand what Goodnotes, Notion, notebook capture, and weekly recap each do so setup feels less noisy.",
  },
  {
    title: "Move into trial with less friction",
    detail:
      "Use the starter kit to decide whether to start the trial now or review the public guides first.",
  },
] as const;

export default function IbParentStarterKitPage() {
  return (
    <InformationalPageShell
      eyebrow="Parent Starter Kit"
      title="IB Parent Starter Kit"
      intro="This starter kit is built for IB parents comparing Daily Sparks for the first time. It explains the MYP and DP reading model, the Goodnotes and Notion workflow, and the fastest path to first value."
      lastUpdated="April 10, 2026"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-8">
          <InfoSection title="What is inside">
            <div className="grid gap-4">
              {starterKitSections.map((section) => (
                <div
                  key={section.title}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.24)]"
                >
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0f172a]">
                    {section.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {section.detail}
                  </p>
                </div>
              ))}
            </div>
          </InfoSection>

          <InfoSection title="What parents usually decide next">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  href: "/ib-myp-reading-support",
                  title: "Open the MYP guide",
                  detail: "Best if your child still needs bridge reading, inquiry prompts, and global context support.",
                },
                {
                  href: "/ib-dp-reading-and-writing-support",
                  title: "Open the DP guide",
                  detail: "Best if your child needs claim, counterpoint, evidence limits, and TOK-style framing.",
                },
                {
                  href: "/myp-vs-dp-reading-model",
                  title: "Compare both stages",
                  detail: "Best if your family is still choosing between the MYP and DP reading path.",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)] transition-transform hover:-translate-y-0.5"
                >
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0f172a]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {item.detail}
                  </p>
                </Link>
              ))}
            </div>
          </InfoSection>
        </div>

        <StarterKitForm />
      </div>
    </InformationalPageShell>
  );
}

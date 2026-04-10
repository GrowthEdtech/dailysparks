import type { Metadata } from "next";
import Link from "next/link";

import {
  InformationalPageShell,
  InfoSection,
} from "../informational-page-shell";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Daily Sparks for support with IB reading setup, Goodnotes delivery, Notion sync, billing, privacy, or partnerships.",
  alternates: {
    canonical: "/contact",
  },
};

const contactTopics = [
  {
    title: "Support",
    detail:
      "Questions about setup, dashboard access, Goodnotes delivery, or Notion syncing.",
  },
  {
    title: "Billing",
    detail:
      "Help with subscriptions, renewals, checkout, plan changes, or cancellation questions.",
  },
  {
    title: "Privacy",
    detail:
      "Requests related to personal data, account information, or integration cleanup.",
  },
  {
    title: "Partnerships",
    detail:
      "School, programme, or family-office conversations about how Daily Sparks may fit your workflow.",
  },
] as const;

export default function ContactPage() {
  return (
    <InformationalPageShell
      eyebrow="Contact"
      title="Contact Daily Sparks"
      intro="If you need help with your account, delivery setup, billing, or privacy questions, email us and include enough detail for us to trace the issue quickly."
      lastUpdated="April 2, 2026"
    >
      <InfoSection title="How to reach us">
        <p>
          Email{" "}
          <a
            href="mailto:info@geledtech.com"
            className="font-semibold text-[#0f172a] underline decoration-[#fbbf24] underline-offset-4"
          >
            info@geledtech.com
          </a>{" "}
          for all Daily Sparks enquiries.
        </p>
        <p>
          For faster support, include the parent email on the account, the child
          programme, the page or feature you were using, and any relevant error
          message or screenshot.
        </p>
      </InfoSection>

      <InfoSection title="What we can help with">
        <div className="grid gap-4 md:grid-cols-2">
          {contactTopics.map((topic) => (
            <div
              key={topic.title}
              className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.34)]"
            >
              <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0f172a]">
                {topic.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {topic.detail}
              </p>
            </div>
          ))}
        </div>
      </InfoSection>

      <InfoSection title="Before you email">
        <p>
          If your question is about delivery or syncing, please mention whether
          you are using Goodnotes, Notion, or both. That helps us narrow the
          investigation path immediately.
        </p>
        <p>
          If your question is about privacy or data removal, please clearly state
          the request and the account email involved so we can handle it safely.
        </p>
      </InfoSection>

      <InfoSection title="Helpful setup guides">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              href: "/goodnotes-workflow-for-ib-students",
              title: "Goodnotes Workflow for IB Students",
              detail:
                "Read how direct student delivery fits a calmer handwriting-friendly routine.",
            },
            {
              href: "/notion-archive-for-ib-families",
              title: "Notion Archive for IB Families",
              detail:
                "See how families keep briefs, notebook entries, and weekly recaps searchable.",
            },
            {
              href: "/myp-vs-dp-reading-model",
              title: "MYP vs DP Reading Model",
              detail:
                "Compare the stage-specific learning loops before asking for setup help.",
            },
            {
              href: "/ib-parent-starter-kit",
              title: "IB Parent Starter Kit",
              detail:
                "Get the calm setup guide if you are still deciding how to start the family workflow.",
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

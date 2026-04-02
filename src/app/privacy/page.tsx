import type { Metadata } from "next";

import {
  InformationalPageShell,
  InfoSection,
} from "../informational-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Daily Sparks",
  description:
    "How Daily Sparks handles family account data, student profile details, integrations, and support requests.",
};

export default function PrivacyPage() {
  return (
    <InformationalPageShell
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="Daily Sparks is built for parents who want a calm, accountable reading workflow. This page explains what information we collect, why we use it, and how families can manage the data connected to their account."
      lastUpdated="April 2, 2026"
    >
      <InfoSection title="What we collect">
        <p>
          We collect the information needed to run the service responsibly:
          parent account details such as name and email address, student profile
          inputs such as programme and delivery preferences, integration details
          required for Goodnotes or Notion setup, billing records needed to
          manage subscriptions, and support messages you send us directly.
        </p>
        <p>
          We also collect limited technical information such as log data,
          request metadata, and service diagnostics so we can investigate
          delivery issues, secure accounts, and keep the app working reliably.
        </p>
      </InfoSection>

      <InfoSection title="How we use your data">
        <p>
          We use your information to authenticate parents, save family setup
          choices, deliver reading briefs into Goodnotes, create archive records
          in Notion, process subscriptions, respond to support questions, and
          improve the reliability of the product.
        </p>
        <p>
          We do not sell your personal information. We use data only for
          operating, protecting, and improving the Daily Sparks service.
        </p>
      </InfoSection>

      <InfoSection title="Third-party services">
        <p>
          Daily Sparks relies on trusted infrastructure and workflow providers,
          including Firebase Authentication for sign-in, Stripe for subscription
          billing, Notion for optional family archive syncing, and email-based
          delivery tooling for Goodnotes destination inboxes. These providers
          process the minimum data required for their part of the workflow.
        </p>
        <p>
          If you connect a third-party tool, the data shared with that provider
          is governed both by this policy and by that provider&apos;s own terms and
          privacy practices.
        </p>
      </InfoSection>

      <InfoSection title="Parent controls and retention">
        <p>
          Parents can update account details, disconnect integrations, and
          change delivery preferences from the product workflow. If you want us
          to review or remove account-linked information, contact{" "}
          <a
            href="mailto:info@geledtech.com"
            className="font-semibold text-[#0f172a] underline decoration-[#fbbf24] underline-offset-4"
          >
            info@geledtech.com
          </a>
          .
        </p>
        <p>
          We keep data only as long as needed to operate the service, maintain
          billing records, resolve support issues, and meet legal or security
          obligations.
        </p>
      </InfoSection>
    </InformationalPageShell>
  );
}

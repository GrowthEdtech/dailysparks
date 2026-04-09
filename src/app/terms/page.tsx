import type { Metadata } from "next";

import {
  InformationalPageShell,
  InfoSection,
} from "../informational-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing access to Daily Sparks, including account use, subscriptions, integrations, and acceptable use.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <InformationalPageShell
      eyebrow="Terms"
      title="Terms of Service"
      intro="These terms explain the practical rules for using Daily Sparks. They cover parent accounts, subscriptions, connected tools, and the boundaries of the service."
      lastUpdated="April 2, 2026"
    >
      <InfoSection title="Using Daily Sparks">
        <p>
          Daily Sparks is a parent-facing reading and delivery workflow for IB
          families. You may use the service only in a lawful manner and only
          for managing your own family&apos;s reading setup, archives, and related
          educational workflows.
        </p>
        <p>
          Parents are responsible for the accuracy of the profile information,
          integration destinations, and account choices they provide.
        </p>
      </InfoSection>

      <InfoSection title="Accounts and connected tools">
        <p>
          You are responsible for maintaining control of your sign-in method and
          for any activity that happens under your account. If you connect
          Goodnotes or Notion, you are responsible for ensuring you have the
          authority to use those accounts and destinations.
        </p>
        <p>
          We may suspend or limit access if we detect misuse, security risks, or
          attempts to interfere with the product or connected services.
        </p>
      </InfoSection>

      <InfoSection title="Subscriptions and billing">
        <p>
          Paid features are offered on a subscription basis. Billing is handled
          through Stripe and may renew automatically unless you cancel before
          the next billing cycle. You are responsible for reviewing plan pricing
          and cancellation timing before purchase.
        </p>
        <p>
          We may update pricing, plan packaging, or feature scope over time, but
          material changes will be reflected in the product before new charges
          apply.
        </p>
      </InfoSection>

      <InfoSection title="Content, availability, and limits">
        <p>
          Daily Sparks may update its content model, workflows, UI, and
          integrations as the product evolves. We aim for reliable access, but
          we do not guarantee uninterrupted availability or permanent support
          for every third-party integration.
        </p>
        <p>
          The service is provided for educational workflow support. It is not a
          substitute for school instruction, professional advice, or formal
          academic assessment.
        </p>
      </InfoSection>
    </InformationalPageShell>
  );
}

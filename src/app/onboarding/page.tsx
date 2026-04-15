import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getProfileByEmail } from "../../lib/mvp-store";
import { getSessionFromCookieStore } from "../../lib/session";
import { getActivationFunnelState } from "../../lib/activation-funnel";
import OnboardingWizard from "./onboarding-wizard";

export const metadata: Metadata = {
  title: "Onboarding | Daily Sparks",
  description: "Set up your student reading workflow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnboardingPage() {
  const session = await getSessionFromCookieStore(await cookies());
  const sessionEmail = session?.email ?? null;

  if (!sessionEmail) {
    redirect("/login");
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    redirect("/login");
  }

  const funnel = getActivationFunnelState(profile);

  // If not even paid/trialing yet, they shouldn't be here
  if (!funnel.steps.paid_activated.completed) {
    redirect("/pricing");
  }

  // If already finished onboarding, go to dashboard
  if (funnel.steps.dispatchable_channel_ready.completed) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWizard initialProfile={profile} />
  );
}

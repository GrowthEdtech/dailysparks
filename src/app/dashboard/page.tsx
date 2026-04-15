import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import DashboardForm from "./dashboard-form";
import { getProfileByEmail } from "../../lib/mvp-store";
import { isNotionConfigured } from "../../lib/notion-config";
import { getSessionFromCookieStore } from "../../lib/session";
import { getActivationFunnelState } from "../../lib/activation-funnel";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your Daily Sparks reading workflow and notebook.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
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

  // Mandatory Gateway 1: Payments/Trial Activation
  if (!funnel.steps.paid_activated.completed) {
    redirect("/pricing");
  }

  // Mandatory Gateway 2: Onboarding (Goodnotes Binding)
  if (!funnel.steps.dispatchable_channel_ready.completed) {
    redirect("/onboarding");
  }

  return (
    <DashboardForm
      initialProfile={profile}
      notionConfigured={isNotionConfigured()}
      deferNotebookData={true}
    />
  );
}

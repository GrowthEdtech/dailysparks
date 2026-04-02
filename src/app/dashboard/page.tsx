import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import DashboardForm from "./dashboard-form";
import { isEditorialAdminEmail } from "../../lib/editorial-admin";
import { getProfileByEmail } from "../../lib/mvp-store";
import { isNotionConfigured } from "../../lib/notion-config";
import { getSessionFromCookieStore } from "../../lib/session";

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

  return (
    <DashboardForm
      initialProfile={profile}
      notionConfigured={isNotionConfigured()}
      canAccessEditorialAdmin={isEditorialAdminEmail(sessionEmail)}
    />
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import DashboardForm from "./dashboard-form";
import { getProfileByEmail } from "../../lib/mvp-store";
import { SESSION_COOKIE_NAME } from "../../lib/session";

export default async function DashboardPage() {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME);
  const sessionEmail = sessionCookie?.value
    ? decodeURIComponent(sessionCookie.value)
    : null;

  if (!sessionEmail) {
    redirect("/login");
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    redirect("/login");
  }

  return <DashboardForm initialProfile={profile} />;
}

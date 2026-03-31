import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import SuccessPanel from "./success-panel";
import { getProfileByEmail } from "../../../lib/mvp-store";
import { getSessionFromCookieStore } from "../../../lib/session";

export default async function BillingSuccessPage() {
  const session = await getSessionFromCookieStore(await cookies());

  if (!session?.email) {
    redirect("/login");
  }

  const profile = await getProfileByEmail(session.email);

  if (!profile) {
    redirect("/login");
  }

  return (
    <SuccessPanel
      accountEmail={profile.parent.email}
      accountFullName={profile.parent.fullName}
    />
  );
}

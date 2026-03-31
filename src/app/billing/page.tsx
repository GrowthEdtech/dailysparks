import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import BillingForm from "./billing-form";
import { getProfileByEmail } from "../../lib/mvp-store";
import { getSessionFromCookieStore } from "../../lib/session";

export default async function BillingPage() {
  const session = await getSessionFromCookieStore(await cookies());
  const sessionEmail = session?.email ?? null;

  if (!sessionEmail) {
    redirect("/login");
  }

  const profile = await getProfileByEmail(sessionEmail);

  if (!profile) {
    redirect("/login");
  }

  return <BillingForm initialProfile={profile} />;
}

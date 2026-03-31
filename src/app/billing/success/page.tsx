import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import SuccessPanel from "./success-panel";
import { getSessionFromCookieStore } from "../../../lib/session";

export default async function BillingSuccessPage() {
  const session = await getSessionFromCookieStore(await cookies());

  if (!session?.email) {
    redirect("/login");
  }

  return <SuccessPanel />;
}

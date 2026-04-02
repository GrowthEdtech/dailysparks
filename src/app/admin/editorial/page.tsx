import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import EditorialAdminPanel from "./editorial-admin-panel";
import { isEditorialAdminEmail } from "../../../lib/editorial-admin";
import { DAILY_SPARKS_REPETITION_POLICY } from "../../../lib/editorial-policy";
import { listEditorialSources } from "../../../lib/editorial-source-store";
import { getSessionFromCookieStore } from "../../../lib/session";

export default async function EditorialAdminPage() {
  const session = await getSessionFromCookieStore(await cookies());
  const sessionEmail = session?.email ?? null;

  if (!sessionEmail) {
    redirect("/login");
  }

  if (!isEditorialAdminEmail(sessionEmail)) {
    redirect("/dashboard");
  }

  const sources = await listEditorialSources();

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-8">
      <EditorialAdminPanel
        initialSources={sources}
        repetitionPolicy={DAILY_SPARKS_REPETITION_POLICY}
      />
    </main>
  );
}

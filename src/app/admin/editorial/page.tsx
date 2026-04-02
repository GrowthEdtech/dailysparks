import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AdminLogoutButton from "./admin-logout-button";
import AiConnectionsPanel from "./ai-connections-panel";
import EditorialAdminPanel from "./editorial-admin-panel";
import { listAiConnections } from "../../../lib/ai-connection-store";
import { getEditorialAdminSessionFromCookieStore } from "../../../lib/editorial-admin-auth";
import { DAILY_SPARKS_REPETITION_POLICY } from "../../../lib/editorial-policy";
import { listEditorialSources } from "../../../lib/editorial-source-store";

export default async function EditorialAdminPage() {
  const session = await getEditorialAdminSessionFromCookieStore(await cookies());

  if (!session) {
    redirect("/admin/login");
  }

  const sources = await listEditorialSources();
  const aiConnections = await listAiConnections();

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-8">
      <div className="mx-auto mb-4 flex w-full max-w-6xl justify-end">
        <AdminLogoutButton />
      </div>
      <EditorialAdminPanel
        initialSources={sources}
        repetitionPolicy={DAILY_SPARKS_REPETITION_POLICY}
      />
      <div className="mx-auto mt-6 w-full max-w-6xl">
        <AiConnectionsPanel initialConnections={aiConnections} />
      </div>
    </main>
  );
}

import EditorialAdminPanel from "../editorial-admin-panel";
import { DAILY_SPARKS_REPETITION_POLICY } from "../../../../lib/editorial-policy";
import { listEditorialSources } from "../../../../lib/editorial-source-store";

export default async function EditorialSourcesAdminPage() {
  const sources = await listEditorialSources();

  return (
    <EditorialAdminPanel
      initialSources={sources}
      repetitionPolicy={DAILY_SPARKS_REPETITION_POLICY}
    />
  );
}

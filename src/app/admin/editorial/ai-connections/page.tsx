import AiConnectionsPanel from "../ai-connections-panel";
import { listAiConnectionsWithOpsSummary } from "../../../../lib/ai-connection-store";

export default async function EditorialAiConnectionsPage() {
  const aiConnections = await listAiConnectionsWithOpsSummary();

  return <AiConnectionsPanel initialConnections={aiConnections} />;
}

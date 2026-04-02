import AiConnectionsPanel from "../ai-connections-panel";
import { listAiConnections } from "../../../../lib/ai-connection-store";

export default async function EditorialAiConnectionsPage() {
  const aiConnections = await listAiConnections();

  return <AiConnectionsPanel initialConnections={aiConnections} />;
}

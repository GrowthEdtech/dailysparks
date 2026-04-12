import { readOperationsHealthDashboardData } from "../../../../lib/operations-health-dashboard-data";
import OperationsHealthPanel from "./operations-health-panel";

export default async function OperationsHealthAdminPage() {
  const { snapshot, runs } = await readOperationsHealthDashboardData();

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <OperationsHealthPanel initialSnapshot={snapshot} initialRuns={runs} />
    </section>
  );
}

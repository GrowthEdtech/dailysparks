import { listDailyBriefHistory } from "../../../../lib/daily-brief-history-store";
import CurationPanel from "./curation-panel";

export const metadata = {
  title: "Curation - Editorial Admin",
};

export default async function CurationPage() {
  const allHistory = await listDailyBriefHistory();
  
  // We filter to include 'draft' status briefs (awaiting approval)
  // or briefs in 'generated' pipeline stage that might not be explicitly 'draft'
  const pendingDrafts = allHistory.filter(
    (entry) => entry.status === "draft"
  );

  return (
    <section>
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
            Curation Staging
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
            Review and approve AI-generated Daily Briefs.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            This queue holds briefs that have been successfully generated but await human review. 
            You can verify their Lexile tone, modify the Markdown payload directly, 
            and either approve them to continue the delivery pipeline, or reject them.
          </p>
        </div>
      </div>

      <CurationPanel drafts={pendingDrafts} />
    </section>
  );
}

import { listMarketingLeads } from "../../../../lib/marketing-lead-store";
import { listMarketingReferralInvites } from "../../../../lib/marketing-referral-store";
import { buildMarketingReportingSummary } from "../../../../lib/marketing-reporting";
import { listParentProfiles } from "../../../../lib/mvp-store";
import { listDailyBriefNotebookEntries } from "../../../../lib/daily-brief-notebook-store";
import { listDailyBriefNotebookWeeklyRecaps } from "../../../../lib/daily-brief-notebook-weekly-recap-store";

function formatStageInterest(stageInterest: string) {
  return stageInterest === "NOT_SURE" ? "Not sure yet" : stageInterest;
}

function formatDeliveryStatus(status: string) {
  if (status === "sent") {
    return "Sent";
  }

  if (status === "failed") {
    return "Failed";
  }

  if (status === "skipped") {
    return "Skipped";
  }

  return "Pending";
}

function formatLeadNurtureStatus(status: string | null, stage: number | null) {
  if (!status || !stage) {
    return "Nurture not started";
  }

  if (status === "sent") {
    return `Nurture sent · stage ${stage}`;
  }

  return `Nurture failed · stage ${stage}`;
}

export default async function MarketingAdminPage() {
  const [profiles, leads, referralInvites, notebookEntries, weeklyRecaps] =
    await Promise.all([
      listParentProfiles(),
      listMarketingLeads(),
      listMarketingReferralInvites(),
      listDailyBriefNotebookEntries(),
      listDailyBriefNotebookWeeklyRecaps(),
    ]);
  const summary = buildMarketingReportingSummary({
    profiles,
    leads,
    referralInvites,
    notebookEntryCount: notebookEntries.length,
    weeklyRecapCount: weeklyRecaps.length,
  });

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
            Marketing
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
            Watch the parent funnel from starter-kit capture through referral
            invites and trial activation.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            This internal view keeps lead capture, activation milestones, and
            family referral activity in one place so we can see where D2C growth
            is really compounding.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[31rem]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Leads
            </p>
            <p className="mt-3 text-3xl font-bold tabular-nums text-[#0f172a]">
              {summary.leads.total}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {summary.leads.delivered} delivered starter kits · {summary.leads.nurtureSent} nurture touches
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Referral invites
            </p>
            <p className="mt-3 text-3xl font-bold tabular-nums text-[#0f172a]">
              {summary.referrals.sent}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {summary.referrals.accepted} accepted · {summary.referrals.trialStarted} trial started
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Activation
            </p>
            <p className="mt-3 text-3xl font-bold tabular-nums text-[#0f172a]">
              {summary.activation.firstBriefDelivered}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {summary.activation.trialStarted} trial starts
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Funnel metrics
              </p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-[#0f172a]">
                D2C activation snapshot
              </h3>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: "Trial started",
                value: summary.activation.trialStarted,
                detail: "Parents with an active trial start timestamp",
              },
              {
                label: "First brief delivered",
                value: summary.activation.firstBriefDelivered,
                detail: "Families who have reached a real value moment",
              },
              {
                label: "Notebook entries",
                value: summary.activation.notebookEntries,
                detail: "Saved brief notes and authored reflections",
              },
              {
                label: "Weekly recaps",
                value: summary.activation.weeklyRecaps,
                detail: "Stored recap assets ready for retention loops",
              },
              {
                label: "Starter kits delivered",
                value: summary.leads.delivered,
                detail: "Lead captures that received the parent kit",
              },
              {
                label: "Nurture touches",
                value: summary.leads.nurtureSent,
                detail: "Leads that have received at least one follow-up email",
              },
              {
                label: "Nurture failures",
                value: summary.leads.nurtureFailed,
                detail: "Follow-up attempts that still need review",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-[24px] border border-slate-200 bg-white px-4 py-4"
              >
                <p className="min-h-[2.5rem] text-sm font-semibold text-slate-700">
                  {metric.label}
                </p>
                <p className="mt-3 min-h-[2.75rem] text-3xl font-bold tabular-nums text-[#0f172a]">
                  {metric.value}
                </p>
                <p className="min-h-[3rem] text-sm leading-6 text-slate-500">
                  {metric.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Recent leads
          </p>
          <div className="mt-4 space-y-3">
            {summary.recentLeads.length > 0 ? (
              summary.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-[22px] border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">
                        {lead.fullName}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{lead.email}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {formatDeliveryStatus(lead.deliveryStatus)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {formatStageInterest(lead.childStageInterest)} · {lead.source}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {formatLeadNurtureStatus(
                      lead.nurtureLastStatus,
                      lead.nurtureLastStage,
                    )}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-500">
                Lead captures will appear here once the public starter-kit flow starts collecting demand.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Referral invites
          </p>
          <div className="mt-4 space-y-3">
            {summary.recentReferralInvites.length > 0 ? (
              summary.recentReferralInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-[22px] border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">
                        {invite.inviteeFullName || "Unnamed family"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {invite.inviteeEmail}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {formatDeliveryStatus(invite.deliveryStatus)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {formatStageInterest(invite.inviteeStageInterest)} · accepted{" "}
                    {invite.acceptedAt ? "yes" : "no"} · trial started{" "}
                    {invite.trialStartedAt ? "yes" : "no"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-500">
                Referral invite activity will appear here after the first family shares Daily Sparks.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Working assumptions
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>
              - Referral prompts should only appear after first brief delivery,
              so invites are anchored to a real value moment.
            </li>
            <li>
              - Starter kit capture and login now mark accepted and
              trial-started referral states automatically.
            </li>
            <li>
              - Starter-kit leads now move into a light nurture sequence so
              we can watch the gap between capture and trial start instead of
              relying on one email touch.
            </li>
            <li>
              - GA4 event plumbing is code-ready, but production still needs
              the real <code>NEXT_PUBLIC_GA_MEASUREMENT_ID</code> value to start
              collecting live analytics.
            </li>
          </ul>
        </section>
      </div>
    </section>
  );
}

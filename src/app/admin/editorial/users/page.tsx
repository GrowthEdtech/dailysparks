import Link from "next/link";

import { listParentProfiles } from "../../../../lib/mvp-store";
import { listOnboardingReminderRunHistory } from "../../../../lib/onboarding-reminder-history-store";
import {
  getDerivedAccessState,
  type DerivedAccessState,
} from "../../../../lib/access-state";
import {
  compareProfilesByCreatedAtDesc,
  countProfilesNeedingActivationReminder,
  countProfilesByStatus,
  formatAdminDate,
  getCountryRegionLabel,
  getDerivedAccessFilterLabel,
  getDeliveryLabels,
  getDerivedUserTypeLabel,
  getInvoiceStatusLabel,
  getLocalDeliveryScheduleLabel,
  getOnboardingReminderStatus,
  getPlanLabel,
  isSubscriptionStatus,
  USER_STATUS_FILTERS,
} from "./users-admin-helpers";
import { getActivationDashboardSummary } from "./activation-funnel-summary";
import { getGrowthReconciliationSummary } from "../../../../lib/growth-reconciliation";

type UsersAdminPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

function buildFilterHref(status?: DerivedAccessState) {
  if (!status) {
    return "/admin/editorial/users";
  }

  return `/admin/editorial/users?status=${status}`;
}

export default async function UsersAdminPage({
  searchParams,
}: UsersAdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const status = isSubscriptionStatus(resolvedSearchParams.status)
    ? resolvedSearchParams.status
    : undefined;
  const allProfiles = (await listParentProfiles()).sort(compareProfilesByCreatedAtDesc);
  const visibleProfiles = status
    ? allProfiles.filter((profile) => getDerivedAccessState(profile.parent) === status)
    : allProfiles;
  const reminderHistory = await listOnboardingReminderRunHistory();
  const statusCounts = countProfilesByStatus(allProfiles);
  const reminderDueCount = countProfilesNeedingActivationReminder(allProfiles);
  const activationSummary = getActivationDashboardSummary(
    visibleProfiles,
    reminderHistory,
  );
  const reconciliationSummary = getGrowthReconciliationSummary(allProfiles);

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
            Users
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
            Review family accounts, billing state, and delivery readiness in one list.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            This read-only workspace gives operations a live view of who has
            registered, which programme each student belongs to, and whether
            each family is ready for billing and delivery workflows.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[31rem]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Total families
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
              {allProfiles.length}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Active / trial
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
              {statusCounts.active + statusCounts.trial_active}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Needs activation reminder
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
              {reminderDueCount}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              User type
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={buildFilterHref()}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  !status
                    ? "border-[#0f172a] bg-[#0f172a] text-white"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                All
              </Link>
              {USER_STATUS_FILTERS.map((statusOption) => (
                <Link
                  key={statusOption}
                  href={buildFilterHref(statusOption)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize ${
                    status === statusOption
                      ? "border-[#0f172a] bg-[#0f172a] text-white"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {getDerivedAccessFilterLabel(statusOption)}
                </Link>
              ))}
            </div>
          </div>

          <div className="text-sm text-slate-500">
            <span className="font-semibold text-[#0f172a]">
              Showing {visibleProfiles.length}
            </span>{" "}
            family account{visibleProfiles.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Activation funnel
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                These counts show how many visible families have truly crossed
                each milestone, not just signed in.
              </p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>
                <span className="font-semibold text-[#0f172a]">
                  {activationSummary.stuckCount}
                </span>{" "}
                stuck in activation
              </p>
              <p>
                <span className="font-semibold text-[#0f172a]">
                  {activationSummary.paidButNotDeliveredCount}
                </span>{" "}
                paid without first brief
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              {
                key: "signed_in",
                label: "Signed in",
                count: activationSummary.counts.signed_in,
              },
              {
                key: "child_profile_completed",
                label: "Child profile completed",
                count: activationSummary.counts.child_profile_completed,
              },
              {
                key: "dispatchable_channel_ready",
                label: "Dispatchable channel ready",
                count: activationSummary.counts.dispatchable_channel_ready,
              },
              {
                key: "first_brief_delivered",
                label: "First brief delivered",
                count: activationSummary.counts.first_brief_delivered,
              },
              {
                key: "paid_activated",
                label: "Paid activated",
                count: activationSummary.counts.paid_activated,
              },
            ].map((card) => (
              <div
                key={card.key}
                className="rounded-[24px] border border-slate-200 bg-white px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
                  {card.count}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Recent reminder evidence
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Reminder runs
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
                {activationSummary.reminderEvidence.totalRuns}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Sent
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
                {activationSummary.reminderEvidence.sentRuns}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Failed
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
                {activationSummary.reminderEvidence.failedRuns}
              </p>
            </div>
          </div>

          {activationSummary.attentionProfiles.length > 0 ? (
            <div className="mt-4 space-y-3">
              {activationSummary.attentionProfiles.slice(0, 4).map((item) => (
                <div
                  key={item.profile.parent.id}
                  className={`rounded-[20px] border px-4 py-3 ${
                    item.attention.severity === "danger"
                      ? "border-rose-200 bg-rose-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-[#0f172a]">
                    {item.attention.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.profile.parent.email}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {item.attention.detail}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No families in the current view are stuck between activation milestones.
            </p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Growth reconciliation
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              A once-daily ops view of revenue and first-delivery gaps that still
              need intervention.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-[#0f172a]">
              {reconciliationSummary.checkedProfileCount}
            </span>{" "}
            families checked
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Trials expiring soon
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
              {reconciliationSummary.trialsExpiringSoonWithoutFirstBrief.count}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Active without dispatchable channel
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
              {reconciliationSummary.activeWithoutDispatchableChannel.count}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Active without first brief
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
              {reconciliationSummary.activeWithoutFirstSuccessfulDelivery.count}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Reminder failures blocking activation
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[#0f172a]">
              {reconciliationSummary.reminderFailuresBlockingActivation.count}
            </p>
          </div>
        </div>
      </section>

      {visibleProfiles.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
          <h3 className="text-xl font-bold tracking-tight text-[#0f172a]">
            No families have registered yet
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            The user operations list will appear here as soon as parent
            accounts are created in the profile store. Until then, this tab
            stays intentionally empty so the team sees the true system state.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {visibleProfiles.map((profile) => {
            const reminderStatus = getOnboardingReminderStatus(profile);

            return (
              <article
                key={profile.parent.id}
                className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {getDerivedUserTypeLabel(profile.parent)}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {getPlanLabel(profile.parent.subscriptionPlan)}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {getInvoiceStatusLabel(profile)}
                      </span>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                        {reminderStatus.label}
                      </span>
                    </div>

                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-[#0f172a]">
                      {profile.parent.fullName}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {profile.parent.email}
                    </p>

                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Student
                        </p>
                        <p className="mt-2 text-base font-semibold text-[#0f172a]">
                          {profile.student.studentName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {profile.student.programme} {profile.student.programmeYear}
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Delivery
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getDeliveryLabels(profile).map((label) => (
                            <span
                              key={label}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Local delivery window
                        </p>
                        <p className="mt-2 text-base font-semibold text-[#0f172a]">
                          {getCountryRegionLabel(profile)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {getLocalDeliveryScheduleLabel(profile)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                      {reminderStatus.detail}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Registered
                    </p>
                    <p className="mt-2 font-semibold text-[#0f172a]">
                      {formatAdminDate(profile.parent.createdAt)}
                    </p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Last updated
                    </p>
                    <p className="mt-2">{formatAdminDate(profile.parent.updatedAt)}</p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <Link
                    href={`/admin/editorial/users/${profile.parent.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                  >
                    Open user record
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

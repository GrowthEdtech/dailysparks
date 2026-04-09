import Link from "next/link";

import { listParentProfiles } from "../../../../lib/mvp-store";
import { listOnboardingReminderRunHistory } from "../../../../lib/onboarding-reminder-history-store";
import { listPlannedNotificationRunHistory } from "../../../../lib/planned-notification-history-store";
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
  getPlannedNotificationOpsSummary,
  getPlannedNotificationStatuses,
  getPlanLabel,
  isSubscriptionStatus,
  USER_STATUS_FILTERS,
} from "./users-admin-helpers";
import { getActivationDashboardSummary } from "./activation-funnel-summary";
import { getGrowthReconciliationSummary } from "../../../../lib/growth-reconciliation";
import { buildPlannedNotificationOpsQueue } from "../../../../lib/planned-notification-ops";
import PlannedNotificationOpsQueue from "./planned-notification-ops-queue";
import UsersMetricCard from "./users-metric-card";
import UsersSectionHeader from "./users-section-header";

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
  const plannedNotificationSummary = getPlannedNotificationOpsSummary(visibleProfiles);
  const plannedNotificationQueue = buildPlannedNotificationOpsQueue({
    profiles: visibleProfiles,
    history: await listPlannedNotificationRunHistory(),
  });

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
          <UsersMetricCard
            label="Total families"
            value={allProfiles.length}
            className="bg-slate-50/80"
          />
          <UsersMetricCard
            label="Active / trial"
            value={statusCounts.active + statusCounts.trial_active}
            className="bg-slate-50/80"
          />
          <UsersMetricCard
            label="Needs activation reminder"
            value={reminderDueCount}
            className="bg-slate-50/80"
          />
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
          <UsersSectionHeader
            eyebrow="Activation funnel"
            description="These counts show how many visible families have truly crossed each milestone, not just signed in."
            aside={
              <>
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
              </>
            }
          />

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
              <UsersMetricCard
                key={card.key}
                label={card.label}
                value={card.count}
                className="bg-white"
              />
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
          <UsersSectionHeader eyebrow="Recent reminder evidence" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <UsersMetricCard
              label="Reminder runs"
              value={activationSummary.reminderEvidence.totalRuns}
              className="bg-white"
            />
            <UsersMetricCard
              label="Sent"
              value={activationSummary.reminderEvidence.sentRuns}
              className="bg-white"
            />
            <UsersMetricCard
              label="Failed"
              value={activationSummary.reminderEvidence.failedRuns}
              className="bg-white"
            />
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
        <UsersSectionHeader
          eyebrow="Growth reconciliation"
          description="A once-daily ops view of revenue and first-delivery gaps that still need intervention."
          aside={
            <>
              <span className="font-semibold text-[#0f172a]">
                {reconciliationSummary.checkedProfileCount}
              </span>{" "}
              families checked
            </>
          }
        />

        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <UsersMetricCard
            label="Trials expiring soon"
            value={reconciliationSummary.trialsExpiringSoonWithoutFirstBrief.count}
            className="bg-white"
          />
          <UsersMetricCard
            label="Active without dispatchable channel"
            value={reconciliationSummary.activeWithoutDispatchableChannel.count}
            className="bg-white"
          />
          <UsersMetricCard
            label="Active without first brief"
            value={reconciliationSummary.activeWithoutFirstSuccessfulDelivery.count}
            className="bg-white"
          />
          <UsersMetricCard
            label="Reminder failures blocking activation"
            value={reconciliationSummary.reminderFailuresBlockingActivation.count}
            className="bg-white"
          />
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
        <UsersSectionHeader
          eyebrow="Notification operations"
          description="A live view of planned parent-inbox notifications, including which families still need an email and which cases are already deduped against the latest state."
          aside={
            <>
              <span className="font-semibold text-[#0f172a]">
                {visibleProfiles.length}
              </span>{" "}
              families in current view
            </>
          }
        />

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <UsersMetricCard
            label="Trial ending active"
            value={plannedNotificationSummary.trialEnding.actionableCount}
            detail={`${plannedNotificationSummary.trialEnding.dedupedCount} deduped`}
            className="bg-white"
          />
          <UsersMetricCard
            label="Billing updates pending"
            value={plannedNotificationSummary.billingStatus.actionableCount}
            detail={`${plannedNotificationSummary.billingStatus.dedupedCount} deduped`}
            className="bg-white"
          />
          <UsersMetricCard
            label="Delivery support active"
            value={plannedNotificationSummary.deliverySupport.actionableCount}
            detail={`${plannedNotificationSummary.deliverySupport.dedupedCount} deduped`}
            className="bg-white"
          />
        </div>
      </section>

      <PlannedNotificationOpsQueue
        items={plannedNotificationQueue.items}
        summary={plannedNotificationQueue.summary}
      />

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
            const plannedNotificationStatuses =
              getPlannedNotificationStatuses(profile);

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
                    <div className="mt-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Planned notifications
                      </p>
                      <div className="mt-3 grid gap-3 lg:grid-cols-3">
                        {[
                          {
                            label: "Trial ending",
                            status: plannedNotificationStatuses.trialEnding,
                          },
                          {
                            label: "Billing status",
                            status: plannedNotificationStatuses.billingStatus,
                          },
                          {
                            label: "Delivery support",
                            status: plannedNotificationStatuses.deliverySupport,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              {item.label}
                            </p>
                            <p className="mt-2 text-base font-semibold text-[#0f172a]">
                              {item.status.label}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {item.status.detail}
                            </p>
                          </div>
                        ))}
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

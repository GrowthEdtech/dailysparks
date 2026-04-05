import Link from "next/link";
import { notFound } from "next/navigation";

import { getProfileByParentId } from "../../../../../lib/mvp-store";
import { getActivationFunnelState } from "../../../../../lib/activation-funnel";
import { listOnboardingReminderRunHistory } from "../../../../../lib/onboarding-reminder-history-store";
import { listPlannedNotificationRunHistory } from "../../../../../lib/planned-notification-history-store";
import type { PlannedNotificationRunRecord } from "../../../../../lib/planned-notification-history-schema";
import {
  formatAdminDate,
  formatAdminDateTime,
  getCountryRegionLabel,
  getDeliveryLabels,
  getDerivedUserTypeLabel,
  getInvoiceStatusLabel,
  getLocalDeliveryScheduleLabel,
  getOnboardingReminderStatus,
  getPlannedNotificationStatuses,
  getPlanLabel,
} from "../users-admin-helpers";
import { getFamilyDeliveryHealthRollup } from "../../../../../lib/delivery-health-rollup";
import {
  getActivationAttentionState,
  getRecentReminderRunsForParent,
} from "../activation-funnel-summary";
import PlannedNotificationActionsPanel from "./planned-notification-actions-panel";

type UserDetailAdminPageProps = {
  params: Promise<{
    parentId: string;
  }>;
};

function getRecentPlannedNotificationRunsForParent(
  entries: PlannedNotificationRunRecord[],
  parentId: string,
) {
  return entries.filter((entry) => entry.parentId === parentId).slice(0, 6);
}

function formatPlannedNotificationFamilyLabel(
  family: PlannedNotificationRunRecord["notificationFamily"],
) {
  if (family === "trial-ending-reminder") {
    return "Trial ending reminder";
  }

  if (family === "billing-status-update") {
    return "Billing status update";
  }

  return "Delivery support alert";
}

function formatPlannedNotificationSourceLabel(
  source: PlannedNotificationRunRecord["source"],
) {
  return source.replaceAll("-", " ");
}

export default async function UserDetailAdminPage({
  params,
}: UserDetailAdminPageProps) {
  const { parentId } = await params;
  const profile = await getProfileByParentId(parentId);

  if (!profile) {
    notFound();
  }

  const deliveryHealth = getFamilyDeliveryHealthRollup(profile);
  const reminderStatus = getOnboardingReminderStatus(profile);
  const plannedNotificationStatuses = getPlannedNotificationStatuses(profile);
  const funnelState = getActivationFunnelState(profile);
  const attentionState = getActivationAttentionState(profile);
  const reminderRuns = getRecentReminderRunsForParent(
    await listOnboardingReminderRunHistory(),
    profile.parent.id,
  );
  const plannedNotificationRuns = getRecentPlannedNotificationRunsForParent(
    await listPlannedNotificationRunHistory(),
    profile.parent.id,
  );

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/admin/editorial/users"
              className="text-sm font-semibold text-slate-500 transition hover:text-[#0f172a]"
            >
              Back to Users
            </Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
              User record
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
              {profile.parent.fullName}
            </h1>
            <p className="mt-2 text-base font-medium text-slate-600">
              {profile.parent.email}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            <p className="font-semibold text-[#0f172a]">
              {getDerivedUserTypeLabel(profile.parent)}
            </p>
            <p className="mt-2">{getPlanLabel(profile.parent.subscriptionPlan)}</p>
            <p>{getInvoiceStatusLabel(profile)}</p>
            <p>Registered: {formatAdminDate(profile.parent.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Family overview
          </h2>
          <dl className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">User type</dt>
              <dd>{getDerivedUserTypeLabel(profile.parent)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Subscription status</dt>
              <dd className="capitalize">{profile.parent.subscriptionStatus}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Registered</dt>
              <dd>{formatAdminDate(profile.parent.createdAt)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Last updated</dt>
              <dd>{formatAdminDate(profile.parent.updatedAt)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Country / region</dt>
              <dd>{getCountryRegionLabel(profile)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Time zone</dt>
              <dd>{profile.parent.deliveryTimeZone.replaceAll("_", " ")}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Local delivery time</dt>
              <dd>{getLocalDeliveryScheduleLabel(profile)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Student profile
          </h2>
          <dl className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Student</dt>
              <dd>{profile.student.studentName}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Programme</dt>
              <dd>
                {profile.student.programme} {profile.student.programmeYear}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Goodnotes email</dt>
              <dd>{profile.student.goodnotesEmail || "Not set"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Billing snapshot
          </h2>
          <dl className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Plan</dt>
              <dd>{getPlanLabel(profile.parent.subscriptionPlan)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Invoice status</dt>
              <dd>{getInvoiceStatusLabel(profile)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Invoice number</dt>
              <dd>{profile.parent.latestInvoiceNumber || "No invoice number"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Renewal</dt>
              <dd>
                {profile.parent.subscriptionRenewalAt
                  ? formatAdminDate(profile.parent.subscriptionRenewalAt)
                  : "Not scheduled"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Delivery channels
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {getDeliveryLabels(profile).map((label) => (
              <span
                key={label}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-600"
              >
                {label}
              </span>
            ))}
          </div>

          <dl className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Goodnotes</dt>
              <dd>{profile.student.goodnotesConnected ? "Connected" : "Not connected"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Goodnotes health</dt>
              <dd>{deliveryHealth.goodnotes.label}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Goodnotes status</dt>
              <dd>{profile.student.goodnotesLastDeliveryMessage || "No delivery result yet"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Notion</dt>
              <dd>{profile.student.notionConnected ? "Connected" : "Not connected"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Notion archive</dt>
              <dd>{deliveryHealth.notion.configured ? "Configured" : "Not configured"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Notion verification</dt>
              <dd>
                {deliveryHealth.notion.verified
                  ? "Verified"
                  : deliveryHealth.notion.configured
                    ? "Pending verification"
                    : "Not verified"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Notion health</dt>
              <dd>{deliveryHealth.notion.label}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Notion status</dt>
              <dd>{profile.parent.notionLastSyncMessage || "No sync result yet"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Activation reminders
          </h2>
          <dl className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Reminder status</dt>
              <dd>{reminderStatus.label}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Reminder detail</dt>
              <dd className="max-w-[20rem] text-right">{reminderStatus.detail}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Reminder count</dt>
              <dd>
                {profile.parent.onboardingReminderCount} reminder
                {profile.parent.onboardingReminderCount === 1 ? "" : "s"} sent
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Last reminder sent</dt>
              <dd>
                {profile.parent.onboardingReminderLastSentAt
                  ? formatAdminDate(profile.parent.onboardingReminderLastSentAt)
                  : "Not sent yet"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Last attempt</dt>
              <dd>
                {profile.parent.onboardingReminderLastAttemptAt
                  ? formatAdminDate(profile.parent.onboardingReminderLastAttemptAt)
                  : "No attempt yet"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Latest message id</dt>
              <dd>
                {profile.parent.onboardingReminderLastMessageId || "No message id yet"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-semibold text-[#0f172a]">Latest error</dt>
              <dd>
                {profile.parent.onboardingReminderLastError || "No reminder error"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Notification evidence
          </h2>

          <div className="mt-4 grid gap-4">
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
                className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[#0f172a]">
                      {item.status.label}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Last sent
                    </p>
                    <p className="mt-2">
                      {item.status.lastSentAt
                        ? formatAdminDateTime(item.status.lastSentAt)
                        : "Not sent yet"}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 grid gap-2 text-sm leading-6 text-slate-600">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="font-semibold text-[#0f172a]">
                      Current notification state
                    </dt>
                    <dd>{item.status.label}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="font-semibold text-[#0f172a]">Why</dt>
                    <dd className="max-w-[22rem] text-right">{item.status.detail}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="font-semibold text-[#0f172a]">Deduped</dt>
                    <dd>{item.status.deduped ? "Yes" : "No"}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="font-semibold text-[#0f172a]">Last resolved</dt>
                    <dd>
                      {item.status.lastResolvedAt
                        ? formatAdminDateTime(item.status.lastResolvedAt)
                        : "Not resolved"}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        <PlannedNotificationActionsPanel parentEmail={profile.parent.email} />

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Activation funnel
          </h2>

          <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Current stage
            </p>
            <p className="mt-2 text-lg font-semibold text-[#0f172a]">
              {funnelState.steps[funnelState.currentStage].label}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {funnelState.completedStepCount} of 5 milestones completed
            </p>
          </div>

          {attentionState ? (
            <div
              className={`mt-4 rounded-[24px] border px-4 py-4 ${
                attentionState.severity === "danger"
                  ? "border-rose-200 bg-rose-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <p className="text-sm font-semibold text-[#0f172a]">
                {attentionState.title}
              </p>
              <p className="mt-2 text-sm text-slate-600">{attentionState.detail}</p>
            </div>
          ) : null}

          <dl className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
            {Object.values(funnelState.steps).map((step) => (
              <div
                key={step.key}
                className="flex items-start justify-between gap-4 rounded-[20px] border border-slate-200 bg-white px-4 py-3"
              >
                <dt className="font-semibold text-[#0f172a]">{step.label}</dt>
                <dd className="text-right">
                  {step.completedAt ? (
                    <>
                      <span>{formatAdminDate(step.completedAt)}</span>
                      {step.derived ? (
                        <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-slate-400">
                          Derived
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "Not reached"
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Recent reminder runs
          </h2>

          {reminderRuns.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No immutable reminder run evidence has been recorded for this family yet.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {reminderRuns.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">
                        {entry.stageLabel}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatAdminDateTime(entry.runAt)}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p className="font-semibold capitalize text-[#0f172a]">
                        {entry.status}
                      </p>
                      <p>
                        {entry.messageId
                          ? `Message id: ${entry.messageId}`
                          : entry.errorMessage || "No message id recorded"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Recent notification runs
          </h2>

          {plannedNotificationRuns.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No immutable planned-notification evidence has been recorded for this family yet.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {plannedNotificationRuns.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">
                        {formatPlannedNotificationFamilyLabel(entry.notificationFamily)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatAdminDateTime(entry.runAt)} · {formatPlannedNotificationSourceLabel(entry.source)}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p className="font-semibold capitalize text-[#0f172a]">
                        {entry.status}
                      </p>
                      <p>
                        {entry.messageId
                          ? `Message id: ${entry.messageId}`
                          : entry.errorMessage || entry.reason || "No additional evidence recorded"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

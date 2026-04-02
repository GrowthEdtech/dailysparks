import Link from "next/link";
import { notFound } from "next/navigation";

import { getProfileByParentId } from "../../../../../lib/mvp-store";
import {
  formatAdminDate,
  getDeliveryLabels,
  getDerivedUserTypeLabel,
  getInvoiceStatusLabel,
  getPlanLabel,
} from "../users-admin-helpers";

type UserDetailAdminPageProps = {
  params: Promise<{
    parentId: string;
  }>;
};

export default async function UserDetailAdminPage({
  params,
}: UserDetailAdminPageProps) {
  const { parentId } = await params;
  const profile = await getProfileByParentId(parentId);

  if (!profile) {
    notFound();
  }

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
              {getDerivedUserTypeLabel(profile.parent.subscriptionStatus)}
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
              <dd>{getDerivedUserTypeLabel(profile.parent.subscriptionStatus)}</dd>
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
              <dt className="font-semibold text-[#0f172a]">Notion</dt>
              <dd>{profile.student.notionConnected ? "Connected" : "Not connected"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </section>
  );
}

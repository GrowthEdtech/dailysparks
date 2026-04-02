import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import AdminLogoutButton from "./admin-logout-button";
import EditorialAdminTabs from "./editorial-admin-tabs";
import { getEditorialAdminSessionFromCookieStore } from "../../../lib/editorial-admin-auth";

type EditorialAdminLayoutProps = {
  children: ReactNode;
};

export default async function EditorialAdminLayout({
  children,
}: EditorialAdminLayoutProps) {
  const session = await getEditorialAdminSessionFromCookieStore(await cookies());

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
                Editorial admin
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
                Manage sources, prompt rules, AI infrastructure, and brief history in one workspace.
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Keep source policy, prompt strategy, model connections, and
                daily brief records in separate tabs so each workflow stays
                focused without changing how the underlying tools work.
              </p>
            </div>

            <div className="flex justify-start md:justify-end">
              <AdminLogoutButton />
            </div>
          </div>

          <div className="mt-6">
            <EditorialAdminTabs />
          </div>
        </section>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

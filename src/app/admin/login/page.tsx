import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AdminLoginForm from "./admin-login-form";
import { getEditorialAdminSessionFromCookieStore } from "../../../lib/editorial-admin-auth";

export default async function AdminLoginPage() {
  const session = await getEditorialAdminSessionFromCookieStore(await cookies());

  if (session) {
    redirect("/admin/editorial/sources");
  }

  return <AdminLoginForm />;
}

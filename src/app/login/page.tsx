import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "./login-form";
import { getSessionFromCookieStore } from "../../lib/session";

export default async function LoginPage() {
  const session = await getSessionFromCookieStore(await cookies());

  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}

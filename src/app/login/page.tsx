import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "./login-form";
import { SESSION_COOKIE_NAME } from "../../lib/session";

export default async function LoginPage() {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}

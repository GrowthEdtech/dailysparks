import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "./login-form";
import { getSessionFromCookieStore } from "../../lib/session";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Daily Sparks to manage your family reading workflow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage() {
  const session = await getSessionFromCookieStore(await cookies());

  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}

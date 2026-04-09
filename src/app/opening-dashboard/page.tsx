import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import OpeningDashboardScreen from "./screen";
import { getSessionFromCookieStore } from "../../lib/session";

export const metadata: Metadata = {
  title: "Opening dashboard",
  description: "Preparing your Daily Sparks parent dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OpeningDashboardPage() {
  const session = await getSessionFromCookieStore(await cookies());

  if (!session) {
    redirect("/login");
  }

  return <OpeningDashboardScreen />;
}

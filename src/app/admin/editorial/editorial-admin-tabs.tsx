"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_TABS = [
  {
    href: "/admin/editorial/sources",
    label: "Sources",
    description: "Whitelist, sections, programme fit",
  },
  {
    href: "/admin/editorial/ai-connections",
    label: "AI Connections",
    description: "Models, endpoints, encrypted keys",
  },
] as const;

export default function EditorialAdminTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Editorial admin sections"
      className="flex flex-col gap-3 md:flex-row"
    >
      {ADMIN_TABS.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex-1 rounded-[24px] border px-4 py-4 text-left transition ${
              isActive
                ? "border-[#0f172a] bg-[#0f172a] text-white shadow-lg shadow-[#0f172a]/10"
                : "border-slate-200 bg-slate-50 text-[#0f172a] hover:border-slate-300 hover:bg-white"
            }`}
          >
            <span className="block text-base font-bold tracking-tight">
              {tab.label}
            </span>
            <span
              className={`mt-1 block text-sm leading-6 ${
                isActive ? "text-slate-200" : "text-slate-500"
              }`}
            >
              {tab.description}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

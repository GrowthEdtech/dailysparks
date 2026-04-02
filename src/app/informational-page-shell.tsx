import Link from "next/link";
import type { ReactNode } from "react";

import { siteFooterLinks } from "./site-footer-links";

type InformationalPageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  children: ReactNode;
};

type InfoSectionProps = {
  title: string;
  children: ReactNode;
};

export function InformationalPageShell({
  eyebrow,
  title,
  intro,
  lastUpdated,
  children,
}: InformationalPageShellProps) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc]">
      <nav className="border-b border-white/8 bg-[#0f172a]/88 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="font-bold text-xl tracking-tight">
            Daily Sparks
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/"
              className="text-slate-300 transition-colors hover:text-[#fbbf24]"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-[#fbbf24] px-5 py-2.5 text-sm font-bold text-[#0f172a] shadow-lg shadow-[#fbbf24]/20 transition-transform hover:scale-105 active:scale-95"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>

      <main className="px-6 pb-20 pt-12">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-8 py-10 shadow-[0_36px_110px_-52px_rgba(15,23,42,0.9)] md:px-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="max-w-4xl space-y-5">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.32em] text-[#fbbf24]">
                {eyebrow}
              </p>
              <h1 className="text-balance text-4xl font-extrabold leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl md:text-[3.6rem]">
                {title}
              </h1>
              <p className="max-w-3xl text-pretty text-base leading-8 text-slate-300 md:text-[1.08rem]">
                {intro}
              </p>
              <p className="text-sm font-medium text-slate-400">
                Last updated {lastUpdated}
              </p>
            </div>
          </section>

          <section className="rounded-[36px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_48%,#f8fafc_100%)] p-8 text-[#0f172a] shadow-[0_32px_90px_-56px_rgba(15,23,42,0.5)] md:p-10">
            <div className="space-y-10">{children}</div>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/6 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-400">
            Daily Sparks is a parent-facing reading workflow by Growth Education
            Limited.
          </p>
          <div className="flex flex-wrap gap-6 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
            {siteFooterLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export function InfoSection({ title, children }: InfoSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0f172a]">
        {title}
      </h2>
      <div className="space-y-4 text-[1.02rem] leading-8 text-slate-600">
        {children}
      </div>
    </section>
  );
}

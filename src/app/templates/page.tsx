import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Download, Sparkles } from "lucide-react";

import { getAllTemplates } from "./template-data";
import { siteUrl } from "../site-config";

export const metadata: Metadata = {
  title: "IB Notion Templates — Built by IB Experts | Daily Sparks",
  description:
    "Free and premium Notion templates for IB Diploma Programme students. Track subjects, EE, TOK, CAS, grades, and university applications in one workspace.",
  alternates: {
    canonical: "/templates",
  },
  openGraph: {
    title: "IB Notion Templates — Built by IB Experts",
    description:
      "Free and premium Notion templates for IB DP students. Built by the curriculum experts behind Daily Sparks.",
    url: `${siteUrl}/templates`,
    siteName: "Daily Sparks",
    type: "website",
  },
};

export default function TemplatesPage() {
  const templates = getAllTemplates();

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc]">
      {/* Nav */}
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
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-12">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/30 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#fbbf24] mr-2" />
            <span className="text-[#fbbf24] text-xs font-bold uppercase tracking-widest">
              Notion Templates for IB Students
            </span>
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-[3.6rem]">
            Your IB journey,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]">
              organized.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base leading-8 text-[#94a3b8] md:text-lg">
            Professional Notion templates built by the IB curriculum experts
            behind Daily Sparks. From subject tracking to Extended Essay
            management — start in 5 minutes.
          </p>
        </div>
      </section>

      {/* Template Cards */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-2">
          {templates.map((template) => {
            const isFree = template.tier === "free";

            return (
              <div
                key={template.slug}
                className={`relative flex flex-col rounded-[36px] p-8 md:p-10 transition-all duration-300 ${
                  isFree
                    ? "border-2 border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20"
                    : "border-[3px] border-[#fbbf24] bg-gradient-to-br from-white/[0.08] to-white/[0.03] shadow-[0_40px_100px_-40px_rgba(251,191,36,0.25)]"
                }`}
              >
                {!isFree && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#fbbf24] text-[#0f172a] px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                    Most Popular
                  </div>
                )}

                {/* Tier Badge */}
                <div className="mb-6">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                      isFree
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/20"
                    }`}
                  >
                    {isFree ? (
                      <>
                        <Download className="h-3 w-3" /> Free
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" /> {template.price}
                      </>
                    )}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-white mb-2">
                  {template.name}
                </h2>
                <p className="text-sm text-[#94a3b8] leading-7 mb-8">
                  {template.tagline}
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-10 flex-1">
                  {template.features.map((feature) => (
                    <li
                      key={feature.title}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          feature.included
                            ? "text-[#fbbf24]"
                            : "text-slate-600"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium leading-tight ${
                          feature.included
                            ? "text-slate-200"
                            : "text-slate-500 line-through"
                        }`}
                      >
                        {feature.title}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={`/templates/${template.slug}`}
                  className={`group flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-center font-bold transition-all duration-300 active:scale-95 ${
                    isFree
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "bg-[#fbbf24] text-[#0f172a] shadow-xl shadow-[#fbbf24]/20 hover:scale-[1.02]"
                  }`}
                >
                  <span>
                    {isFree ? "Get Free Template" : "Get Complete System"}
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <p className="mt-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {isFree
                    ? "Notion • Instant Download"
                    : "Notion • Instant Access • Lifetime Updates"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust / E-E-A-T */}
      <section className="border-t border-white/5 px-6 py-16">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-2xl font-extrabold text-white">
            Built by IB Curriculum Experts
          </h2>
          <p className="text-[#94a3b8] leading-8">
            Every template is designed by the team behind Daily Sparks —
            combining 10+ years of IB curriculum experience with modern
            productivity design. Pre-filled with real IB structures (CAS
            Learning Outcomes, EE RPPF stages, TOK prompts) so you spend time
            learning, not setting up.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-[#fbbf24] px-8 py-3 text-sm font-bold text-[#0f172a] shadow-lg shadow-[#fbbf24]/20 transition-transform hover:scale-105 active:scale-95"
          >
            Also try Daily Sparks reading workflow ($0.99 trial)
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/6 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-400">
            Daily Sparks Templates — a product of Growth Education Limited.
          </p>
          <div className="flex gap-6 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
            <Link href="/" className="transition-colors hover:text-white">
              Home
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-white"
            >
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </footer>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "IB Notion Templates by Daily Sparks",
            description:
              "Free and premium Notion templates for IB Diploma Programme students.",
            url: `${siteUrl}/templates`,
            publisher: {
              "@type": "EducationalOrganization",
              name: "Daily Sparks",
              url: siteUrl,
            },
          }),
        }}
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Download,
  Sparkles,
  ChevronDown,
  BookOpen,
  GraduationCap,
  Shield,
} from "lucide-react";

import {
  getAllTemplateSlugs,
  getTemplateBySlug,
} from "../template-data";
import { siteUrl } from "../../site-config";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllTemplateSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const template = getTemplateBySlug(slug);
  if (!template) return {};

  const title = `${template.name} — Notion Template | Daily Sparks`;
  const description = template.description;

  return {
    title,
    description,
    alternates: { canonical: `/templates/${slug}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/templates/${slug}`,
      siteName: "Daily Sparks",
      type: "website",
    },
  };
}

export default async function TemplateDetailPage(props: PageProps) {
  const { slug } = await props.params;
  const template = getTemplateBySlug(slug);
  if (!template) notFound();

  const isFree = template.tier === "free";
  const includedFeatures = template.features.filter((f) => f.included);
  const excludedFeatures = template.features.filter((f) => !f.included);

  const valueProps = isFree
    ? [
        {
          icon: Download,
          label: "Instant Import",
          detail: "Ready in under 5 minutes.",
        },
        {
          icon: BookOpen,
          label: "IB-Structured",
          detail: "Pre-filled with 6 DP subject groups.",
        },
        {
          icon: Shield,
          label: "No Account Required",
          detail: "Download directly to your Notion workspace.",
        },
      ]
    : [
        {
          icon: GraduationCap,
          label: "Expert-Built",
          detail: "Designed by IB curriculum specialists.",
        },
        {
          icon: Sparkles,
          label: "Monthly Drops",
          detail: "New mini-templates every month for Daily Sparks subscribers.",
        },
        {
          icon: Shield,
          label: "Lifetime Access",
          detail: "Buy once. Receive all future updates.",
        },
      ];

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
              href="/templates"
              className="text-slate-300 transition-colors hover:text-[#fbbf24]"
            >
              All Templates
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

      {/* Breadcrumb */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#fbbf24] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Templates
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="px-6 pt-12 pb-16">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row gap-12 items-start">
          {/* Left: Info */}
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                  isFree
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/20"
                }`}
              >
                {isFree ? (
                  <>
                    <Download className="h-3 w-3" /> Free Download
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" /> Premium — {template.price}
                  </>
                )}
              </span>

              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
                {template.name}
              </h1>
              <p className="text-base leading-8 text-[#94a3b8] md:text-lg">
                {template.description}
              </p>
            </div>

            {/* Value Props */}
            <div className="grid gap-4 sm:grid-cols-3">
              {valueProps.map((vp) => (
                <div
                  key={vp.label}
                  className="rounded-2xl border border-white/8 bg-white/5 p-5 space-y-2"
                >
                  <vp.icon className="h-5 w-5 text-[#fbbf24]" />
                  <p className="text-sm font-bold text-white">{vp.label}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {vp.detail}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="space-y-3">
              {template.gumroadUrl ? (
                <a
                  href={template.gumroadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex w-full items-center justify-center gap-3 rounded-2xl px-8 py-5 text-lg font-bold transition-all active:scale-95 sm:w-auto sm:inline-flex ${
                    isFree
                      ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 hover:bg-emerald-400"
                      : "bg-[#fbbf24] text-[#0f172a] shadow-xl shadow-[#fbbf24]/20 hover:scale-105"
                  }`}
                >
                  {isFree ? "Download Free Template" : `Get Template — ${template.price}`}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </a>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-[#fbbf24]/30 bg-[#fbbf24]/5 px-8 py-5 text-center">
                  <p className="font-bold text-[#fbbf24]">Coming Soon</p>
                  <p className="text-xs text-slate-400 mt-1">
                    This template is being designed with Nano Banana 2 and will
                    be available shortly.
                  </p>
                </div>
              )}
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Platform: Notion • Programme: IB {template.programme}
              </p>
            </div>
          </div>

          {/* Right: Feature Checklist */}
          <div className="w-full md:w-[380px] shrink-0 rounded-[32px] border border-white/10 bg-white/[0.04] p-8 space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#fbbf24]">
              What&apos;s Included
            </p>

            <ul className="space-y-3">
              {includedFeatures.map((f) => (
                <li
                  key={f.title}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#fbbf24]" />
                  <span className="text-sm font-medium text-slate-200 leading-tight">
                    {f.title}
                  </span>
                </li>
              ))}
            </ul>

            {excludedFeatures.length > 0 && (
              <>
                <div className="flex items-center gap-3 pt-2 border-t border-white/8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Available in Complete System
                  </p>
                </div>
                <ul className="space-y-3">
                  {excludedFeatures.map((f) => (
                    <li
                      key={f.title}
                      className="flex items-start gap-3"
                    >
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                      <span className="text-sm text-slate-500 leading-tight">
                        {f.title}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/templates/ib-dp-complete-system"
                  className="group flex items-center gap-2 text-sm font-bold text-[#fbbf24] hover:underline"
                >
                  Upgrade to Complete System
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {template.faq.length > 0 && (
        <section className="border-t border-white/5 px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-10">
            <h2 className="text-2xl font-extrabold text-white text-center">
              Frequently Asked
            </h2>
            <div className="space-y-6">
              {template.faq.map((item) => (
                <div
                  key={item.question}
                  className="border-b border-white/8 pb-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-lg text-white">
                      {item.question}
                    </h4>
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-400 leading-7">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cross-sell */}
      <section className="border-t border-white/5 bg-gradient-to-b from-[#0f172a] to-[#1e293b] px-6 py-16">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#fbbf24]">
            Pair with Daily Sparks
          </p>
          <h2 className="text-3xl font-extrabold text-white">
            Templates work best with daily reading content.
          </h2>
          <p className="text-[#94a3b8] leading-8">
            Daily Sparks delivers programme-aware IB reading briefs to your
            student&apos;s GoodNotes every day. The Reading Log in this template
            connects directly to those briefs — building a searchable record of
            everything your child reads.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#fbbf24] px-8 py-4 font-bold text-[#0f172a] shadow-xl shadow-[#fbbf24]/20 transition-transform hover:scale-105 active:scale-95"
          >
            Start 7-Day Trial for $0.99
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/6 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-400">
            © 2026 Daily Sparks. Powered by Growth Education Limited.
          </p>
          <div className="flex gap-6 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
            <Link href="/" className="transition-colors hover:text-white">
              Home
            </Link>
            <Link
              href="/templates"
              className="transition-colors hover:text-white"
            >
              Templates
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-white"
            >
              Privacy
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
            "@type": "Product",
            name: template.name,
            description: template.description,
            brand: {
              "@type": "Organization",
              name: "Daily Sparks",
            },
            offers: {
              "@type": "Offer",
              price: isFree ? "0" : template.price?.replace("$", ""),
              priceCurrency: "USD",
              availability: template.gumroadUrl
                ? "https://schema.org/InStock"
                : "https://schema.org/PreOrder",
              url: template.gumroadUrl ?? `${siteUrl}/templates/${slug}`,
            },
          }),
        }}
      />
    </div>
  );
}

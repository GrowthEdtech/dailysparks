import {
  ArrowRight,
  BookOpen,
  Brain,
  PenTool,
  ShieldCheck,
  ChevronDown,
  GraduationCap,
} from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";

import TrackedLink from "../components/tracked-link";
import HomePricingSection from "./home-pricing-section";
import HomeConversionTracker from "./home-conversion-tracker";
import HomeReadingWorkspaceIllustration from "./home-reading-workspace-illustration";
import LandingIntegrationsSection from "./landing-integrations-section";
import { getPublicSeoGuides } from "./public-seo-pages-content";
import { siteFooterLinks } from "./site-footer-links";
import { siteUrl } from "./site-config";
import { DEFAULT_PRICING_MARKET } from "../lib/pricing-market";
import {
  landingFaqItems,
} from "./home-content";

export const metadata: Metadata = {
  title: "IB MYP + DP Reading Support for Families",
  description:
    "Daily Sparks helps IB families build calmer MYP and DP reading habits with Goodnotes delivery, Notion archive, notebook capture, and weekly recaps.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "IB MYP + DP Reading Support for Families",
    description:
      "Daily Sparks helps IB families build calmer MYP and DP reading habits with Goodnotes delivery, Notion archive, notebook capture, and weekly recaps.",
    url: siteUrl,
    siteName: "Daily Sparks",
    type: "website",
  },
};

export default async function Home() {
  const publicSeoGuides = getPublicSeoGuides();
  const socialProofPortraits = [
    {
      src: "/social-proof/family-1.svg",
      alt: "Representative IB family portrait 1",
    },
    {
      src: "/social-proof/family-2.svg",
      alt: "Representative IB family portrait 2",
    },
    {
      src: "/social-proof/family-3.svg",
      alt: "Representative IB family portrait 3",
    },
    {
      src: "/social-proof/family-4.svg",
      alt: "Representative IB family portrait 4",
    },
    {
      src: "/social-proof/family-5.svg",
      alt: "Representative IB family portrait 5",
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] selection:bg-[#fbbf24] selection:text-[#0f172a]">
      <HomeConversionTracker />
      {/* 導航欄 Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center">
            <span className="font-bold text-xl tracking-tight">Daily Sparks</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/login" className="text-sm font-medium hover:text-[#fbbf24] transition-colors">Log in</a>
            <TrackedLink
              href="/login"
              marketingEvent="landing_cta_clicked"
              marketingProperties={{
                location: "nav-primary",
                destination: "trial",
              }}
              className="bg-[#fbbf24] text-[#0f172a] px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-[#fbbf24]/20"
            >
              Get Started
            </TrackedLink>
          </div>
        </div>
      </nav>

      {/* --- Section 1: Hero --- */}
      <section
        data-home-section="hero"
        className="pt-28 pb-20 px-6 max-w-5xl mx-auto flex flex-col items-center text-center md:pt-32"
      >
        <div className="inline-flex items-center rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/30 px-4 py-1.5 mb-8 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-[#fbbf24] mr-2"></span>
          <span className="text-[#fbbf24] text-xs font-bold uppercase tracking-widest">
            NOW FOCUSED ON IB MYP + DP
          </span>
        </div>
        
        <h1 className="px-2 text-4xl font-extrabold leading-[1.08] mb-6 drop-shadow-sm tracking-tight text-white sm:text-5xl md:text-7xl">
          Turn daily reading into a <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]">
            calm IB learning routine.
          </span>
        </h1>
        
        <p className="max-w-3xl text-base leading-8 text-[#94a3b8] mb-10 sm:text-lg md:text-xl">
          Daily Sparks sends programme-aware MYP and DP reading briefs,
          delivers them into Goodnotes, captures notebook thinking, and keeps a
          searchable family archive in Notion.
        </p>
        
        <div className="flex flex-col items-center gap-3 w-full justify-center">
          <TrackedLink
            href="/login"
            marketingEvent="landing_cta_clicked"
            marketingProperties={{
              location: "hero-primary",
              destination: "trial",
            }}
            className="bg-[#fbbf24] text-[#0f172a] px-12 py-5 rounded-2xl font-extrabold text-xl hover:scale-105 transition-all shadow-xl shadow-[#fbbf24]/20 hover:shadow-[#fbbf24]/40 flex items-center justify-center gap-3 group w-full sm:w-auto active:scale-95"
          >
            Start 7-Day Trial for $0.99 <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </TrackedLink>
          <p className="text-[#64748b] text-sm font-semibold mt-1 uppercase tracking-widest opacity-80">
            $0.99 for full 7-day access • Cancel anytime
          </p>
        </div>

        <div className="mt-10 grid w-full max-w-4xl gap-3 rounded-[30px] border border-white/10 bg-white/5 p-4 text-left shadow-[0_28px_90px_-56px_rgba(15,23,42,0.6)] md:grid-cols-5">
          {[
            "Daily brief",
            "Goodnotes delivery",
            "Notebook capture",
            "Weekly recap",
            "Notion archive",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/8 bg-[#0f172a]/70 px-4 py-3 text-sm font-semibold text-slate-200"
            >
              {item}
            </div>
          ))}
        </div>

        {/* 社交證明 Social Proof */}
        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="flex -space-x-3">
            {socialProofPortraits.map((portrait) => (
              <div
                key={portrait.src}
                className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-[#0f172a] bg-slate-700 ring-2 ring-white/5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.85)]"
              >
                <Image
                  src={portrait.src}
                  alt={portrait.alt}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          <p className="max-w-[18rem] text-center text-[10px] font-black uppercase leading-5 tracking-[0.24em] text-[#8ea1bd] sm:max-w-xl sm:text-[11px] sm:tracking-[0.3em]">
            Trust built across 130+ Top-tier IB World Schools
          </p>
          <div className="flex border-t border-slate-800/50 pt-4 w-full justify-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569]">Goodnotes Delivery • Searchable Notion Archives • DP & MYP Calibrated</span>
          </div>
        </div>
      </section>

      {/* --- Section 2: Problem (Pain Points) --- */}
      <section
        data-home-section="problem"
        className="bg-white text-[#0f172a] py-24 px-6 overflow-hidden relative"
      >
        <div className="max-w-4xl mx-auto text-center mb-16 px-4">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 px-2">
            Strong reading matters. <span className="text-red-500">Family routines break first.</span>
          </h2>
          <p className="text-gray-500 text-lg mb-6">
            Daily Sparks is built for the friction that appears after good intentions.
          </p>
          <div className="inline-flex items-center gap-2 bg-[#f8fafc] border border-slate-200 text-slate-600 px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-slate-400"></span>
            Stop drowning in free PDFs. Start a system that actually builds habits.
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {[
            {
              icon: <BookOpen className="text-red-500 w-6 h-6" />,
              title: "Reading happens, but it does not accumulate",
              desc: "Students may read current events or school-linked articles, but the insight often disappears before it becomes reflection, writing, or a repeatable habit."
            },
            {
              icon: <Brain className="text-red-500 w-6 h-6" />,
              title: "Parents know IB reading matters, but not what to do daily",
              desc: "Families want stronger MYP inquiry and DP argument habits, but most reading routines are either too vague to sustain or too heavy to keep going."
            },
            {
              icon: <ShieldCheck className="text-red-500 w-6 h-6" />,
              title: "Tools are scattered",
              desc: "Delivery, note capture, archive, and follow-up often live in different places, so momentum breaks just when the routine starts to form."
            }
          ].map((pain, i) => (
            <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                {pain.icon}
              </div>
              <h3 className="text-xl font-bold">{pain.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{pain.desc}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* --- Section 2.5: Academic Pedigree (E-E-A-T) --- */}
      <section
        data-home-section="pedigree"
        className="bg-[#f8fafc] border-y border-slate-200 py-16 px-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 mesh-gradient-dark opacity-30 pointer-events-none" />
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-shrink-0 w-20 h-20 rounded-3xl bg-[#fbbf24]/10 flex items-center justify-center shadow-glow-amber">
            <GraduationCap className="w-10 h-10 text-[#f59e0b] drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]" />
          </div>
          <div className="space-y-4 relative z-10">
            <h3 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">Developed by IB Curriculum Experts</h3>
            <p className="text-[#64748b] leading-relaxed">
              Daily Sparks isn&apos;t just a tech tool. It is built by Growth Education Limited, leveraging 
              decades of combined experience in IB curriculum design and assessment. Our team understands 
              the specific inquiry requirements of the MYP and the rigorous academic argument standards of the DP.
            </p>
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0f172a]">10+ Years</span>
                <span className="text-xs text-[#94a3b8] uppercase tracking-wider font-bold">IB Experience</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0f172a]">130+ Schools</span>
                <span className="text-xs text-[#94a3b8] uppercase tracking-wider font-bold">Data Mapped</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0f172a]">DP/MYP</span>
                <span className="text-xs text-[#94a3b8] uppercase tracking-wider font-bold">Specialized</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Section 3: The Solution --- */}
      <section
        data-home-section="solution"
        className="py-24 px-6 relative bg-gradient-to-b from-[#0f172a] to-[#1e293b]"
      >
        <div className="max-w-4xl mx-auto text-center mb-16">
          <span className="text-[#fbbf24] font-bold text-sm tracking-widest uppercase">The Solution</span>
          <h2 className="text-3xl md:text-5xl font-extrabold mt-4 mb-4 text-white">
            One workflow, built for the way IB reading actually grows.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="group relative bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.08] transition-all">
            <div className="bg-[#fbbf24] text-[#0f172a] w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#fbbf24]/20">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">MYP reading that builds inquiry</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Bridge-reading briefs help students connect current events to
              global contexts, compare perspectives, and keep curiosity active.
            </p>
            <div className="flex items-center gap-2 text-[#fbbf24] text-xs font-bold uppercase tracking-widest pt-4 border-t border-white/5">
              For MYP
            </div>
          </div>

          <div className="group relative bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.08] transition-all">
            <div className="bg-[#fbbf24] text-[#0f172a] w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#fbbf24]/20">
              <PenTool className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">DP reading that strengthens argument</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Academic briefs surface abstract, claim, counterpoint, method
              focus, and TOK-style thinking that students can reuse in writing.
            </p>
            <div className="flex items-center gap-2 text-[#fbbf24] text-xs font-bold uppercase tracking-widest pt-4 border-t border-white/5">
              For DP
            </div>
          </div>

          <div className="group relative bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.08] transition-all">
            <div className="bg-[#fbbf24] text-[#0f172a] w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#fbbf24]/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">One calm family system</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Students receive the brief in Goodnotes, families keep the
              long-term record in Notion, and notebook prompts plus weekly
              recaps turn reading into visible progress.
            </p>
            <div className="flex items-center gap-2 text-[#fbbf24] text-xs font-bold uppercase tracking-widest pt-4 border-t border-white/5">
              For families
            </div>
          </div>
        </div>
      </section>

      {/* --- Section 4: How it Works --- */}
      <section data-home-section="workflow" className="bg-[#111827] px-6 py-20">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#fbbf24]">
              How It Works
            </p>
            <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-white md:text-5xl">
              A calmer setup for a repeatable MYP or DP reading habit.
            </h2>
            <p className="text-base leading-8 text-slate-300 md:text-lg">
              Daily Sparks works best when the workflow is simple enough to keep
              going at home, but structured enough to help reading accumulate.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            {[
              {
                step: "1",
                title: "Choose MYP or DP",
                body: "Set the learning stage so the brief structure matches the kind of reading your child needs.",
              },
              {
                step: "2",
                title: "Connect Goodnotes, Notion, or both",
                body: "Use Goodnotes for direct reading delivery, Notion for family archiving, or combine both.",
              },
              {
                step: "3",
                title: "Receive the daily brief",
                body: "Each brief arrives already structured for MYP inquiry or DP academic framing.",
              },
              {
                step: "4",
                title: "Capture notebook thinking",
                body: "Students respond while the reading is still fresh instead of letting the moment disappear.",
              },
              {
                step: "5",
                title: "Review the weekly recap",
                body: "Families revisit the reading, the notebook capture, and the ideas worth returning to.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[28px] border border-white/10 bg-white/5 p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#fbbf24] text-sm font-black text-[#0f172a]">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-start gap-6 rounded-[32px] border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#fbbf24]">
                Ready to stop compiling links?
              </p>
              <p className="mt-3 text-base leading-8 text-slate-300">
                The hardest part of IB reading isn&apos;t finding articles—it&apos;s maintaining the daily delivery and archive logic so the student actually engages.
              </p>
            </div>
            <TrackedLink
              href="/login"
              marketingEvent="landing_cta_clicked"
              marketingProperties={{
                location: "workflow-primary",
                destination: "trial",
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fbbf24] px-8 py-4 text-sm font-extrabold text-[#0f172a] shadow-lg shadow-[#fbbf24]/20 transition hover:scale-105 md:w-auto md:shrink-0"
            >
              Start 7-Day Trial ($0.99)
            </TrackedLink>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {publicSeoGuides.map((guide) => (
              <TrackedLink
                key={guide.href}
                href={guide.href}
                marketingEvent="landing_public_guide_clicked"
                marketingProperties={{
                  location: "guide-grid",
                  guide_href: guide.href,
                }}
                className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition-transform hover:-translate-y-1 hover:bg-white/[0.08]"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#fbbf24]">
                  Guide
                </p>
                <h3 className="mt-3 text-xl font-bold tracking-[-0.03em] text-white">
                  {guide.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {guide.description}
                </p>
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>

      {/* --- Section 5: Workspace Preview --- */}
      <section
        data-home-section="workspace-preview"
        className="bg-white text-[#0f172a] py-24 px-6"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#f59e0b]">
                Workspace Preview
              </p>
              <h2 className="text-4xl font-extrabold leading-[1.08] md:text-5xl">
                See the reading workflow in one view.
              </h2>
              <p className="max-w-2xl text-base leading-8 text-slate-500 md:text-lg">
                The student-facing brief, the programme framing, the delivery
                path, and the family archive all stay legible in the same
                system, so the routine feels lighter to keep.
              </p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Student-facing, not dashboard-heavy",
                  body: "Goodnotes delivery keeps the daily reading loop focused and ready for handwriting, annotation, and quick reflection.",
                },
                {
                  title: "Programme-aware by default",
                  body: "MYP and DP framing stay visible in the brief itself, so families do not need to translate the academic purpose each day.",
                },
                {
                  title: "Archive stays useful later",
                  body: "Notion turns each brief, prompt, and recap into a searchable family record instead of another lost document.",
                },
                {
                  title: "Recaps support follow-through",
                  body: "Weekly recap helps families notice what was read, what was captured, and what is worth returning to next.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-6"
                >
                  <h4 className="font-bold text-lg text-slate-900">{item.title}</h4>
                  <p className="mt-3 text-sm leading-7 text-slate-500">{item.body}</p>
                </div>
              ))}
            </div>
            
            <TrackedLink
              href="/login"
              marketingEvent="landing_cta_clicked"
              marketingProperties={{
                location: "workflow-primary",
                destination: "trial",
              }}
              className="group inline-flex items-center justify-center gap-3 rounded-xl bg-[#0f172a] px-8 py-4 font-bold text-white shadow-xl transition-transform hover:translate-x-2"
            >
              <span className="text-[#f8fafc] opacity-100 [text-shadow:0_1px_0_rgba(15,23,42,0.18)]">
                Start The Reading Routine
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-[#f8fafc] transition-transform group-hover:translate-x-0.5" />
            </TrackedLink>
          </div>
          
          <div className="flex-1 bg-slate-100 rounded-[48px] p-4 relative group">
            <HomeReadingWorkspaceIllustration />
            {/* Decal */}
            <div className="absolute -bottom-6 -right-6 bg-[#fbbf24] text-[#0f172a] p-6 rounded-3xl shadow-xl transform rotate-3">
              <div className="font-bold text-2xl tracking-tighter">IB MYP · DP</div>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Global Standards</div>
            </div>
          </div>
        </div>
      </section>

      <div data-home-section="integrations">
        <LandingIntegrationsSection />
      </div>

      {/* --- Section: IB Notion Templates --- */}
      <section
        data-home-section="templates"
        className="bg-[#111827] px-6 py-20 border-t border-white/5"
      >
        <div className="mx-auto max-w-4xl text-center space-y-6 mb-14">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#fbbf24]">
            IB Notion Templates
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Organize your entire IB journey in Notion.
          </h2>
          <p className="text-base leading-8 text-slate-300 md:text-lg max-w-2xl mx-auto">
            Professional templates built by IB curriculum experts — track subjects,
            EE, TOK, CAS, grades, and university applications in one workspace.
          </p>
        </div>

        <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 flex flex-col">
            <span className="inline-flex items-center self-start gap-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              Free
            </span>
            <h3 className="text-xl font-bold text-white mb-2">IB DP Study Dashboard Lite</h3>
            <p className="text-sm text-slate-400 leading-7 mb-6 flex-1">
              Track 6 subjects, deadlines, and exam countdowns. Import in 5 minutes.
            </p>
            <TrackedLink
              href="/templates/ib-dp-study-dashboard-lite"
              marketingEvent="template_cta_clicked"
              marketingProperties={{ template: "lite", tier: "free" }}
              className="group inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Get Free Template <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </TrackedLink>
          </div>

          <div className="rounded-[28px] border-2 border-[#fbbf24]/40 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 flex flex-col relative">
            <div className="absolute -top-3 right-6 bg-[#fbbf24] text-[#0f172a] px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em]">
              Premium
            </div>
            <span className="inline-flex items-center self-start gap-1.5 rounded-full bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              $16.99
            </span>
            <h3 className="text-xl font-bold text-white mb-2">IB DP Complete System</h3>
            <p className="text-sm text-slate-400 leading-7 mb-6 flex-1">
              EE, TOK, CAS, Grade Calculator, IA Tracker, and University Applications — all in one.
            </p>
            <TrackedLink
              href="/templates/ib-dp-complete-system"
              marketingEvent="template_cta_clicked"
              marketingProperties={{ template: "complete", tier: "paid" }}
              className="group inline-flex items-center gap-2 text-sm font-bold text-[#fbbf24] hover:text-[#f59e0b] transition-colors"
            >
              View Complete System <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </TrackedLink>
          </div>
        </div>
      </section>

      <div data-home-section="pricing">
        <HomePricingSection initialPricingMarket={DEFAULT_PRICING_MARKET} />
      </div>

      {/* --- Section 6: FAQ --- */}
      <section
        data-home-section="faq"
        className="bg-white text-[#0f172a] py-24 px-6 border-t border-slate-100"
      >
        <div className="max-w-3xl mx-auto space-y-12">
           <h2 className="text-4xl font-extrabold text-center">Frequently Asked.</h2>
           
           <div className="space-y-8">
              {landingFaqItems.map((item, i) => (
                <div key={i} className="group border-b border-slate-100 pb-6 cursor-pointer">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-lg group-hover:text-[#fbbf24] transition-colors">{item.q}</h4>
                    <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-[#fbbf24] transition-all" />
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* --- Footer & Final CTA --- */}
      <footer className="bg-[#0f172a] py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white">Start a calmer IB reading routine at home.</h2>
            <p className="text-[#94a3b8]">Choose MYP or DP, connect the workflow your family already uses, and let Daily Sparks turn reading into something that accumulates.</p>
          </div>
          
          <div className="flex justify-center">
            <TrackedLink
              href="/login"
              marketingEvent="landing_cta_clicked"
              marketingProperties={{
                location: "footer-primary",
                destination: "trial",
              }}
              className="bg-[#fbbf24] text-[#0f172a] px-12 py-5 rounded-2xl font-black text-xl hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-[#fbbf24]/20"
            >
              Start The Reading Routine
            </TrackedLink>
          </div>

          <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
             <div className="flex items-center opacity-50">
               <span className="font-bold text-sm tracking-widest uppercase">Daily Sparks</span>
             </div>
             <div className="flex flex-wrap justify-center gap-8 text-xs text-[#64748b] font-medium uppercase tracking-widest">
               {siteFooterLinks.map((link) => (
                 <Link
                   key={link.href}
                   href={link.href}
                   className="hover:text-white transition-colors"
                 >
                   {link.label}
                 </Link>
               ))}
             </div>
             <p className="text-xs text-[#64748b]">© 2026 Daily Sparks. Powered by Growth Education Limited</p>
          </div>
        </div>
      </footer>
      {/* JSON-LD FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Daily Sparks 如何帮助学生备考 IB？",
                "answer": {
                  "@type": "Answer",
                  "text": "Daily Sparks 通过每日精选的跨学科阅读，配合针对 IB 标准（如 TOK, MYP Global Context, DP Evidence Limits）的引导提示，帮助学生在日常阅读中建立学术习惯和论证能力。"
                }
              },
              {
                "@type": "Question",
                "name": "Daily Sparks 支持哪些 IB 阶段？",
                "answer": {
                  "@type": "Answer",
                  "text": "我们目前专门针对 IB MYP 和 DP 阶段提供差异化的阅读支持。MYP 侧重于 Inquiry 和 Global Context，而 DP 侧重于学术论证、Claim building 以及 TOK 维度的思考。"
                }
              },
              {
                "@type": "Question",
                "name": "我会从 Goodnotes 还是 Notion 收到内容？",
                "answer": {
                  "@type": "Answer",
                  "text": "Daily Sparks 实现两端同步：学生直接在 Goodnotes 接收可手写、可批注的每日 Brief，而家长可以通过 Notion 系统保留完整的、可搜索的家庭学术档案库。"
                }
              }
            ]
          })
        }}
      />
    </div>
  );
}

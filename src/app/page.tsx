import {
  ArrowRight,
  BookOpen,
  Brain,
  PenTool,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import TrackedLink from "../components/tracked-link";
import HomePricingSection from "./home-pricing-section";
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

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] selection:bg-[#fbbf24] selection:text-[#0f172a]">
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
      <section className="pt-32 pb-20 px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/30 px-4 py-1.5 mb-8 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-[#fbbf24] mr-2"></span>
          <span className="text-[#fbbf24] text-xs font-bold uppercase tracking-widest">
            NOW FOCUSED ON IB MYP + DP
          </span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] mb-6 drop-shadow-sm tracking-tight text-white px-2">
          Turn daily reading into a <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]">
            calm IB learning routine.
          </span>
        </h1>
        
        <p className="text-[#94a3b8] text-lg md:text-xl max-w-3xl leading-relaxed mb-10">
          Daily Sparks sends programme-aware MYP and DP reading briefs,
          delivers them into Goodnotes, captures notebook thinking, and keeps a
          searchable family archive in Notion.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <TrackedLink
            href="/login"
            marketingEvent="landing_cta_clicked"
            marketingProperties={{
              location: "hero-primary",
              destination: "trial",
            }}
            className="bg-[#fbbf24] text-[#0f172a] px-10 py-5 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-[#fbbf24]/20 flex items-center justify-center gap-2 group"
          >
            Start 7-Day Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </TrackedLink>
          <TrackedLink
            href="/ib-parent-starter-kit"
            marketingEvent="landing_cta_clicked"
            marketingProperties={{
              location: "hero-secondary",
              destination: "starter-kit",
            }}
            className="bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            Get the Parent Starter Kit
          </TrackedLink>
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
          <div className="flex -space-x-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0f172a] bg-slate-700 flex items-center justify-center text-xs font-bold ring-2 ring-white/5">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#64748b] font-medium uppercase tracking-widest">
            BUILT FOR IB FAMILIES USING GOODNOTES AND NOTION AT HOME
          </p>
        </div>
      </section>

      {/* --- Section 2: Problem (Pain Points) --- */}
      <section className="bg-white text-[#0f172a] py-24 px-6 overflow-hidden relative">
        <div className="max-w-4xl mx-auto text-center mb-16 px-4">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 px-2">
            Strong reading matters. <span className="text-red-500">Family routines break first.</span>
          </h2>
          <p className="text-gray-500 text-lg">
            Daily Sparks is built for the friction that appears after good intentions.
          </p>
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

      {/* --- Section 3: The Solution --- */}
      <section className="py-24 px-6 relative bg-gradient-to-b from-[#0f172a] to-[#1e293b]">
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
      <section className="bg-[#111827] px-6 py-20">
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

          <div className="flex items-center justify-between gap-6 rounded-[32px] border border-white/10 bg-white/5 p-6 md:p-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#fbbf24]">
                Explore The Reading Model
              </p>
              <p className="mt-3 text-base leading-8 text-slate-300">
                If your family is still comparing options, these public guides
                explain the MYP bridge-reading model, the DP academic loop, the
                Goodnotes student workflow, the Notion family archive, and the
                difference between MYP and DP reading support.
              </p>
            </div>
            <TrackedLink
              href="/ib-parent-starter-kit"
              marketingEvent="landing_cta_clicked"
              marketingProperties={{
                location: "workflow-secondary",
                destination: "starter-kit",
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/15"
            >
              See How The Workflow Fits
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
      <section className="bg-white text-[#0f172a] py-24 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#f59e0b]">
                Workspace Preview
              </p>
              <h2 className="text-4xl font-extrabold leading-tight md:text-5xl">
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

      <LandingIntegrationsSection />

      <HomePricingSection initialPricingMarket={DEFAULT_PRICING_MARKET} />

      {/* --- Section 6: FAQ --- */}
      <section className="bg-white text-[#0f172a] py-24 px-6 border-t border-slate-100">
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
    </div>
  );
}

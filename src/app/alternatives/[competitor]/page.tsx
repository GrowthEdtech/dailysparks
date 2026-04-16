import { notFound } from "next/navigation";
import { competitors } from "../competitor-data";
import { 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  ShieldCheck, 
  Globe
} from "lucide-react";
import Link from "next/link";
import TrackedLink from "../../../components/tracked-link";
import { siteUrl } from "../../site-config";
import type { Metadata } from "next";

type Props = {
  params: { competitor: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const competitor = competitors[params.competitor];
  if (!competitor) return {};

  const title = `Daily Sparks vs ${competitor.name} | Better IB Reading Habit`;
  const description = `Compare Daily Sparks and ${competitor.name} for IB MYP and DP reading. See why families choose Daily Sparks for Goodnotes delivery and Notion archiving.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/alternatives/${params.competitor}`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(competitors).map((slug) => ({
    competitor: slug,
  }));
}

export default function CompetitorComparisonPage({ params }: Props) {
  const competitor = competitors[params.competitor];

  if (!competitor) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] selection:bg-[#fbbf24] selection:text-[#0f172a] mesh-gradient-dark">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <Link href="/" className="font-bold text-xl tracking-tight">Daily Sparks</Link>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium hover:text-[#fbbf24] transition-colors">Log in</Link>
            <TrackedLink
              href="/login"
              marketingEvent="landing_cta_clicked"
              marketingProperties={{
                location: "alternative-nav",
                competitor: competitor.slug,
              }}
              className="bg-[#fbbf24] text-[#0f172a] px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform"
            >
              Get Started
            </TrackedLink>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/30 px-4 py-1.5 mb-8">
          <span className="text-[#fbbf24] text-xs font-bold uppercase tracking-widest">
            Comparison Guide
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
          Daily Sparks vs <span className="text-[#fbbf24]">{competitor.name}</span>
        </h1>
        <p className="text-xl text-[#94a3b8] leading-relaxed max-w-3xl mx-auto">
          Choosing the right tool for your child&apos;s IB journey. While {competitor.name} is a powerful platform, 
          Daily Sparks solves the specific challenge of building a sustainable daily reading habit.
        </p>
      </section>

      {/* Comparison Matrix */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Competitor Side */}
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{competitor.name}</h2>
              <p className="text-[#94a3b8]">{competitor.shortDescription}</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#64748b]">Best For</h3>
              <p className="text-slate-200">{competitor.targetAudience}</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#64748b]">Strengths</h3>
              <ul className="space-y-3">
                {competitor.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#64748b]">Trade-offs</h3>
              <ul className="space-y-3">
                {competitor.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                    <XCircle className="w-5 h-5 text-red-500/50 shrink-0" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Daily Sparks Side */}
          <div className="bg-[#fbbf24]/5 border border-[#fbbf24]/20 rounded-[40px] p-8 md:p-10 space-y-6 relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-glow-amber group">
            <div className="absolute top-0 right-0 bg-[#fbbf24] text-[#0f172a] px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-bl-2xl shadow-lg ring-1 ring-[#fbbf24]/50">
              Recommended for Habits
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#fbbf24]">Daily Sparks</h2>
              <p className="text-[#94a3b8]">Automated IB reading routines for MYP & DP.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#fbbf24]/70">The Habit Advantage</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#fbbf24] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-[#0f172a]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Friction-Free Delivery</h4>
                    <p className="text-sm text-[#94a3b8] mt-1">Directly into Goodnotes. No dashboards for students to navigate.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#fbbf24] flex items-center justify-center shrink-0">
                    <BarChart3 className="w-6 h-6 text-[#0f172a]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Searchable Archive</h4>
                    <p className="text-sm text-[#94a3b8] mt-1">Families keep a personal Notion record of all academic thinking.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#fbbf24] flex items-center justify-center shrink-0">
                    <Globe className="w-6 h-6 text-[#0f172a]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Programme-Aware</h4>
                    <p className="text-sm text-[#94a3b8] mt-1">Specialized framing for MYP Inquiry and DP Argument structures.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <TrackedLink
                href="/login"
                marketingEvent="landing_cta_clicked"
                marketingProperties={{
                  location: "alternative-matrix-primary",
                  competitor: competitor.slug,
                }}
                className="w-full bg-[#fbbf24] text-[#0f172a] py-5 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 hover:scale-[1.03] transition-all shadow-lg shadow-[#fbbf24]/20 active:scale-95"
              >
                Start Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Analysis */}
      <section className="py-20 px-6 bg-white/3 border-y border-white/5">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold">The Verdict</h2>
            <p className="text-lg text-slate-300 leading-relaxed italic">
              &quot;{competitor.vsDailySparks}&quot;
            </p>
          </div>

          <div className="p-8 rounded-[32px] bg-white text-[#0f172a] space-y-6">
            <h3 className="text-2xl font-bold">In short: {competitor.keyDifference}</h3>
            <p className="text-slate-600 leading-relaxed">
              If your school already uses {competitor.name}, that&apos;s great for your child&apos;s academic management. 
              But for building the **reading muscle** and **academic stamina** needed to excel in the IB, 
              Daily Sparks provides the daily ritual that purely administrative or textbook-based platforms often miss.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <Link 
                href="/login" 
                className="bg-[#0f172a] text-white px-8 py-4 rounded-xl font-bold text-center hover:opacity-90 transition-opacity"
              >
                Try Daily Sparks Free
              </Link>
              <Link 
                href="/" 
                className="border border-slate-200 text-slate-600 px-8 py-4 rounded-xl font-bold text-center hover:bg-slate-50 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 text-center">
        <p className="text-sm text-[#64748b]">
          {competitor.name} is a trademark of its respective owner. 
          Comparison is based on publicly available data and aimed at helping families choose the right tool for their specific workflow needs.
        </p>
        <p className="mt-8 text-xs text-[#475569]">© 2026 Daily Sparks. Powered by Growth Education Limited</p>
      </footer>
    </div>
  );
}

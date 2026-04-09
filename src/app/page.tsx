import {
  ArrowRight,
  Zap,
  BookOpen,
  Brain,
  PenTool,
  ShieldCheck,
  ChevronDown,
  Smartphone,
} from "lucide-react";
import Link from "next/link";

import HomePricingSection from "./home-pricing-section";
import HomeReadingWorkspaceIllustration from "./home-reading-workspace-illustration";
import LandingIntegrationsSection from "./landing-integrations-section";
import { siteFooterLinks } from "./site-footer-links";
import { DEFAULT_PRICING_MARKET } from "../lib/pricing-market";
import {
  landingFaqItems,
} from "./home-content";

export default async function Home() {
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
            <a href="/login" className="bg-[#fbbf24] text-[#0f172a] px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-[#fbbf24]/20">
              Get Started
            </a>
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
          Build MYP curiosity. <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]">
            Strengthen DP argument.
          </span>
        </h1>
        
        <p className="text-[#94a3b8] text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
          Daily Sparks delivers a calm IB reading routine. MYP learners build
          inquiry and global-context habits. DP learners train academic framing,
          evidence handling, and TOK-style thinking.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button className="bg-[#fbbf24] text-[#0f172a] px-10 py-5 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-[#fbbf24]/20 flex items-center justify-center gap-2 group">
            Start 7-Day Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
            See Sample Brief
          </button>
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
            BUILT FOR CALM IB FAMILY ROUTINES
          </p>
        </div>
      </section>

      {/* --- Section 2: Problem (Pain Points) --- */}
      <section className="bg-white text-[#0f172a] py-24 px-6 overflow-hidden relative">
        <div className="max-w-4xl mx-auto text-center mb-16 px-4">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 px-2">
            Traditional reading has a <span className="text-red-500">focus problem</span>.
          </h2>
          <p className="text-gray-500 text-lg">
            Is your child truly learning, or just scrolling?
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {[
            {
              icon: <Zap className="text-red-500 w-6 h-6" />,
              title: "The TikTok Attention Span",
              desc: "Hyper-fast content is ruining the ability to focus on complex, long-form logic found in international exams."
            },
            {
              icon: <BookOpen className="text-red-500 w-6 h-6" />,
              title: "Outdated Curriculum",
              desc: "Textbooks are static. Kids lose interest in stale examples that don't connect to today's AI and Space discoveries."
            },
            {
              icon: <Smartphone className="text-red-500 w-6 h-6" />,
              title: "Digital Distraction",
              desc: "Giving a child an iPad for research often leads to YouTube. They need a distraction-free environment."
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
            Meet Their New Academic Habit.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="group relative bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.08] transition-all">
            <div className="bg-[#fbbf24] text-[#0f172a] w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#fbbf24]/20">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">MYP bridge reading</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Shorter, structured briefs help MYP learners connect current
              events to global contexts, compare perspectives, and keep inquiry
              moving.
            </p>
            <div className="flex items-center gap-2 text-[#fbbf24] text-xs font-bold uppercase tracking-widest pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              Inquiry And Context
            </div>
          </div>

          <div className="group relative bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.08] transition-all">
            <div className="bg-[#fbbf24] text-[#0f172a] w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#fbbf24]/20">
              <PenTool className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">DP academic framing</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              DP briefs surface the abstract, core issue, claim, counterpoint,
              and TOK-style prompts that turn daily reading into usable writing
              material.
            </p>
            <div className="flex items-center gap-2 text-[#fbbf24] text-xs font-bold uppercase tracking-widest pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              Argument And Evidence
            </div>
          </div>

          <div className="group relative bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.08] transition-all">
            <div className="bg-[#fbbf24] text-[#0f172a] w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#fbbf24]/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">Calm delivery, lasting record</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Students read in Goodnotes, families keep a searchable Notion
              archive, and both sides stay aligned without dashboard overload.
            </p>
            <div className="flex items-center gap-2 text-[#fbbf24] text-xs font-bold uppercase tracking-widest pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              Delivery And Archive
            </div>
          </div>
        </div>
      </section>

      {/* --- Section 4: How it Works --- */}
      <section className="bg-white text-[#0f172a] py-24 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
                A calm setup for a <br />repeatable academic habit.
              </h2>
            
            <div className="space-y-6">
              <div className="flex gap-4 group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Choose MYP or DP focus</h4>
                  <p className="text-gray-500 text-sm">Pick the learning stage and a few interest areas so future briefs match the kind of reading your family wants more of.</p>
                </div>
              </div>
              <div className="flex gap-4 group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Connect the reading flow</h4>
                  <p className="text-gray-500 text-sm">Use Goodnotes for direct student delivery, Notion for family archiving, or combine both.</p>
                </div>
              </div>
              <div className="flex gap-4 group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#fbbf24] text-[#0f172a] flex items-center justify-center font-bold text-sm shadow-lg shadow-[#fbbf24]/50 scale-110">3</div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Read, reflect, and save</h4>
                  <p className="text-gray-500 text-sm">Each brief arrives in a clean workflow, with notebook prompts and weekly recap tools that help students build lasting academic habits.</p>
                </div>
              </div>
            </div>
            
            <button className="bg-[#0f172a] text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:translate-x-2 transition-transform shadow-xl">
              Set Up Your Reading Loop <ArrowRight className="w-5 h-5" />
            </button>
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
            <h2 className="text-4xl md:text-5xl font-extrabold text-white">Ready to spark their curiosity?</h2>
            <p className="text-[#94a3b8]">Join 500+ global families investing in their child&apos;s IB journey today.</p>
          </div>
          
          <div className="flex justify-center">
            <button className="bg-[#fbbf24] text-[#0f172a] px-12 py-5 rounded-2xl font-black text-xl hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-[#fbbf24]/20">
              Claim 7-Day Free Trial
            </button>
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

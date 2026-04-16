"use client";

import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Clock } from "lucide-react";
import { CampaignData } from "../../app/lp/campaign-data";
import TrackedLink from "../tracked-link";

type CampaignHeroProps = {
  campaign: CampaignData;
};

export default function CampaignHero({ campaign }: CampaignHeroProps) {
  const isResourceStyle = campaign.style === "resource";

  return (
    <div className="relative overflow-hidden bg-white text-[#0f172a] selection:bg-[#fbbf24]/30">
      {/* Dynamic Mesh Background */}
      <div 
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#fbbf24] to-[#00b5d6] opacity-10 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-2xl shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
          {/* Badge */}
          <div className="mt-8 sm:mt-16 lg:mt-12">
            <div className="inline-flex space-x-6">
              <span className="rounded-full bg-[#0f172a]/5 px-3 py-1 text-sm font-black leading-6 text-[#0f172a] ring-1 ring-inset ring-[#0f172a]/10">
                {campaign.style === "academic" ? "IB Academic Protocol" : "Limited Access Toolkit"}
              </span>
              <span className="inline-flex items-center space-x-2 text-sm font-bold leading-6 text-slate-500">
                <span>Just updated for 2026</span>
                <Sparkles size={14} className="text-[#fbbf24]" />
              </span>
            </div>
          </div>

          <h1 className="mt-10 text-4xl font-black tracking-tight text-[#0f172a] sm:text-6xl leading-[1.1]">
            {campaign.heroHeadline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600 font-medium">
            {campaign.heroSubheadline}
          </p>

          {/* Scarcity / Urgency */}
          {campaign.countdownHours && (
            <div className="mt-8 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-rose-900 shadow-sm animate-pulse-subtle">
               <Clock className="h-5 w-5 text-rose-600 shrink-0" />
               <p className="text-sm font-black">
                 Offer expires in {campaign.countdownHours} hours. High volume expected.
               </p>
            </div>
          )}

          {/* Featured Resource Card (XHS Style) */}
          {campaign.featuredResource && (
             <div className="mt-10 rounded-[32px] border-l-8 border-rose-500 bg-[#fff5f5] p-6 shadow-sm flex items-center gap-6">
                <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200">
                   <Sparkles size={32} />
                </div>
                <div>
                   <h3 className="font-black text-rose-900">{campaign.featuredResource.name}</h3>
                   <p className="text-sm text-rose-800/80 font-medium">{campaign.featuredResource.description}</p>
                </div>
             </div>
          )}

          {/* Main CTA */}
          <div className="mt-10 flex items-center gap-x-6">
            <TrackedLink
              href="/login"
              marketingEvent="lp_cta_clicked"
              marketingProperties={{ campaign: campaign.slug }}
              className={`rounded-2xl px-10 py-5 text-xl font-black text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isResourceStyle ? "bg-rose-500 shadow-rose-200" : "bg-[#0f172a] shadow-slate-200"
              }`}
            >
              {campaign.ctaText}
            </TrackedLink>
          </div>

          {/* Social Proof Mini */}
          <div className="mt-10 flex items-center gap-4 border-t border-slate-100 pt-8">
             <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                   <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />
                ))}
             </div>
             <p className="text-sm font-bold text-slate-500">
                {campaign.socialProofText}
             </p>
          </div>
        </div>

        {/* Desktop Visual Side */}
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <div className="rounded-[40px] bg-slate-900/5 p-4 ring-1 ring-inset ring-slate-900/10 lg:-m-4 lg:rounded-[48px] lg:p-4">
               <div className="relative overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-900/10 h-[500px] w-full lg:w-[450px] p-8 flex flex-col justify-center gap-6">
                  {/* Mock Benefits Grid */}
                  <h3 className="text-xl font-black mb-2">Platform Advantage</h3>
                  {campaign.benefits.map((benefit, idx) => (
                     <div key={idx} className="flex gap-4 items-start translate-x-2 opacity-90">
                        <CheckCircle2 className={`shrink-0 ${isResourceStyle ? "text-rose-500" : "text-emerald-500"}`} />
                        <span className="font-black text-[#0f172a]">{benefit}</span>
                     </div>
                  ))}
                  <div className="mt-6 pt-6 border-t border-slate-50 flex items-center gap-3 text-slate-400">
                     <ShieldCheck size={20} />
                     <span className="text-xs font-bold uppercase tracking-widest">Secured via ib examiner protocol</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

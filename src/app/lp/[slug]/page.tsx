import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Sparkles, Star } from "lucide-react";

import { CAMPAIGN_DATA } from "../campaign-data";
import CampaignHero from "../../../components/lp/campaign-hero";
import TrackedLink from "../../../components/tracked-link";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return Object.keys(CAMPAIGN_DATA).map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const campaign = CAMPAIGN_DATA[slug];

  if (!campaign) return {};

  return {
    title: campaign.title,
    description: campaign.heroSubheadline,
    alternates: {
      canonical: `/lp/${slug}`,
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function CampaignLandingPage({ params }: Props) {
  const { slug } = await params;
  const campaign = CAMPAIGN_DATA[slug];

  if (!campaign) {
    notFound();
  }

  const isResourceStyle = campaign.style === "resource";

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Specialized LP Header (Minimal) */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#0f172a]/80 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
           <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">System Operational</span>
           </div>
           <TrackedLink 
             href="/login" 
             className="text-[10px] font-black uppercase tracking-widest text-[#fbbf24] hover:text-white transition-colors"
           >
             Existing Student Login
           </TrackedLink>
        </div>
      </header>

      <main className="pt-16">
        <CampaignHero campaign={campaign} />

        {/* Exclusive Feature Grid */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-base font-black uppercase tracking-[0.2em] text-[#fbbf24]">The Advantage</h2>
              <p className="mt-2 text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">
                Why Top IB Families Choose Daily Sparks
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                {[
                  {
                    name: "Automated Routine",
                    description: "Zero parental nagging. Briefs arrive on Goodnotes every morning at 7:00 AM local time.",
                    icon: Sparkles,
                  },
                  {
                    name: "Curriculum Alignment",
                    description: "Focused on MYP Inquiry and DP Paper 1/2/3 argumentation hooks.",
                    icon: ShieldCheck,
                  },
                  {
                    name: "Asset Retention",
                    description: "A permanent, searchable Notion archive of every text your student reads.",
                    icon: Star,
                  },
                ].map((feature) => (
                  <div key={feature.name} className="flex flex-col">
                    <dt className="flex items-center gap-x-3 text-lg font-black leading-7 text-[#0f172a]">
                      <feature.icon className={`h-5 w-5 flex-none ${isResourceStyle ? "text-rose-500" : "text-[#00b5d6]"}`} aria-hidden="true" />
                      {feature.name}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-sm leading-7 text-slate-500 font-medium">
                      <p className="flex-auto">{feature.description}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Final Sticky CTA (Mobile Only) */}
        <div className="fixed bottom-0 z-50 w-full bg-[#0f172a] p-4 lg:hidden">
           <TrackedLink
              href="/login"
              className={`flex w-full items-center justify-center rounded-2xl py-4 font-black text-white ${isResourceStyle ? "bg-rose-500" : "bg-[#00b5d6]"}`}
           >
              {campaign.ctaText}
           </TrackedLink>
        </div>

        {/* Simple LP Footer */}
        <footer className="bg-[#f8fafc] border-t border-slate-100 py-12 px-6">
           <div className="mx-auto max-w-7xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">© 2026 Daily Sparks. Powered by Growth Education Limited</p>
              <div className="mt-4 flex justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase">
                 <TrackedLink href="/privacy">Privacy</TrackedLink>
                 <TrackedLink href="/terms">Terms</TrackedLink>
              </div>
           </div>
        </footer>
      </main>
    </div>
  );
}

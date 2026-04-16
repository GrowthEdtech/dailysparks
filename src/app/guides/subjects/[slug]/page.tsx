import { Metadata } from "next";
import { notFound } from "next/navigation";
import { GraduationCap, ArrowRight, Sparkles, BookOpen, Target } from "lucide-react";

import { SUBJECT_DATA } from "../subject-data";
import { InformationalPageShell, InfoSection } from "../../../informational-page-shell";
import TrackedLink from "../../../../components/tracked-link";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return Object.keys(SUBJECT_DATA).map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const subject = SUBJECT_DATA[slug];

  if (!subject) return {};

  return {
    title: `Daily Sparks for ${subject.name} Students | IB Reading Support`,
    description: `Optimize your IB ${subject.name} performance with daily, subject-specific reading. Focus on ${subject.focus} and build habits for high-scoring exams.`,
    alternates: {
      canonical: `/guides/subjects/${slug}`,
    },
  };
}

export default async function SubjectGuidePage({ params }: Props) {
  const { slug } = await params;
  const subject = SUBJECT_DATA[slug];

  if (!subject) {
    notFound();
  }

  return (
    <InformationalPageShell
      eyebrow={`IB ${subject.programme} Guide`}
      title={subject.name}
      intro={subject.description}
      lastUpdated="April 16, 2026"
    >
      {/* Subject Focus Card */}
      <InfoSection title="Syllabus Focus">
        <div className="relative overflow-hidden rounded-[32px] border border-[#00b5d6]/10 bg-[#f0fbff] p-8 transition-all hover:bg-[#e6f7ff]">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#00b5d6]/5 blur-3xl" />
          <div className="flex items-start gap-6 relative z-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00b5d6] text-white shadow-lg shadow-[#00b5d6]/20">
              <Target className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#0f172a]">The Core Lens</h3>
              <p className="text-lg leading-relaxed text-slate-700">{subject.focus}</p>
            </div>
          </div>
        </div>
      </InfoSection>

      {/* Benefits Matrix */}
      <InfoSection title="Why it matters for your Score">
        <div className="grid gap-6 md:grid-cols-2">
          {subject.benefits.map((benefit, idx) => (
            <div 
              key={idx} 
              className="group rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_25px_60px_-20px_rgba(15,23,42,0.12)]"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#0f172a] group-hover:bg-[#0f172a] group-hover:text-white transition-colors">
                {idx === 0 ? <BookOpen className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </div>
              <h4 className="text-lg font-black text-[#0f172a] mb-2">{benefit.title}</h4>
              <p className="text-sm leading-relaxed text-slate-500 font-medium">{benefit.description}</p>
            </div>
          ))}
        </div>
      </InfoSection>

      {/* Example Showcase */}
      <InfoSection title="Reading Example">
        <div className="rounded-[32px] bg-[#0f172a] p-8 md:p-10 text-white relative overflow-hidden group">
          <div className="absolute inset-0 mesh-gradient-dark opacity-20 pointer-events-none" />
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-2 text-[#fbbf24]">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Sample Daily Brief</span>
             </div>
             <h3 className="text-2xl md:text-3xl font-black">{subject.exampleTitle}</h3>
             <p className="text-slate-400 font-medium max-w-xl">
               Every brief arriving in your Goodnotes library is calibrated for {subject.name} standards, 
               complete with claim-evidence loops and TOK-style reflection prompts.
             </p>
          </div>
        </div>
      </InfoSection>

      {/* FAQ */}
      <InfoSection title="Frequently Asked Questions">
        <div className="space-y-4">
          {subject.faq.map((item, idx) => (
            <div key={idx} className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
              <h4 className="font-bold text-[#0f172a] mb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
                {item.question}
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed pl-3.5 border-l border-slate-100 ml-0.5">{item.answer}</p>
            </div>
          ))}
        </div>
      </InfoSection>

      {/* Conversion CTA */}
      <InfoSection title="Start your habit today">
        <div className="rounded-[40px] bg-gradient-to-br from-[#fffdf7] via-white to-[#fffef2] border-[3px] border-[#fbbf24] p-8 md:p-12 shadow-[0_40px_100px_-40px_rgba(251,191,36,0.5)] flex flex-col items-center text-center space-y-6">
          <div className="flex -space-x-3 mb-2">
             <div className="w-12 h-12 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-sm flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-slate-400" />
             </div>
             <div className="w-12 h-12 rounded-full border-4 border-white bg-[#00b5d6] shadow-sm flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
             </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-[#0f172a]">Ready for better {subject.name} grades?</h3>
          <p className="text-slate-600 font-medium max-w-lg">
            Join families in Top-tier IB schools who use Daily Sparks to turn daily reading into a massive academic advantage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
             <TrackedLink
               href="/login"
               marketingEvent="subject_guide_cta_clicked"
               marketingProperties={{ subject: subject.slug, position: "landing-footer" }}
               className="bg-[#0f172a] text-white py-5 px-10 rounded-2xl font-black text-lg shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
             >
               Start 7-Day Free Trial <ArrowRight className="h-5 w-5" />
             </TrackedLink>
             <TrackedLink
               href="/ib-parent-starter-kit"
               marketingEvent="subject_guide_cta_clicked"
               marketingProperties={{ subject: subject.slug, position: "landing-footer-secondary" }}
               className="bg-white text-[#0f172a] border-2 border-slate-200 py-5 px-10 rounded-2xl font-black text-lg hover:border-slate-300 transition-all active:scale-[0.98]"
             >
               Get Starter Kit
             </TrackedLink>
          </div>
        </div>
      </InfoSection>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": `Daily Sparks Guide for ${subject.name}`,
            "description": subject.description,
            "author": {
              "@type": "Organization",
              "name": "Daily Sparks",
              "url": "https://dailysparks.geledtech.com"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Growth Education Limited",
              "logo": {
                "@type": "ImageObject",
                "url": "https://dailysparks.geledtech.com/logo.png"
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://dailysparks.geledtech.com/guides/subjects/${subject.slug}`
            }
          })
        }}
      />

      {/* JSON-LD FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": subject.faq.map(item => ({
              "@type": "Question",
              "name": item.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
              }
            }))
          })
        }}
      />
    </InformationalPageShell>
  );
}

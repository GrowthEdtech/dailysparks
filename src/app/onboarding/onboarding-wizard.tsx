"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  User, 
  GraduationCap, 
  NotebookPen, 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  Mail,
  Send
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import type { ParentProfile, Programme } from "../../lib/mvp-types";
import { IB_PROGRAMMES, PROGRAMME_YEAR_OPTIONS } from "../../lib/mvp-types";
import { GOODNOTES_EMAIL_SUFFIX, getGoodnotesLocalPart } from "../../lib/goodnotes-address";
import { trackMarketingEvent } from "../../lib/marketing-analytics";

type OnboardingWizardProps = {
  initialProfile: ParentProfile;
  stripeSessionId: string | null;
};

export default function OnboardingWizard({ initialProfile, stripeSessionId }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Finalize Stripe checkout if redirected from Stripe with a session_id
  useEffect(() => {
    trackMarketingEvent("onboarding_viewed", {
      location: "conversion_funnel",
    });

    if (!stripeSessionId) return;

    async function finalizeCheckout() {
      try {
        await fetch("/api/billing/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: stripeSessionId }),
        });
        trackMarketingEvent("billing_finalize_success", {
          location: "onboarding",
        });
      } catch {
        console.error("Failed to finalize Stripe checkout during onboarding.");
      }
    }

    void finalizeCheckout();
  }, [stripeSessionId]);

  // Step 1 State: Profile
  const [studentName, setStudentName] = useState(initialProfile.student.studentName || "");
  const [programme, setProgramme] = useState<Programme>(
    (initialProfile.student.programme as Programme) || "MYP"
  );
  const [programmeYear, setProgrammeYear] = useState<number>(
    initialProfile.student.programmeYear || 1
  );

  // Step 2 State: Goodnotes
  const [goodnotesLocalPart, setGoodnotesLocalPart] = useState(
    getGoodnotesLocalPart(initialProfile.student.goodnotesEmail)
  );
  const [welcomeNoteSent, setWelcomeNoteSent] = useState(false);

  const yearOptions = useMemo(() => PROGRAMME_YEAR_OPTIONS[programme], [programme]);

  async function handleSaveProfile() {
    if (!studentName.trim()) {
      setError("Please enter your student's name.");
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          programme,
          programmeYear,
          interestTags: initialProfile.student.interestTags || [],
        }),
      });

      if (response.ok) {
        setStep(2);
        trackMarketingEvent("onboarding_profile_completed", { programme });
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to save profile.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSaveGoodnotes() {
    if (!goodnotesLocalPart.trim()) {
      setError("Please enter your Goodnotes email prefix.");
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      // 1. Save Goodnotes destination
      const saveResponse = await fetch("/api/goodnotes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goodnotesEmail: goodnotesLocalPart.trim() }),
      });

      if (!saveResponse.ok) {
        const data = await saveResponse.json();
        throw new Error(data.message || "Failed to save Goodnotes destination.");
      }

      // 2. Send Welcome Note (optional but best for UI feedback)
      await fetch("/api/goodnotes/test", { method: "POST" });
      setWelcomeNoteSent(true);

      trackMarketingEvent("onboarding_goodnotes_completed", { has_test_sent: true });

      // 3. Complete and redirect
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsWorking(false);
    }
  }

  function handleBack() {
    setStep(1);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#00b5d6]/20">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] rounded-full bg-gradient-to-br from-[#00b5d6]/10 to-transparent blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-gradient-to-tr from-[#fbbf24]/5 to-transparent blur-3xl opacity-40" />
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Progress Header */}
        <header className="max-w-xl mx-auto mb-12">
           <div className="flex items-center justify-between mb-8">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                    step >= i ? "bg-[#00b5d6] text-white" : "bg-slate-200 text-slate-400"
                  }`}>
                    {step > i ? <CheckCircle2 className="h-6 w-6" /> : i}
                  </div>
                  {i === 1 && (
                    <div className={`h-1 flex-1 mx-4 rounded-full transition-colors duration-500 ${
                      step > 1 ? "bg-[#00b5d6]" : "bg-slate-200"
                    }`} />
                  )}
                </div>
              ))}
           </div>
           
           <div className="text-center space-y-3">
              <h1 className="text-3xl md:text-4xl font-black text-[#0f172a]">
                {step === 1 ? "Customize the Workflow" : "Connect Your Library"}
              </h1>
              <p className="text-slate-500 font-medium">
                {step === 1 
                  ? "Tell us about your student so we can frame the daily reading." 
                  : "Bind your Goodnotes account to keep notes distraction-free."}
              </p>
           </div>
        </header>

        {/* Content Wizard */}
        <div className="bg-white rounded-[40px] shadow-[0_40px_100px_-40px_rgba(15,23,42,0.1)] border border-slate-100 p-8 md:p-12 max-w-2xl mx-auto">
          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-semibold animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {step === 1 ? (
             <div className="space-y-8 animate-in fade-in duration-500">
                <section className="space-y-4">
                   <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400">Student Name</label>
                   <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-[#00b5d6] transition-colors" />
                      <input 
                        type="text" 
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="e.g. Katherine"
                        className="w-full pl-14 pr-6 py-5 rounded-[22px] bg-slate-50 border-2 border-transparent focus:border-[#00b5d6] focus:bg-white outline-none font-bold text-lg transition-all"
                      />
                   </div>
                </section>

                <div className="grid grid-cols-2 gap-6">
                   <section className="space-y-4">
                      <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400">Programme</label>
                      <div className="relative">
                         <GraduationCap className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                         <select 
                           value={programme}
                           onChange={(e) => {
                             const p = e.target.value as Programme;
                             setProgramme(p);
                             setProgrammeYear(PROGRAMME_YEAR_OPTIONS[p][0]);
                           }}
                           className="w-full pl-14 pr-6 py-5 rounded-[22px] bg-slate-50 border-2 border-transparent focus:border-[#00b5d6] focus:bg-white outline-none font-bold text-lg transition-all appearance-none cursor-pointer"
                         >
                            {IB_PROGRAMMES.filter(p => p !== "PYP").map(p => (
                               <option key={p} value={p}>{p}</option>
                            ))}
                         </select>
                      </div>
                   </section>

                   <section className="space-y-4">
                      <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400">Year</label>
                      <select 
                        value={programmeYear}
                        onChange={(e) => setProgrammeYear(parseInt(e.target.value))}
                        className="w-full px-6 py-5 rounded-[22px] bg-slate-50 border-2 border-transparent focus:border-[#00b5d6] focus:bg-white outline-none font-bold text-lg transition-all appearance-none cursor-pointer"
                      >
                         {yearOptions.map(y => (
                            <option key={y} value={y}>Year {y}</option>
                         ))}
                      </select>
                   </section>
                </div>

                <p className="text-xs text-slate-400 font-bold leading-relaxed px-2">
                   This framing ensures each daily brief is calibrated for the right academic difficulty and context.
                </p>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isWorking}
                  className="w-full group flex items-center justify-center gap-3 rounded-[24px] bg-[#0f172a] py-5 px-8 font-black text-lg text-white shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  {isWorking ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                    <>
                      <span>Continue Setup</span>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
             </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex items-center gap-4 p-5 bg-[#f0fbff] rounded-[28px] border border-[#00b5d6]/10">
                  <Image 
                    src="/integrations/goodnotes.jpeg" 
                    alt="Goodnotes" 
                    width={48} 
                    height={48} 
                    className="rounded-xl shadow-sm"
                  />
                  <div>
                    <h3 className="font-black text-[#0f172a]">Goodnotes Delivery</h3>
                    <p className="text-xs text-slate-500 font-medium">Standard for IB Digital Habit Building</p>
                  </div>
               </div>

               <section className="space-y-4">
                  <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400">Goodnotes Destination</label>
                  <div className="flex items-stretch overflow-hidden rounded-[22px] border-2 border-slate-100 bg-slate-50 focus-within:border-[#00b5d6] focus-within:bg-white transition-all">
                     <input 
                       type="text" 
                       value={goodnotesLocalPart}
                       onChange={(e) => setGoodnotesLocalPart(e.target.value)}
                       placeholder="e.g. katherine"
                       className="flex-1 px-6 py-5 bg-transparent outline-none font-bold text-lg"
                     />
                     <span className="flex items-center px-6 bg-slate-100 text-slate-500 font-black text-sm border-l-2 border-slate-200">
                        {GOODNOTES_EMAIL_SUFFIX}
                     </span>
                  </div>
               </section>

               <div className="space-y-4">
                  <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-[28px]">
                     <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-[#00b5d6]" />
                     </div>
                     <p className="text-sm font-semibold text-slate-600 leading-relaxed">
                        We send your daily briefs into this "Digital Inbox" so students can read and reflect without seeing social media or email notifications.
                     </p>
                  </div>
               </div>

                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={handleSaveGoodnotes}
                    disabled={isWorking}
                    className="w-full group flex items-center justify-center gap-3 rounded-[24px] bg-[#00b5d6] py-5 px-8 font-black text-lg text-white shadow-xl shadow-[#00b5d6]/20 hover:bg-[#009aba] transition-all active:scale-[0.98]"
                  >
                    {isWorking ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                      <>
                        <span>Complete & Enter Dashboard</span>
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isWorking}
                    className="w-full py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                  >
                    Back to profile
                  </button>
                </div>
                
                <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">
                   By completing this, you start your habit routine<br/>immediately in your Goodnotes library.
                </p>
            </div>
          )}
        </div>

        {/* Support */}
        <p className="mt-12 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
           Need help? Reach us at support@dailysparks.geledtech.com
        </p>
      </main>
    </div>
  );
}

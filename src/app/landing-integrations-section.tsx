import Image from "next/image";

import {
  landingIntegrationsFootnote,
  supportedIntegrations,
} from "./home-content";

export default function LandingIntegrationsSection() {
  return (
    <section className="relative overflow-hidden border-t border-slate-100 bg-[#f8fafc] px-6 py-24 text-[#0f172a]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_48%),radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_42%)]" />

      <div className="relative mx-auto max-w-6xl space-y-10">
        <div className="space-y-4 md:space-y-5">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.32em] text-[#d39b1b]">
            Delivery options
          </p>
          <h2 className="text-balance text-4xl font-extrabold leading-[0.96] tracking-[-0.05em] text-[#0f172a] sm:text-[3.2rem] md:text-[3.55rem] xl:max-w-none xl:text-[3rem] xl:whitespace-nowrap">
            Daily Sparks works with the tools families already use.
          </h2>
          <p className="max-w-3xl text-pretty text-[1.02rem] leading-[1.8] text-slate-500 md:max-w-none md:text-[1.06rem] lg:max-w-none">
            Use Goodnotes for direct student delivery, Notion for family archiving,
            or combine both when you want daily reading plus a searchable record.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_44%,#f8fafc_100%)] p-6 shadow-[0_30px_90px_-56px_rgba(15,23,42,0.46)] xl:p-8">
          <div className="pointer-events-none absolute -right-12 top-0 h-36 w-36 rounded-full bg-[#fff1c4] blur-3xl opacity-80" />
          <div className="pointer-events-none absolute -left-12 bottom-10 h-32 w-32 rounded-full bg-[#d8f2f8] blur-3xl opacity-80" />

          <div className="relative">
            <div className="space-y-3 md:space-y-4">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-slate-400">
                Works with
              </p>
              <h3 className="text-balance text-[1.9rem] font-bold leading-[1.04] tracking-[-0.04em] text-[#0f172a] md:max-w-none md:text-[2.05rem] xl:max-w-none xl:text-[2.15rem]">
                Choose the setup that fits how your family reads and keeps records.
              </h3>
              <p className="max-w-2xl text-pretty text-sm leading-6 text-slate-500 md:text-[0.98rem] md:leading-7">
                Goodnotes is the student-facing delivery path. Notion is the
                parent-facing archive. Pick one or combine both.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {supportedIntegrations.map((integration) => {
                const isGoodnotes = integration.name === "Goodnotes";

                return (
                  <div
                    key={integration.name}
                    className={`rounded-[26px] border px-5 py-5 shadow-[0_14px_40px_-34px_rgba(15,23,42,0.34)] ${
                      isGoodnotes
                        ? "border-[#bee8f2] bg-[linear-gradient(180deg,#f6fdff_0%,#eefaff_100%)]"
                        : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
                    }`}
                  >
                    <div className="space-y-4">
                      <span className="inline-flex rounded-full border border-white/90 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                        {integration.role}
                      </span>
                      <div className="rounded-[20px] border border-white/85 bg-white px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                        <Image
                          src={integration.logoSrc}
                          alt={integration.logoAlt}
                          width={integration.logoWidth}
                          height={integration.logoHeight}
                          className={`h-auto w-auto max-w-full object-contain ${
                            isGoodnotes ? "max-h-8" : "max-h-9"
                          }`}
                        />
                      </div>
                      <p className="text-sm font-semibold leading-6 tracking-[-0.015em] text-slate-700">
                        {integration.bestWhen}
                      </p>
                      <p className="text-sm leading-6 text-slate-500">
                        {integration.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-[24px] border border-slate-200/90 bg-white/90 px-5 py-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.34)]">
              <p className="text-sm leading-6 text-slate-600">
                <span className="font-semibold tracking-[-0.015em] text-slate-800">
                  Use one or both.
                </span>{" "}
                Start with the tool your family already trusts, then add the
                second when you want both daily delivery and a long-term record.
              </p>
            </div>

            <p className="mt-4 text-xs leading-6 text-slate-400">
              {landingIntegrationsFootnote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

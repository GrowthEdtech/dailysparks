import Image from "next/image";

import {
  deliveryOptions,
  landingIntegrationsFootnote,
  supportedIntegrations,
} from "./home-content";

const integrationHighlights = [
  "Student-ready delivery",
  "Searchable family archive",
  "No extra child login",
] as const;

export default function LandingIntegrationsSection() {
  return (
    <section className="relative overflow-hidden border-t border-slate-100 bg-[#f8fafc] px-6 py-24 text-[#0f172a]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_48%),radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_42%)]" />

      <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(22rem,0.96fr)] lg:items-start">
        <div className="space-y-7">
          <div className="max-w-2xl space-y-4">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.32em] text-[#d39b1b]">
              Delivery options
            </p>
            <h2 className="max-w-[11ch] text-3xl font-extrabold leading-[0.95] tracking-[-0.045em] text-[#0f172a] md:text-[3.45rem]">
              Daily Sparks works with the tools families already use.
            </h2>
            <p className="max-w-xl text-[1.02rem] leading-[1.8] text-slate-500">
              Use Goodnotes for direct student delivery, Notion for family archiving,
              or combine both when you want daily reading plus a searchable record.
            </p>
          </div>

          <div className="grid gap-3">
            {deliveryOptions.map((option) => {
              const Icon = option.icon;

              return (
                <div
                  key={option.title}
                  className="rounded-[24px] border border-slate-200/90 bg-white/92 px-5 py-4 shadow-[0_18px_52px_-44px_rgba(15,23,42,0.38)] backdrop-blur-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#fff8e6_0%,#fff2c8_100%)] text-[#0f172a] shadow-[0_8px_18px_-14px_rgba(251,191,36,0.8)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[1.02rem] font-bold tracking-[-0.02em] text-[#0f172a]">
                        {option.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">
                        {option.description}
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-slate-500">
                        {option.detail}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_44%,#f8fafc_100%)] p-6 shadow-[0_30px_90px_-56px_rgba(15,23,42,0.46)]">
          <div className="pointer-events-none absolute -right-12 top-0 h-36 w-36 rounded-full bg-[#fff1c4] blur-3xl opacity-80" />
          <div className="pointer-events-none absolute -left-12 bottom-10 h-32 w-32 rounded-full bg-[#d8f2f8] blur-3xl opacity-80" />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-md space-y-2">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-slate-400">
                  Works with
                </p>
                <h3 className="text-[1.9rem] font-bold leading-[1.02] tracking-[-0.04em] text-[#0f172a]">
                  Deliver to one app, archive in another, or run both together.
                </h3>
              </div>
              <span className="rounded-full border border-[#f3d78b] bg-[#fff7df] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6116] shadow-sm">
                Family-friendly setup
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {integrationHighlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-full border border-white/80 bg-white/85 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.5)]"
                >
                  {highlight}
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {supportedIntegrations.map((integration) => {
                const isGoodnotes = integration.name === "Goodnotes";

                return (
                  <div
                    key={integration.name}
                    className={`rounded-[26px] border px-4 py-4 shadow-[0_14px_40px_-34px_rgba(15,23,42,0.34)] ${
                      isGoodnotes
                        ? "border-[#bee8f2] bg-[linear-gradient(180deg,#f6fdff_0%,#eefaff_100%)]"
                        : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
                    }`}
                  >
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.85fr)] sm:items-center">
                      <div className="space-y-3">
                        <span className="inline-flex rounded-full border border-white/90 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                          {integration.role}
                        </span>
                        <div className="rounded-[20px] border border-white/85 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
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
                      </div>
                      <p className="text-sm leading-6 text-slate-500">
                        {integration.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-[24px] border border-slate-200/90 bg-white/90 px-4 py-3 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.34)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-md text-sm font-semibold leading-6 tracking-[-0.015em] text-slate-700">
                  Start with the tool your family already trusts, then layer the
                  second workflow only when you want both daily delivery and a
                  long-term record.
                </p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Premium but simple
                </span>
              </div>
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

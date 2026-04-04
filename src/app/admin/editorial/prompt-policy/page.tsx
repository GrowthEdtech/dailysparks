import Link from "next/link";

import { listPromptPolicies } from "../../../../lib/prompt-policy-store";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not activated yet";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

const ACTIVE_POLICY_LINK_STYLE = { color: "#0f172a" } as const;

export default async function PromptPolicyAdminPage() {
  const policies = await listPromptPolicies();
  const activePolicy = policies.find((policy) => policy.status === "active") ?? null;

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
            Prompt policy
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
            Manage the programme rules that shape Daily Sparks generation.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Keep prompt strategy separate from model infrastructure. This tab is
            where the team edits shared editorial guidance plus the specific
            prompt rules for PYP, MYP, and DP.
          </p>
        </div>

        <Link
          href="/admin/editorial/prompt-policy/new"
          className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
        >
          Create new draft
        </Link>
      </div>

      {policies.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
          <h3 className="text-xl font-bold tracking-tight text-[#0f172a]">
            No prompt policies yet
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Create the first active policy to define the shared, anti-repetition,
            and programme-specific rules that Daily Sparks will use for
            generation.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {activePolicy ? (
            <article className="rounded-[28px] border border-[#dbeafe] bg-[#eff6ff] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                Active prompt policy
              </p>
              <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#0f172a]">
                    {activePolicy.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {activePolicy.versionLabel}
                  </p>
                </div>
                <Link
                  href={`/admin/editorial/prompt-policy/${activePolicy.id}`}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] shadow-[0_10px_24px_-24px_rgba(15,23,42,0.5)] transition hover:border-slate-400 hover:bg-slate-50 hover:text-[#0f172a]"
                  style={ACTIVE_POLICY_LINK_STYLE}
                >
                  Open active policy
                </Link>
              </div>
            </article>
          ) : null}

          <div className="grid gap-4">
            {policies.map((policy) => (
              <article
                key={policy.id}
                className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {policy.status}
                      </span>
                    </div>
                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-[#0f172a]">
                      {policy.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {policy.versionLabel}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {policy.notes || "No notes recorded yet."}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    <p className="font-semibold text-[#0f172a]">Updated</p>
                    <p>{formatTimestamp(policy.updatedAt)}</p>
                    <p className="mt-3 font-semibold text-[#0f172a]">Activated</p>
                    <p>{formatTimestamp(policy.activatedAt)}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/admin/editorial/prompt-policy/${policy.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                  >
                    Open prompt policy
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import PromptPolicyPanel from "../prompt-policy-panel";
import {
  buildDefaultPromptPolicyInput,
  buildResolvedPromptPreviewByProgramme,
  getPromptPolicy,
} from "../../../../../lib/prompt-policy-store";

type PromptPolicyDetailPageProps = {
  params: Promise<{
    policyId: string;
  }>;
  searchParams: Promise<{
    duplicateFrom?: string;
  }>;
};

function buildNewPolicyRecord(
  duplicateSource:
    | Awaited<ReturnType<typeof getPromptPolicy>>
    | null,
) {
  const template = duplicateSource
    ? {
        name: duplicateSource.name,
        versionLabel: `${duplicateSource.versionLabel}-draft`,
        sharedInstructions: duplicateSource.sharedInstructions,
        antiRepetitionInstructions: duplicateSource.antiRepetitionInstructions,
        outputContractInstructions: duplicateSource.outputContractInstructions,
        pypInstructions: duplicateSource.pypInstructions,
        mypInstructions: duplicateSource.mypInstructions,
        dpInstructions: duplicateSource.dpInstructions,
        notes: duplicateSource.notes,
      }
    : buildDefaultPromptPolicyInput();

  return {
    id: "new",
    ...template,
    status: "draft" as const,
    createdAt: "",
    updatedAt: "",
    activatedAt: null,
  };
}

export default async function PromptPolicyDetailPage({
  params,
  searchParams,
}: PromptPolicyDetailPageProps) {
  const { policyId } = await params;
  const { duplicateFrom } = await searchParams;

  const policy =
    policyId === "new"
      ? buildNewPolicyRecord(
          duplicateFrom ? await getPromptPolicy(duplicateFrom) : null,
        )
      : await getPromptPolicy(policyId);

  if (!policy) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/admin/editorial/prompt-policy"
              className="text-sm font-semibold text-slate-500 transition hover:text-[#0f172a]"
            >
              Back to Prompt Policy
            </Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
              Prompt policy record
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
              {policy.name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Version {policy.versionLabel}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            <p className="font-semibold text-[#0f172a]">Status</p>
            <p>{policy.status}</p>
          </div>
        </div>
      </div>

      <PromptPolicyPanel
        policy={policy}
        resolvedPreviewByProgramme={buildResolvedPromptPreviewByProgramme(policy)}
      />
    </section>
  );
}

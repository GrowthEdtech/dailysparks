"use client";

import { useState } from "react";

import type {
  PromptPolicyRecord,
  PromptPolicyResolvedPreviewByProgramme,
} from "../../../../lib/prompt-policy-schema";

type PromptPolicyPanelProps = {
  policy: PromptPolicyRecord;
  resolvedPreviewByProgramme: PromptPolicyResolvedPreviewByProgramme;
};

type PromptPolicyFormState = {
  name: string;
  versionLabel: string;
  sharedInstructions: string;
  antiRepetitionInstructions: string;
  outputContractInstructions: string;
  pypInstructions: string;
  mypInstructions: string;
  dpInstructions: string;
  notes: string;
};

type PolicyActionResponse = {
  message?: string;
  policy?: PromptPolicyRecord;
};

function toFormState(policy: PromptPolicyRecord): PromptPolicyFormState {
  return {
    name: policy.name,
    versionLabel: policy.versionLabel,
    sharedInstructions: policy.sharedInstructions,
    antiRepetitionInstructions: policy.antiRepetitionInstructions,
    outputContractInstructions: policy.outputContractInstructions,
    pypInstructions: policy.pypInstructions,
    mypInstructions: policy.mypInstructions,
    dpInstructions: policy.dpInstructions,
    notes: policy.notes,
  };
}

async function readJsonResponse(response: Response) {
  return (await response.json().catch(() => null)) as PolicyActionResponse | null;
}

export default function PromptPolicyPanel({
  policy,
  resolvedPreviewByProgramme,
}: PromptPolicyPanelProps) {
  const isNewPolicy = policy.id === "new";
  const isDraft = policy.status === "draft";
  const isActive = policy.status === "active";
  const isEditable = isNewPolicy || isDraft;

  const [draft, setDraft] = useState(() => toFormState(policy));
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  function updateField(
    field: keyof PromptPolicyFormState,
    value: string,
  ) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  async function handleSave() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/prompt-policies", {
        method: isNewPolicy ? "POST" : "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(
          isNewPolicy
            ? draft
            : {
                id: policy.id,
                ...draft,
              },
        ),
      });
      const body = await readJsonResponse(response);

      if (!response.ok || !body?.policy) {
        setErrorMessage(body?.message ?? "We could not save this prompt policy.");
        setIsSaving(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.location.assign(`/admin/editorial/prompt-policy/${body.policy.id}`);
      }
    } catch {
      setErrorMessage("We could not reach the prompt policy admin API.");
      setIsSaving(false);
    }
  }

  async function handleActivate() {
    if (isNewPolicy) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsActivating(true);

    try {
      const response = await fetch("/api/admin/prompt-policies/activate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ id: policy.id }),
      });
      const body = await readJsonResponse(response);

      if (!response.ok || !body?.policy) {
        setErrorMessage(body?.message ?? "We could not activate this prompt policy.");
        setIsActivating(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      setErrorMessage("We could not activate this prompt policy right now.");
      setIsActivating(false);
    }
  }

  async function handleArchive() {
    if (isNewPolicy) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsArchiving(true);

    try {
      const response = await fetch("/api/admin/prompt-policies/archive", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ id: policy.id }),
      });
      const body = await readJsonResponse(response);

      if (!response.ok || !body?.policy) {
        setErrorMessage(body?.message ?? "We could not archive this prompt policy.");
        setIsArchiving(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      setErrorMessage("We could not archive this prompt policy right now.");
      setIsArchiving(false);
    }
  }

  async function handleDuplicate() {
    if (isNewPolicy) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsDuplicating(true);

    try {
      const response = await fetch("/api/admin/prompt-policies/duplicate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ id: policy.id }),
      });
      const body = await readJsonResponse(response);

      if (!response.ok || !body?.policy) {
        setErrorMessage(body?.message ?? "We could not duplicate this prompt policy.");
        setIsDuplicating(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.location.assign(`/admin/editorial/prompt-policy/${body.policy.id}`);
      }
    } catch {
      setErrorMessage("We could not duplicate this prompt policy right now.");
      setIsDuplicating(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.95fr)]">
      <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
              Prompt policy editor
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Drafts can be edited directly. Active policies must be duplicated
              before changes are made.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isEditable ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save draft"}
              </button>
            ) : null}
            {!isNewPolicy && isDraft ? (
              <button
                type="button"
                onClick={handleActivate}
                disabled={isActivating}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] disabled:opacity-60"
              >
                {isActivating ? "Activating..." : "Activate"}
              </button>
            ) : null}
            {!isNewPolicy && isDraft ? (
              <button
                type="button"
                onClick={handleArchive}
                disabled={isArchiving}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] disabled:opacity-60"
              >
                {isArchiving ? "Archiving..." : "Archive"}
              </button>
            ) : null}
            {!isNewPolicy && isActive ? (
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={isDuplicating}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] disabled:opacity-60"
              >
                {isDuplicating ? "Duplicating..." : "Duplicate as new draft"}
              </button>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <div className="mt-6 grid gap-6">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#0f172a]">Name</span>
            <input
              value={draft.name}
              onChange={(event) => updateField("name", event.target.value)}
              disabled={!isEditable}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-[#0f172a] disabled:bg-slate-50"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#0f172a]">
              Version label
            </span>
            <input
              value={draft.versionLabel}
              onChange={(event) =>
                updateField("versionLabel", event.target.value)
              }
              disabled={!isEditable}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-[#0f172a] disabled:bg-slate-50"
            />
          </label>

          {[
            ["sharedInstructions", "Shared instructions"],
            ["antiRepetitionInstructions", "Anti-repetition instructions"],
            ["outputContractInstructions", "Output contract instructions"],
            ["pypInstructions", "PYP instructions"],
            ["mypInstructions", "MYP instructions"],
            ["dpInstructions", "DP instructions"],
            ["notes", "Notes"],
          ].map(([field, label]) => (
            <label key={field} className="grid gap-2">
              <span className="text-sm font-semibold text-[#0f172a]">
                {label}
              </span>
              <textarea
                value={draft[field as keyof PromptPolicyFormState]}
                onChange={(event) =>
                  updateField(
                    field as keyof PromptPolicyFormState,
                    event.target.value,
                  )
                }
                disabled={!isEditable}
                rows={field === "notes" ? 4 : 6}
                className="rounded-[24px] border border-slate-200 px-4 py-3 text-sm leading-6 text-[#0f172a] disabled:bg-slate-50"
              />
            </label>
          ))}
        </div>
      </article>

      <aside className="space-y-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Resolved prompt preview
          </h2>
          <div className="mt-4 space-y-4">
            {(
              Object.entries(resolvedPreviewByProgramme) as Array<
                [keyof PromptPolicyResolvedPreviewByProgramme, string]
              >
            ).map(([programme, preview]) => (
              <article
                key={programme}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {programme}
                </p>
                <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {preview}
                </pre>
              </article>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}

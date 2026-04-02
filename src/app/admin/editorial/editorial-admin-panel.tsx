"use client";

import { BookMarked, RefreshCcw, Save, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import type { DailySparksRepetitionPolicy } from "../../../lib/editorial-policy";
import type {
  EditorialIngestionMode,
  EditorialSourceRecord,
} from "../../../lib/editorial-source-store";

type EditorialAdminPanelProps = {
  initialSources: EditorialSourceRecord[];
  repetitionPolicy: DailySparksRepetitionPolicy;
};

type SourceFormState = {
  name: string;
  domain: string;
  homepage: string;
  roles: EditorialSourceRecord["roles"];
  usageTiers: EditorialSourceRecord["usageTiers"];
  recommendedProgrammes: EditorialSourceRecord["recommendedProgrammes"];
  sectionsText: string;
  ingestionMode: EditorialIngestionMode;
  active: boolean;
  notes: string;
};

const SOURCE_ROLE_OPTIONS: Array<{
  value: EditorialSourceRecord["roles"][number];
  label: string;
}> = [
  { value: "daily-news", label: "Daily news" },
  { value: "explainer", label: "Explainer" },
  { value: "pyp-friendly", label: "PYP-friendly" },
  { value: "source-of-record", label: "Source of record" },
];

const USAGE_TIER_OPTIONS: Array<{
  value: EditorialSourceRecord["usageTiers"][number];
  label: string;
}> = [
  { value: "primary-selection", label: "Primary selection" },
  { value: "background-context", label: "Background context" },
  { value: "fact-check", label: "Fact-check" },
];

const PROGRAMME_OPTIONS: Array<{
  value: EditorialSourceRecord["recommendedProgrammes"][number];
  label: string;
}> = [
  { value: "PYP", label: "PYP" },
  { value: "MYP", label: "MYP" },
  { value: "DP", label: "DP" },
];

const DEFAULT_CREATE_FORM: SourceFormState = {
  name: "",
  domain: "",
  homepage: "",
  roles: ["explainer"],
  usageTiers: ["background-context"],
  recommendedProgrammes: ["MYP"],
  sectionsText: "",
  ingestionMode: "metadata-only",
  active: true,
  notes: "",
};

function parseSectionsInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleValue<T extends string>(values: T[], targetValue: T) {
  return values.includes(targetValue)
    ? values.filter((value) => value !== targetValue)
    : [...values, targetValue];
}

function toSourceFormState(source: EditorialSourceRecord): SourceFormState {
  return {
    name: source.name,
    domain: source.domain,
    homepage: source.homepage,
    roles: source.roles,
    usageTiers: source.usageTiers,
    recommendedProgrammes: source.recommendedProgrammes,
    sectionsText: source.sections.join(", "),
    ingestionMode: source.ingestionMode,
    active: source.active,
    notes: source.notes,
  };
}

function toRequestBody(source: SourceFormState) {
  return {
    name: source.name,
    domain: source.domain,
    homepage: source.homepage,
    roles: source.roles,
    usageTiers: source.usageTiers,
    recommendedProgrammes: source.recommendedProgrammes,
    sections: parseSectionsInput(source.sectionsText),
    ingestionMode: source.ingestionMode,
    active: source.active,
    notes: source.notes,
  };
}

function SourceCheckboxGroup<T extends string>({
  legend,
  options,
  selectedValues,
  onToggle,
}: {
  legend: string;
  options: Array<{ value: T; label: string }>;
  selectedValues: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {legend}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selectedValues.includes(option.value);

          return (
            <label
              key={option.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-[#0f172a] bg-[#0f172a] text-white"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={active}
                onChange={() => onToggle(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function EditorialAdminPanel({
  initialSources,
  repetitionPolicy,
}: EditorialAdminPanelProps) {
  const [sources, setSources] = useState(initialSources);
  const [draftsById, setDraftsById] = useState<Record<string, SourceFormState>>(
    () =>
      Object.fromEntries(
        initialSources.map((source) => [source.id, toSourceFormState(source)]),
      ),
  );
  const [createDraft, setCreateDraft] = useState<SourceFormState>(
    DEFAULT_CREATE_FORM,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [savingSourceId, setSavingSourceId] = useState("");

  const sourceCountBadge = useMemo(
    () => `${sources.length} managed sources`,
    [sources.length],
  );

  function updateDraftSource(
    sourceId: string,
    updater: (current: SourceFormState) => SourceFormState,
  ) {
    setDraftsById((currentDrafts) => ({
      ...currentDrafts,
      [sourceId]: updater(
        currentDrafts[sourceId] ?? toSourceFormState(
          sources.find((source) => source.id === sourceId)!,
        ),
      ),
    }));
  }

  async function handleCreate() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsCreating(true);

    try {
      const response = await fetch("/api/admin/editorial-sources", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(toRequestBody(createDraft)),
      });
      const body = (await response.json().catch(() => null)) as
        | { source?: EditorialSourceRecord; message?: string }
        | null;

      if (!response.ok || !body?.source) {
        setErrorMessage(body?.message ?? "We could not create the editorial source.");
        setIsCreating(false);
        return;
      }

      const nextSource = body.source;

      setSources((currentSources) => [...currentSources, nextSource]);
      setDraftsById((currentDrafts) => ({
        ...currentDrafts,
        [nextSource.id]: toSourceFormState(nextSource),
      }));
      setCreateDraft(DEFAULT_CREATE_FORM);
      setSuccessMessage("Editorial source added.");
      setIsCreating(false);
    } catch {
      setErrorMessage("We could not reach the editorial admin API.");
      setIsCreating(false);
    }
  }

  async function handleSaveSource(sourceId: string) {
    const sourceDraft = draftsById[sourceId];

    if (!sourceDraft) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setSavingSourceId(sourceId);

    try {
      const response = await fetch("/api/admin/editorial-sources", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: sourceId,
          ...toRequestBody(sourceDraft),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { source?: EditorialSourceRecord; message?: string }
        | null;

      if (!response.ok || !body?.source) {
        setErrorMessage(body?.message ?? "We could not save this source.");
        setSavingSourceId("");
        return;
      }

      const nextSource = body.source;

      setSources((currentSources) =>
        currentSources.map((source) =>
          source.id === sourceId ? nextSource : source,
        ),
      );
      setDraftsById((currentDrafts) => ({
        ...currentDrafts,
        [sourceId]: toSourceFormState(nextSource),
      }));
      setSuccessMessage(`Saved ${nextSource.name}.`);
      setSavingSourceId("");
    } catch {
      setErrorMessage("We could not save this source right now.");
      setSavingSourceId("");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
              Editorial operations
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
              Editorial source registry
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Register, pause, and tune the media sources that feed Daily Sparks
              reading generation. This MVP manages the source layer first, so the
              content pipeline can stay curated without requiring a code deploy for
              every editorial change.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <BookMarked className="h-3.5 w-3.5" />
              {sourceCountBadge}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#eefbf3] px-3 py-1.5 text-xs font-semibold text-[#15803d]">
              <ShieldCheck className="h-3.5 w-3.5" />
              {repetitionPolicy.sourceReuse.windowDays}-day source balance
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fff7dd] px-3 py-1.5 text-xs font-semibold text-[#b45309]">
              <RefreshCcw className="h-3.5 w-3.5" />
              {repetitionPolicy.topicReuse.windowDays}-day topic reset
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] px-3 py-1.5 text-xs font-semibold text-[#1d4ed8]">
              <RefreshCcw className="h-3.5 w-3.5" />
              {repetitionPolicy.questionTemplateReuse.windowDays}-day prompt memory
            </span>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#0f172a]">Add source</h2>
            <p className="mt-1 text-sm text-slate-500">
              Register a new publication or institutional source before it enters
              the candidate pipeline.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Name</span>
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              value={createDraft.name}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="The Conversation"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Domain</span>
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              value={createDraft.domain}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  domain: event.target.value,
                }))
              }
              placeholder="theconversation.com"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Homepage</span>
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              value={createDraft.homepage}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  homepage: event.target.value,
                }))
              }
              placeholder="https://theconversation.com/"
            />
          </label>

          <SourceCheckboxGroup
            legend="Source roles"
            options={SOURCE_ROLE_OPTIONS}
            selectedValues={createDraft.roles}
            onToggle={(value) =>
              setCreateDraft((current) => ({
                ...current,
                roles: toggleValue(current.roles, value),
              }))
            }
          />

          <SourceCheckboxGroup
            legend="Usage tiers"
            options={USAGE_TIER_OPTIONS}
            selectedValues={createDraft.usageTiers}
            onToggle={(value) =>
              setCreateDraft((current) => ({
                ...current,
                usageTiers: toggleValue(current.usageTiers, value),
              }))
            }
          />

          <SourceCheckboxGroup
            legend="Programme fit"
            options={PROGRAMME_OPTIONS}
            selectedValues={createDraft.recommendedProgrammes}
            onToggle={(value) =>
              setCreateDraft((current) => ({
                ...current,
                recommendedProgrammes: toggleValue(
                  current.recommendedProgrammes,
                  value,
                ),
              }))
            }
          />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Ingestion mode
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              value={createDraft.ingestionMode}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  ingestionMode: event.target.value as EditorialIngestionMode,
                }))
              }
            >
              <option value="metadata-only">Metadata only</option>
              <option value="summary-link">Summary + link</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">
              Sections / channels
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              value={createDraft.sectionsText}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  sectionsText: event.target.value,
                }))
              }
              placeholder="science, education, world"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Notes</span>
            <textarea
              className="min-h-[104px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              value={createDraft.notes}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Why this source belongs in the Daily Sparks pipeline."
            />
          </label>

          <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={createDraft.active}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  active: event.target.checked,
                }))
              }
            />
            Source is active
          </label>
        </div>

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={isCreating}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isCreating ? "Adding source..." : "Add source"}
        </button>
      </section>

      <section className="grid gap-4">
        {sources.map((source) => {
          const draft = draftsById[source.id] ?? toSourceFormState(source);
          const isSaving = savingSourceId === source.id;

          return (
            <article
              key={source.id}
              className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-[#0f172a]">
                      {source.name}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        draft.active
                          ? "bg-[#eefbf3] text-[#15803d]"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {draft.active ? "Active" : "Inactive"}
                    </span>
                    {source.seededFromPolicy ? (
                      <span className="rounded-full bg-[#fff7dd] px-3 py-1 text-xs font-semibold text-[#b45309]">
                        Seeded from policy
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{source.domain}</p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSaveSource(source.id)}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save source"}
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">Name</span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.name}
                    onChange={(event) =>
                      updateDraftSource(source.id, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Domain
                  </span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.domain}
                    onChange={(event) =>
                      updateDraftSource(source.id, (current) => ({
                        ...current,
                        domain: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Homepage
                  </span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.homepage}
                    onChange={(event) =>
                      updateDraftSource(source.id, (current) => ({
                        ...current,
                        homepage: event.target.value,
                      }))
                    }
                  />
                </label>

                <SourceCheckboxGroup
                  legend="Source roles"
                  options={SOURCE_ROLE_OPTIONS}
                  selectedValues={draft.roles}
                  onToggle={(value) =>
                    updateDraftSource(source.id, (current) => ({
                      ...current,
                      roles: toggleValue(current.roles, value),
                    }))
                  }
                />

                <SourceCheckboxGroup
                  legend="Usage tiers"
                  options={USAGE_TIER_OPTIONS}
                  selectedValues={draft.usageTiers}
                  onToggle={(value) =>
                    updateDraftSource(source.id, (current) => ({
                      ...current,
                      usageTiers: toggleValue(current.usageTiers, value),
                    }))
                  }
                />

                <SourceCheckboxGroup
                  legend="Programme fit"
                  options={PROGRAMME_OPTIONS}
                  selectedValues={draft.recommendedProgrammes}
                  onToggle={(value) =>
                    updateDraftSource(source.id, (current) => ({
                      ...current,
                      recommendedProgrammes: toggleValue(
                        current.recommendedProgrammes,
                        value,
                      ),
                    }))
                  }
                />

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Ingestion mode
                  </span>
                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.ingestionMode}
                    onChange={(event) =>
                      updateDraftSource(source.id, (current) => ({
                        ...current,
                        ingestionMode: event.target
                          .value as EditorialIngestionMode,
                      }))
                    }
                  >
                    <option value="metadata-only">Metadata only</option>
                    <option value="summary-link">Summary + link</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Sections / channels
                  </span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.sectionsText}
                    onChange={(event) =>
                      updateDraftSource(source.id, (current) => ({
                        ...current,
                        sectionsText: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Notes
                  </span>
                  <textarea
                    className="min-h-[104px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.notes}
                    onChange={(event) =>
                      updateDraftSource(source.id, (current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(event) =>
                      updateDraftSource(source.id, (current) => ({
                        ...current,
                        active: event.target.checked,
                      }))
                    }
                  />
                  Source is active
                </label>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

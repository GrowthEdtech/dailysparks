"use client";

import { BrainCircuit, Save, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  DEFAULT_AI_CONNECTION_BASE_URL,
  DEFAULT_AI_CONNECTION_MODEL,
  type AiConnectionProviderType,
  type AiConnectionRecord,
} from "../../../lib/ai-connection-schema";

type AiConnectionsPanelProps = {
  initialConnections: AiConnectionRecord[];
};

type ConnectionFormState = {
  name: string;
  providerType: AiConnectionProviderType;
  baseUrl: string;
  defaultModel: string;
  active: boolean;
  isDefault: boolean;
  notes: string;
  apiKey: string;
};

const DEFAULT_CREATE_FORM: ConnectionFormState = {
  name: "",
  providerType: "openai-compatible",
  baseUrl: DEFAULT_AI_CONNECTION_BASE_URL,
  defaultModel: DEFAULT_AI_CONNECTION_MODEL,
  active: true,
  isDefault: false,
  notes: "",
  apiKey: "",
};

function toConnectionFormState(connection: AiConnectionRecord): ConnectionFormState {
  return {
    name: connection.name,
    providerType: connection.providerType,
    baseUrl: connection.baseUrl,
    defaultModel: connection.defaultModel,
    active: connection.active,
    isDefault: connection.isDefault,
    notes: connection.notes,
    apiKey: "",
  };
}

function toRequestBody(connection: ConnectionFormState) {
  return {
    name: connection.name,
    providerType: connection.providerType,
    baseUrl: connection.baseUrl,
    defaultModel: connection.defaultModel,
    active: connection.active,
    isDefault: connection.isDefault,
    notes: connection.notes,
    ...(connection.apiKey.trim() ? { apiKey: connection.apiKey } : {}),
  };
}

export default function AiConnectionsPanel({
  initialConnections,
}: AiConnectionsPanelProps) {
  const [connections, setConnections] = useState(initialConnections);
  const [draftsById, setDraftsById] = useState<Record<string, ConnectionFormState>>(
    () =>
      Object.fromEntries(
        initialConnections.map((connection) => [
          connection.id,
          toConnectionFormState(connection),
        ]),
      ),
  );
  const [createDraft, setCreateDraft] = useState(DEFAULT_CREATE_FORM);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [savingConnectionId, setSavingConnectionId] = useState("");
  const [deletingConnectionId, setDeletingConnectionId] = useState("");

  const activeCountBadge = useMemo(
    () => `${connections.filter((connection) => connection.active).length} active`,
    [connections],
  );

  function updateDraftConnection(
    connectionId: string,
    updater: (current: ConnectionFormState) => ConnectionFormState,
  ) {
    setDraftsById((currentDrafts) => ({
      ...currentDrafts,
      [connectionId]: updater(
        currentDrafts[connectionId] ??
          toConnectionFormState(
            connections.find((connection) => connection.id === connectionId)!,
          ),
      ),
    }));
  }

  async function handleCreate() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsCreating(true);

    try {
      const response = await fetch("/api/admin/ai-connections", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(toRequestBody(createDraft)),
      });
      const body = (await response.json().catch(() => null)) as
        | { connection?: AiConnectionRecord; message?: string }
        | null;

      if (!response.ok || !body?.connection) {
        setErrorMessage(body?.message ?? "We could not create the AI connection.");
        setIsCreating(false);
        return;
      }

      const nextConnection = body.connection;
      setConnections((currentConnections) =>
        nextConnection.isDefault
          ? [
              ...currentConnections.map((connection) => ({
                ...connection,
                isDefault: false,
              })),
              nextConnection,
            ]
          : [...currentConnections, nextConnection],
      );
      setDraftsById((currentDrafts) => ({
        ...currentDrafts,
        [nextConnection.id]: toConnectionFormState(nextConnection),
      }));
      setCreateDraft(DEFAULT_CREATE_FORM);
      setSuccessMessage("AI connection added.");
      setIsCreating(false);
    } catch {
      setErrorMessage("We could not reach the AI connections admin API.");
      setIsCreating(false);
    }
  }

  async function handleSave(connectionId: string) {
    const connectionDraft = draftsById[connectionId];

    if (!connectionDraft) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setSavingConnectionId(connectionId);

    try {
      const response = await fetch("/api/admin/ai-connections", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: connectionId,
          ...toRequestBody(connectionDraft),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { connection?: AiConnectionRecord; message?: string }
        | null;

      if (!response.ok || !body?.connection) {
        setErrorMessage(body?.message ?? "We could not save this AI connection.");
        setSavingConnectionId("");
        return;
      }

      const nextConnection = body.connection;
      setConnections((currentConnections) =>
        currentConnections.map((connection) => {
          if (connection.id === connectionId) {
            return nextConnection;
          }

          if (nextConnection.isDefault && connection.isDefault) {
            return {
              ...connection,
              isDefault: false,
            };
          }

          return connection;
        }),
      );
      setDraftsById((currentDrafts) => ({
        ...currentDrafts,
        [connectionId]: toConnectionFormState(nextConnection),
      }));
      setSuccessMessage(`Saved ${nextConnection.name}.`);
      setSavingConnectionId("");
    } catch {
      setErrorMessage("We could not save this AI connection right now.");
      setSavingConnectionId("");
    }
  }

  async function handleDelete(connectionId: string) {
    setErrorMessage("");
    setSuccessMessage("");
    setDeletingConnectionId(connectionId);

    try {
      const response = await fetch("/api/admin/ai-connections", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: connectionId,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean; message?: string }
        | null;

      if (!response.ok || !body?.success) {
        setErrorMessage(body?.message ?? "We could not delete this AI connection.");
        setDeletingConnectionId("");
        return;
      }

      setConnections((currentConnections) =>
        currentConnections.filter((connection) => connection.id !== connectionId),
      );
      setDraftsById((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[connectionId];
        return nextDrafts;
      });
      setSuccessMessage("AI connection deleted.");
      setDeletingConnectionId("");
    } catch {
      setErrorMessage("We could not delete this AI connection right now.");
      setDeletingConnectionId("");
    }
  }

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
            AI infrastructure
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">
            AI connections
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            Register the OpenAI-compatible endpoints Daily Sparks can use later for
            generation. Store multiple connections, mask API keys after save, and
            choose which connection should be the active default.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <BrainCircuit className="h-3.5 w-3.5" />
            {connections.length} saved connections
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#eefbf3] px-3 py-1.5 text-xs font-semibold text-[#15803d]">
            <Star className="h-3.5 w-3.5" />
            {activeCountBadge}
          </span>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-xl font-bold text-[#0f172a]">Add AI connection</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
              placeholder="NF Relay"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Provider type
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              value={createDraft.providerType}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  providerType: event.target.value as AiConnectionProviderType,
                }))
              }
            >
              <option value="openai-compatible">OpenAI-compatible</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Base URL</span>
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              value={createDraft.baseUrl}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  baseUrl: event.target.value,
                }))
              }
              placeholder={DEFAULT_AI_CONNECTION_BASE_URL}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Default model
            </span>
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              value={createDraft.defaultModel}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  defaultModel: event.target.value,
                }))
              }
              placeholder={DEFAULT_AI_CONNECTION_MODEL}
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">API key</span>
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              value={createDraft.apiKey}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  apiKey: event.target.value,
                }))
              }
              type="password"
              placeholder="Paste a fresh API key"
              autoComplete="off"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
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
            Connection is active
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={createDraft.isDefault}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  isDefault: event.target.checked,
                }))
              }
            />
            Make this the default connection
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
              placeholder="What this connection is intended for."
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || !createDraft.name.trim() || !createDraft.apiKey.trim()}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isCreating ? "Adding connection..." : "Add AI connection"}
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        {connections.map((connection) => {
          const draft = draftsById[connection.id] ?? toConnectionFormState(connection);
          const isSaving = savingConnectionId === connection.id;
          const isDeleting = deletingConnectionId === connection.id;

          return (
            <article
              key={connection.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-[#0f172a]">
                      {connection.name}
                    </h3>
                    {connection.isDefault ? (
                      <span className="rounded-full bg-[#fff7dd] px-3 py-1 text-xs font-semibold text-[#b45309]">
                        Default
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        connection.active
                          ? "bg-[#eefbf3] text-[#15803d]"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {connection.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {connection.baseUrl.replace(/^https?:\/\//, "")}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    Model: {connection.defaultModel}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    API key:{" "}
                    {connection.hasApiKey ? connection.apiKeyPreview : "No key saved"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(connection.id)}
                    disabled={isSaving || isDeleting}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save connection"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(connection.id)}
                    disabled={isSaving || isDeleting}
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">Name</span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.name}
                    onChange={(event) =>
                      updateDraftConnection(connection.id, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Provider type
                  </span>
                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.providerType}
                    onChange={(event) =>
                      updateDraftConnection(connection.id, (current) => ({
                        ...current,
                        providerType: event.target.value as AiConnectionProviderType,
                      }))
                    }
                  >
                    <option value="openai-compatible">OpenAI-compatible</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Base URL
                  </span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.baseUrl}
                    onChange={(event) =>
                      updateDraftConnection(connection.id, (current) => ({
                        ...current,
                        baseUrl: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Default model
                  </span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.defaultModel}
                    onChange={(event) =>
                      updateDraftConnection(connection.id, (current) => ({
                        ...current,
                        defaultModel: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Replace API key
                  </span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.apiKey}
                    onChange={(event) =>
                      updateDraftConnection(connection.id, (current) => ({
                        ...current,
                        apiKey: event.target.value,
                      }))
                    }
                    type="password"
                    placeholder="Leave blank to keep the current key"
                    autoComplete="off"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(event) =>
                      updateDraftConnection(connection.id, (current) => ({
                        ...current,
                        active: event.target.checked,
                      }))
                    }
                  />
                  Connection is active
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.isDefault}
                    onChange={(event) =>
                      updateDraftConnection(connection.id, (current) => ({
                        ...current,
                        isDefault: event.target.checked,
                      }))
                    }
                  />
                  Make this the default connection
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Notes</span>
                  <textarea
                    className="min-h-[104px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.notes}
                    onChange={(event) =>
                      updateDraftConnection(connection.id, (current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

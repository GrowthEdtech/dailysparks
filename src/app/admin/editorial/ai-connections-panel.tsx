"use client";

import { BrainCircuit, Save, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  buildVertexAiOpenAiBaseUrl,
  DEFAULT_AI_CONNECTION_BASE_URL,
  DEFAULT_AI_CONNECTION_MODEL,
  DEFAULT_VERTEX_AI_LOCATION,
  DEFAULT_VERTEX_AI_MODEL,
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
  fallbackConnectionId: string;
  vertexProjectId: string;
  vertexLocation: string;
  serviceAccountEmail: string;
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
  fallbackConnectionId: "",
  vertexProjectId: "",
  vertexLocation: DEFAULT_VERTEX_AI_LOCATION,
  serviceAccountEmail: "",
};

function isVertexProvider(providerType: AiConnectionProviderType) {
  return providerType === "vertex-openai-compatible";
}

function getProviderLabel(providerType: AiConnectionProviderType) {
  return providerType === "vertex-openai-compatible"
    ? "Vertex AI (Google Cloud)"
    : "OpenAI-compatible";
}

function withProviderDefaults(
  current: ConnectionFormState,
  providerType: AiConnectionProviderType,
): ConnectionFormState {
  if (providerType === "vertex-openai-compatible") {
    return {
      ...current,
      providerType,
      defaultModel:
        current.providerType === providerType && current.defaultModel.trim()
          ? current.defaultModel
          : DEFAULT_VERTEX_AI_MODEL,
      baseUrl:
        current.vertexProjectId.trim() && current.vertexLocation.trim()
          ? buildVertexAiOpenAiBaseUrl(
              current.vertexProjectId,
              current.vertexLocation,
            )
          : "",
      apiKey: "",
      vertexLocation: current.vertexLocation || DEFAULT_VERTEX_AI_LOCATION,
    };
  }

  return {
    ...current,
    providerType,
    baseUrl:
      current.providerType === providerType && current.baseUrl.trim()
        ? current.baseUrl
        : DEFAULT_AI_CONNECTION_BASE_URL,
    defaultModel:
      current.providerType === providerType && current.defaultModel.trim()
        ? current.defaultModel
        : DEFAULT_AI_CONNECTION_MODEL,
  };
}

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
    fallbackConnectionId: connection.fallbackConnectionId ?? "",
    vertexProjectId: connection.vertexProjectId ?? "",
    vertexLocation: connection.vertexLocation ?? DEFAULT_VERTEX_AI_LOCATION,
    serviceAccountEmail: connection.serviceAccountEmail ?? "",
  };
}

function toRequestBody(connection: ConnectionFormState) {
  const vertexProvider = isVertexProvider(connection.providerType);

  return {
    name: connection.name,
    providerType: connection.providerType,
    baseUrl: vertexProvider
      ? buildVertexAiOpenAiBaseUrl(
          connection.vertexProjectId,
          connection.vertexLocation,
        )
      : connection.baseUrl,
    defaultModel: connection.defaultModel,
    active: connection.active,
    isDefault: connection.isDefault,
    notes: connection.notes,
    fallbackConnectionId: connection.fallbackConnectionId,
    ...(vertexProvider
      ? {
          vertexProjectId: connection.vertexProjectId,
          vertexLocation: connection.vertexLocation,
          serviceAccountEmail: connection.serviceAccountEmail,
        }
      : {}),
    ...(!vertexProvider && connection.apiKey.trim()
      ? { apiKey: connection.apiKey }
      : {}),
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
  const [testingConnectionId, setTestingConnectionId] = useState("");

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

  function getConnectionName(connectionId: string) {
    return (
      connections.find((connection) => connection.id === connectionId)?.name ??
      "Not configured"
    );
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

  async function handleTestConnection(connectionId: string) {
    setErrorMessage("");
    setSuccessMessage("");
    setTestingConnectionId(connectionId);

    try {
      const response = await fetch("/api/admin/ai-connections/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: connectionId,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            result?: {
              status: "success" | "failed";
              latencyMs: number;
              model?: string;
              errorMessage?: string;
              connection?: AiConnectionRecord;
            };
            message?: string;
          }
        | null;

      if (!response.ok || !body?.result) {
        setErrorMessage(body?.message ?? "We could not test this AI connection.");
        setTestingConnectionId("");
        return;
      }

      const result = body.result;

      const nextConnection = result.connection;

      if (nextConnection) {
        setConnections((currentConnections) =>
          currentConnections.map((connection) =>
            connection.id === connectionId ? nextConnection : connection,
          ),
        );
        setDraftsById((currentDrafts) => ({
          ...currentDrafts,
          [connectionId]: toConnectionFormState(nextConnection),
        }));
      }

      setSuccessMessage(
        result.status === "success"
          ? `Connection test passed in ${result.latencyMs}ms.`
          : `Connection test failed in ${result.latencyMs}ms.`,
      );
      setTestingConnectionId("");
    } catch {
      setErrorMessage("We could not test this AI connection right now.");
      setTestingConnectionId("");
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
            Register the AI connections Daily Sparks can use for generation. Keep
            multiple connections, choose one active default, and switch between
            relay-backed GPT and Google Cloud Vertex AI without losing rollback
            options.
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
                setCreateDraft((current) =>
                  withProviderDefaults(
                    current,
                    event.target.value as AiConnectionProviderType,
                  ),
                )
              }
            >
              <option value="openai-compatible">OpenAI-compatible</option>
              <option value="vertex-openai-compatible">
                Vertex AI (Google Cloud)
              </option>
            </select>
          </label>

          {isVertexProvider(createDraft.providerType) ? (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Google Cloud project ID
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                  value={createDraft.vertexProjectId}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      vertexProjectId: event.target.value,
                      baseUrl:
                        event.target.value.trim() &&
                        current.vertexLocation.trim()
                          ? buildVertexAiOpenAiBaseUrl(
                              event.target.value,
                              current.vertexLocation,
                            )
                          : "",
                    }))
                  }
                  placeholder="gen-lang-client-0586185740"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Location
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                  value={createDraft.vertexLocation}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      vertexLocation: event.target.value,
                      baseUrl:
                        current.vertexProjectId.trim() &&
                        event.target.value.trim()
                          ? buildVertexAiOpenAiBaseUrl(
                              current.vertexProjectId,
                              event.target.value,
                            )
                          : "",
                    }))
                  }
                  placeholder={DEFAULT_VERTEX_AI_LOCATION}
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">
                  Service account email
                </span>
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                  value={createDraft.serviceAccountEmail}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      serviceAccountEmail: event.target.value,
                    }))
                  }
                  placeholder="automation-agent@project.iam.gserviceaccount.com"
                />
              </label>

              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 md:col-span-2">
                <p className="font-semibold">Google Cloud managed auth</p>
                <p className="mt-1 text-sky-800">
                  Vertex uses ADC and optional service-account impersonation. No
                  static API key will be stored for this connection.
                </p>
                <p className="mt-2 break-all text-xs text-sky-700">
                  Endpoint preview:{" "}
                  {createDraft.baseUrl || "Provide project ID and location to derive the Vertex endpoint."}
                </p>
              </div>
            </>
          ) : (
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
          )}

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

          {isVertexProvider(createDraft.providerType) ? null : (
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
          )}

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

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Fallback connection
            </span>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              value={createDraft.fallbackConnectionId}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  fallbackConnectionId: event.target.value,
                }))
              }
            >
              <option value="">No fallback</option>
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={
            isCreating ||
            !createDraft.name.trim() ||
            !createDraft.defaultModel.trim() ||
            (isVertexProvider(createDraft.providerType)
              ? !createDraft.vertexProjectId.trim() ||
                !createDraft.vertexLocation.trim()
              : !createDraft.apiKey.trim() || !createDraft.baseUrl.trim())
          }
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
          const isTesting = testingConnectionId === connection.id;

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
                    Provider: {getProviderLabel(connection.providerType)}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    Model: {connection.defaultModel}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    API key:{" "}
                    {connection.hasApiKey ? connection.apiKeyPreview : "No key saved"}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Fallback connection:{" "}
                    {connection.fallbackConnectionId
                      ? getConnectionName(connection.fallbackConnectionId)
                      : "No fallback configured"}
                  </p>
                  {isVertexProvider(connection.providerType) ? (
                    <>
                      <p className="mt-2 text-sm text-slate-500">
                        Google Cloud project:{" "}
                        {connection.vertexProjectId || "Not configured"}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Service account:{" "}
                        {connection.serviceAccountEmail || "Use current runtime identity"}
                      </p>
                      <p className="mt-2 text-sm text-sky-700">
                        Google Cloud managed auth
                      </p>
                    </>
                  ) : null}
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-800">Connection health</p>
                    <p className="mt-1">
                      Last test: {connection.lastTestStatus ?? "Not tested yet"}
                      {connection.lastTestLatencyMs
                        ? ` · ${connection.lastTestLatencyMs}ms`
                        : ""}
                    </p>
                    <p className="mt-1">
                      Last runtime: {connection.lastRuntimeStatus ?? "No runtime yet"}
                    </p>
                    <p className="mt-1">
                      {connection.runtimeSuccessCount ?? 0} runtime successes ·{" "}
                      {connection.runtimeFailureCount ?? 0} failures ·{" "}
                      {connection.runtimeFallbackCount ?? 0} fallbacks
                    </p>
                    <p className="mt-1">
                      Recent Daily Brief usage:{" "}
                      {connection.recentDailyBriefUsageCount ?? 0}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(connection.id)}
                    disabled={isSaving || isDeleting || isTesting}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <BrainCircuit className="h-4 w-4" />
                    {isTesting ? "Testing..." : "Test connection"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(connection.id)}
                    disabled={isSaving || isDeleting || isTesting}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save connection"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(connection.id)}
                    disabled={isSaving || isDeleting || isTesting}
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
                      updateDraftConnection(connection.id, (current) =>
                        withProviderDefaults(
                          current,
                          event.target.value as AiConnectionProviderType,
                        ),
                      )
                    }
                  >
                    <option value="openai-compatible">OpenAI-compatible</option>
                    <option value="vertex-openai-compatible">
                      Vertex AI (Google Cloud)
                    </option>
                  </select>
                </label>

                {isVertexProvider(draft.providerType) ? (
                  <>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Google Cloud project ID
                      </span>
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                        value={draft.vertexProjectId}
                        onChange={(event) =>
                          updateDraftConnection(connection.id, (current) => ({
                            ...current,
                            vertexProjectId: event.target.value,
                            baseUrl:
                              event.target.value.trim() &&
                              current.vertexLocation.trim()
                                ? buildVertexAiOpenAiBaseUrl(
                                    event.target.value,
                                    current.vertexLocation,
                                  )
                                : "",
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Location
                      </span>
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                        value={draft.vertexLocation}
                        onChange={(event) =>
                          updateDraftConnection(connection.id, (current) => ({
                            ...current,
                            vertexLocation: event.target.value,
                            baseUrl:
                              current.vertexProjectId.trim() &&
                              event.target.value.trim()
                                ? buildVertexAiOpenAiBaseUrl(
                                    current.vertexProjectId,
                                    event.target.value,
                                  )
                                : "",
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Service account email
                      </span>
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                        value={draft.serviceAccountEmail}
                        onChange={(event) =>
                          updateDraftConnection(connection.id, (current) => ({
                            ...current,
                            serviceAccountEmail: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 md:col-span-2">
                      <p className="font-semibold">Google Cloud managed auth</p>
                      <p className="mt-1 text-sky-800">
                        This Vertex connection uses ADC and optional
                        service-account impersonation. No API key is stored here.
                      </p>
                      <p className="mt-2 break-all text-xs text-sky-700">
                        Endpoint preview:{" "}
                        {draft.baseUrl || "Provide project ID and location to derive the Vertex endpoint."}
                      </p>
                    </div>
                  </>
                ) : (
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
                )}

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

                {isVertexProvider(draft.providerType) ? null : (
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
                )}

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

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Fallback connection
                  </span>
                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                    value={draft.fallbackConnectionId}
                    onChange={(event) =>
                      updateDraftConnection(connection.id, (current) => ({
                        ...current,
                        fallbackConnectionId: event.target.value,
                      }))
                    }
                  >
                    <option value="">No fallback</option>
                    {connections
                      .filter((candidate) => candidate.id !== connection.id)
                      .map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

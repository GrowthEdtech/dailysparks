"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Database,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCcw,
  Send,
  Unplug,
} from "lucide-react";

import type { ParentProfile } from "../lib/mvp-types";

type NotionSyncCardProps = {
  initialProfile: ParentProfile;
  notionConfigured: boolean;
};

type NotionPageOption = {
  id: string;
  title: string;
  url: string;
};

type ProfileResponse = {
  parent: ParentProfile["parent"];
  student: ParentProfile["student"];
  message?: string;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function NotionSyncCard({
  initialProfile,
  notionConfigured,
}: NotionSyncCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [parent, setParent] = useState(initialProfile.parent);
  const [student, setStudent] = useState(initialProfile.student);
  const [pages, setPages] = useState<NotionPageOption[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isConfigured = notionConfigured;
  const isConnected = Boolean(parent.notionWorkspaceId);
  const hasArchive = Boolean(parent.notionDatabaseId);
  const lastSyncAt = formatTimestamp(parent.notionLastSyncedAt);
  const notionStatus = searchParams.get("notion");
  const helperMessage = useMemo(() => {
    if (successMessage) {
      return successMessage;
    }

    if (errorMessage) {
      return errorMessage;
    }

    if (notionStatus === "connected") {
      return "Notion connected. Choose a parent page to create your archive.";
    }

    if (notionStatus === "error") {
      return "We could not complete the Notion connection.";
    }

    if (notionStatus === "unavailable") {
      return "Notion sync is not configured yet.";
    }

    return parent.notionLastSyncMessage ?? "";
  }, [errorMessage, notionStatus, parent.notionLastSyncMessage, successMessage]);

  function applyProfileResponse(body: ProfileResponse | null) {
    if (!body?.parent || !body.student) {
      return;
    }

    setParent(body.parent);
    setStudent(body.student);
  }

  async function loadPages() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoadingPages(true);

    try {
      const response = await fetch("/api/notion/pages");
      const body = (await response.json().catch(() => null)) as
        | { pages?: NotionPageOption[]; message?: string }
        | null;

      if (!response.ok) {
        setErrorMessage(body?.message ?? "We could not load your Notion pages.");
        setIsLoadingPages(false);
        return;
      }

      const nextPages = Array.isArray(body?.pages) ? body.pages : [];
      setPages(nextPages);
      setSelectedPageId((current) =>
        current || nextPages[0]?.id || "",
      );
      setSuccessMessage(
        nextPages.length > 0
          ? "Choose the Notion page where Daily Sparks should create your archive."
          : "Notion is connected, but Daily Sparks cannot see a shared page yet. Create a page in Notion, add the DailySparks connection, then refresh here.",
      );
      setIsLoadingPages(false);
    } catch {
      setErrorMessage("We could not reach Notion right now.");
      setIsLoadingPages(false);
    }
  }

  async function startConnect() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsWorking(true);

    try {
      const response = await fetch("/api/notion/connect", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | { authorizationUrl?: string; message?: string }
        | null;

      if (!response.ok || !body?.authorizationUrl) {
        setErrorMessage(body?.message ?? "Notion sync is not configured yet.");
        setIsWorking(false);
        return;
      }

      window.location.assign(body.authorizationUrl);
    } catch {
      setErrorMessage("We could not start the Notion authorization flow.");
      setIsWorking(false);
    }
  }

  async function createArchive() {
    if (!selectedPageId) {
      setErrorMessage("Please choose a Notion page first.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsWorking(true);

    try {
      const response = await fetch("/api/notion/database", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          pageId: selectedPageId,
        }),
      });
      const body = (await response.json().catch(() => null)) as ProfileResponse | null;

      if (!response.ok) {
        setErrorMessage(body?.message ?? "We could not create the Notion archive.");
        setIsWorking(false);
        return;
      }

      applyProfileResponse(body);
      setSuccessMessage("Notion archive created.");
      setIsWorking(false);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not create the Notion archive.");
      setIsWorking(false);
    }
  }

  async function sendTestPage() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsWorking(true);

    try {
      const response = await fetch("/api/notion/test-sync", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as ProfileResponse | null;

      if (!response.ok) {
        applyProfileResponse(body);
        setErrorMessage(body?.message ?? body?.parent?.notionLastSyncMessage ?? "We could not send a Notion test page.");
        setIsWorking(false);
        return;
      }

      applyProfileResponse(body);
      setSuccessMessage("Test page sent to your Notion archive.");
      setIsWorking(false);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not send the Notion test page.");
      setIsWorking(false);
    }
  }

  async function disconnect() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsWorking(true);

    try {
      const response = await fetch("/api/notion/disconnect", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as ProfileResponse | null;

      if (!response.ok) {
        setErrorMessage(body?.message ?? "We could not disconnect Notion.");
        setIsWorking(false);
        return;
      }

      applyProfileResponse(body);
      setPages([]);
      setSelectedPageId("");
      setSuccessMessage("Notion has been disconnected.");
      setIsWorking(false);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not disconnect Notion.");
      setIsWorking(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Image
          src="/integrations/notion-symbol.svg"
          alt="Notion"
          width={22}
          height={22}
          className="mt-2 h-[22px] w-[22px] shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-[#0f172a]">Notion sync</h3>
          <p className="mt-1 text-sm text-slate-500">
            Archive reading briefs, prompts, and reflections in your own Notion workspace.
          </p>
        </div>
      </div>

      {!isConfigured ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4">
          <p className="text-sm font-semibold text-slate-700">Notion setup pending</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Add the Notion OAuth credentials in production to enable this integration.
          </p>
        </div>
      ) : null}

      {isConfigured ? (
        <div className="mt-4 space-y-4">
          {isConnected ? (
            <div className="rounded-2xl bg-white px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#eefbf3] px-3 py-1 text-xs font-semibold text-[#15803d]">
                  Connected
                </span>
                {parent.notionWorkspaceName ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {parent.notionWorkspaceName}
                  </span>
                ) : null}
                {hasArchive && parent.notionDatabaseName ? (
                  <span className="rounded-full bg-[#fff7dd] px-3 py-1 text-xs font-semibold text-[#b45309]">
                    {parent.notionDatabaseName}
                  </span>
                ) : null}
              </div>

              {helperMessage ? (
                <p
                  className={`mt-3 text-xs leading-5 ${
                    errorMessage ? "text-rose-600" : "text-slate-500"
                  }`}
                >
                  {helperMessage}
                </p>
              ) : null}

              {lastSyncAt ? (
                <p className="mt-2 text-xs text-slate-400">Last sync: {lastSyncAt}</p>
              ) : null}

              {!hasArchive ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">
                      Choose where to create the archive
                    </p>
                    {pages.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => void loadPages()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                      >
                        {isLoadingPages ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-3.5 w-3.5" />
                        )}
                        Refresh
                      </button>
                    ) : null}
                  </div>

                  <div className="relative mt-3">
                    <select
                      value={selectedPageId}
                      onChange={(event) => setSelectedPageId(event.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                      disabled={isLoadingPages || isWorking || pages.length === 0}
                    >
                      {pages.length === 0 ? (
                        <option value="">No shared pages yet</option>
                      ) : null}
                      {pages.map((page) => (
                        <option key={page.id} value={page.id}>
                          {page.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  </div>

                  {pages.length === 0 ? (
                    <>
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        Open Notion, create or choose a page in this workspace, then add the
                        DailySparks connection to that page before refreshing here.
                      </p>
                      <button
                        type="button"
                        onClick={() => void loadPages()}
                        disabled={isLoadingPages || isWorking || isPending}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoadingPages ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-4 w-4" />
                        )}
                        Refresh available pages
                      </button>
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void createArchive()}
                    disabled={isWorking || isPending || !selectedPageId}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                    Create Daily Sparks archive
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void sendTestPage()}
                    disabled={isWorking || isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send test page
                  </button>
                  {parent.notionLastSyncPageUrl ? (
                    <a
                      href={parent.notionLastSyncPageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open latest page
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void disconnect()}
                    disabled={isWorking || isPending}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Unplug className="h-4 w-4" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white px-4 py-4">
              <p className="text-sm text-slate-500">
                Connect Notion to create a Daily Sparks archive for {student.studentName || "your child"}&apos;s reading history.
              </p>
              {helperMessage ? (
                <p
                  className={`mt-2 text-xs leading-5 ${
                    errorMessage ? "text-rose-600" : "text-slate-500"
                  }`}
                >
                  {helperMessage}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void startConnect()}
                disabled={isWorking || isPending}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Connect Notion
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

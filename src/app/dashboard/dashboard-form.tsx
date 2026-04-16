"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { BookOpen, Clock3, CreditCard, Save, Send } from "lucide-react";

import AccountMenu from "../../components/account-menu";
import GoodnotesDeliveryCard from "../../components/goodnotes-delivery-card";
import NotionSyncCard from "../../components/notion-sync-card";
import TrialStatusBanner from "../../components/trial-status-banner";
import AcademicGrowthVisual from "../../components/academic-growth-visual";
import { getBillingSummary } from "../../lib/billing";
import type { DashboardNotebookData } from "../../lib/dashboard-notebook-data-schema";
import type { DashboardReferralData } from "../../lib/dashboard-referral-data-schema";
import type {
  DailyBriefNotebookEntryRecord,
} from "../../lib/daily-brief-notebook-store";
import type {
  DailyBriefNotebookWeeklyRecapRecord,
} from "../../lib/daily-brief-notebook-weekly-recap-store";
import {
  buildDailyBriefNotebookWeeklyRecap,
} from "../../lib/daily-brief-notebook-weekly-recap";
import {
  getDailyBriefAuthoredEntryTypes,
  getDailyBriefNotebookEntryLabel,
} from "../../lib/daily-brief-notebook-schema";
import {
  DEFAULT_COUNTRY_CODE,
  DEFAULT_DELIVERY_TIME_ZONE,
  DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME,
  buildDeliveryTimeOptions,
  formatPreferredDeliveryLocalTime,
  formatTimeZoneLabel,
  getDefaultDeliveryTimeZoneForCountry,
  getDeliveryCountryOptions,
  getDeliveryTimeZoneOptions,
  inferCountryCodeFromBrowser,
  resolveDeliveryPreferences,
} from "../../lib/delivery-locale";
import {
  getDefaultProgrammeYear,
  type ParentProfile,
  type Programme,
} from "../../lib/mvp-types";
import type { MarketingLeadStageInterest } from "../../lib/marketing-lead-store-types";
import { trackMarketingEvent } from "../../lib/marketing-analytics";
import {
  getInterestTaxonomyForProgramme,
  getPublicProgrammeOptions,
  sanitizeInterestTagsForProgramme,
} from "../../lib/student-interest-taxonomy";
import { getProgrammeStageSummary, getWeeklyPlan } from "../../lib/weekly-plan";
import {
  ALL_NOTEBOOK_FILTER_ID,
  ALL_NOTEBOOK_TAG_FILTER_ID,
  applyNotebookWorkspaceFilters,
  buildNotebookEntryPreview,
  buildNotebookFilterOptions,
  buildNotebookTagOptions,
  type NotebookSortOrder,
  resolveSelectedNotebookEntry,
} from "./notebook-workspace";
import {
  buildWeeklyRecapHistoryPreview,
  getWeeklyRecapEmailStatusLabel,
  getWeeklyRecapNotionStatusLabel,
  resolveSelectedWeeklyRecap,
} from "./weekly-recap-history";

type DashboardFormProps = {
  initialProfile: ParentProfile;
  notionConfigured: boolean;
  notebookItems?: DailyBriefNotebookEntryRecord[];
  weeklyRecapRecord?: DailyBriefNotebookWeeklyRecapRecord | null;
  weeklyRecapHistory?: DailyBriefNotebookWeeklyRecapRecord[];
  notebookSuggestion?: {
    briefId: string;
    scheduledFor: string;
    headline: string;
    knowledgeBankTitle: string;
    entries: Array<{
      title: string;
      body: string;
    }>;
  } | null;
  deferNotebookData?: boolean;
};

type RouteMessage = {
  message?: string;
  student?: ParentProfile["student"];
  parent?: ParentProfile["parent"];
};

const DELIVERY_COUNTRY_OPTIONS = getDeliveryCountryOptions();
const DELIVERY_TIME_OPTIONS = buildDeliveryTimeOptions();
const DELIVERY_TIME_ZONE_OPTIONS = getDeliveryTimeZoneOptions();
const DASHBOARD_NOTEBOOK_DATA_ENDPOINT = "/api/dashboard/notebook";
const DASHBOARD_REFERRALS_ENDPOINT = "/api/dashboard/referrals";
const EMPTY_DASHBOARD_REFERRAL_DATA: DashboardReferralData = {
  summary: {
    sentCount: 0,
    acceptedCount: 0,
    trialStartedCount: 0,
  },
  recentInvites: [],
};

function hasMeaningfulStudentName(studentName: string) {
  const normalizedStudentName = studentName.trim();

  return (
    normalizedStudentName.length > 0 &&
    normalizedStudentName.toLowerCase() !== "student"
  );
}

export default function DashboardForm({
  initialProfile,
  notionConfigured,
  notebookItems: initialNotebookItems = [],
  weeklyRecapRecord: initialWeeklyRecapRecord = null,
  weeklyRecapHistory: initialWeeklyRecapHistory = [],
  notebookSuggestion: initialNotebookSuggestion = null,
  deferNotebookData = false,
}: DashboardFormProps) {
  const router = useRouter();
  const [studentName, setStudentName] = useState(
    hasMeaningfulStudentName(initialProfile.student.studentName)
      ? initialProfile.student.studentName
      : "",
  );
  const [savedStudentName, setSavedStudentName] = useState(
    initialProfile.student.studentName,
  );
  const [programme, setProgramme] = useState(initialProfile.student.programme);
  const [programmeYear, setProgrammeYear] = useState(
    initialProfile.student.programmeYear,
  );
  const [interestTags, setInterestTags] = useState(
    sanitizeInterestTagsForProgramme(
      initialProfile.student.programme,
      initialProfile.student.interestTags ?? [],
    ),
  );
  const [countryCode, setCountryCode] = useState(initialProfile.parent.countryCode);
  const [deliveryTimeZone, setDeliveryTimeZone] = useState(
    initialProfile.parent.deliveryTimeZone,
  );
  const [preferredDeliveryLocalTime, setPreferredDeliveryLocalTime] = useState(
    initialProfile.parent.preferredDeliveryLocalTime,
  );
  const [savedCountryCode, setSavedCountryCode] = useState(
    initialProfile.parent.countryCode,
  );
  const [savedDeliveryTimeZone, setSavedDeliveryTimeZone] = useState(
    initialProfile.parent.deliveryTimeZone,
  );
  const [savedPreferredDeliveryLocalTime, setSavedPreferredDeliveryLocalTime] =
    useState(initialProfile.parent.preferredDeliveryLocalTime);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deliveryErrorMessage, setDeliveryErrorMessage] = useState("");
  const [deliverySuccessMessage, setDeliverySuccessMessage] = useState("");
  const [isSavingDeliveryPreferences, setIsSavingDeliveryPreferences] =
    useState(false);
  const [notebookErrorMessage, setNotebookErrorMessage] = useState("");
  const [notebookSuccessMessage, setNotebookSuccessMessage] = useState("");
  const [isSavingNotebook, setIsSavingNotebook] = useState(false);
  const [notebookData, setNotebookData] = useState<DashboardNotebookData>({
    notebookItems: initialNotebookItems,
    weeklyRecapRecord: initialWeeklyRecapRecord,
    weeklyRecapHistory: initialWeeklyRecapHistory,
    notebookSuggestion: initialNotebookSuggestion,
  });
  const [isNotebookDataLoading, setIsNotebookDataLoading] = useState(
    deferNotebookData,
  );
  const [notebookDataErrorMessage, setNotebookDataErrorMessage] = useState("");
  const [notebookFilterId, setNotebookFilterId] = useState(ALL_NOTEBOOK_FILTER_ID);
  const [notebookTagFilter, setNotebookTagFilter] = useState(ALL_NOTEBOOK_TAG_FILTER_ID);
  const [notebookSearchQuery, setNotebookSearchQuery] = useState("");
  const [notebookSortOrder, setNotebookSortOrder] =
    useState<NotebookSortOrder>("newest");
  const [selectedNotebookEntryId, setSelectedNotebookEntryId] = useState<string | null>(
    initialNotebookItems[0]?.id ?? null,
  );
  const [notebookEntryType, setNotebookEntryType] = useState(
    getDailyBriefAuthoredEntryTypes(initialProfile.student.programme)[0] ?? "generic-note",
  );
  const [notebookEntryBody, setNotebookEntryBody] = useState("");
  const [notebookEntryErrorMessage, setNotebookEntryErrorMessage] = useState("");
  const [notebookEntrySuccessMessage, setNotebookEntrySuccessMessage] = useState("");
  const [isSavingNotebookEntry, setIsSavingNotebookEntry] = useState(false);
  const [weeklyRecapErrorMessage, setWeeklyRecapErrorMessage] = useState("");
  const [weeklyRecapSuccessMessage, setWeeklyRecapSuccessMessage] = useState("");
  const [isSyncingWeeklyRecap, setIsSyncingWeeklyRecap] = useState(false);
  const [isSavingWeeklyRecap, setIsSavingWeeklyRecap] = useState(false);
  const [retrievalResponseDrafts, setRetrievalResponseDrafts] = useState<
    Record<string, string>
  >({});
  const [retrievalResponseErrorMessage, setRetrievalResponseErrorMessage] =
    useState("");
  const [retrievalResponseSuccessMessage, setRetrievalResponseSuccessMessage] =
    useState("");
  const [savingRetrievalPromptId, setSavingRetrievalPromptId] = useState<string | null>(
    null,
  );
  const [selectedWeeklyRecapId, setSelectedWeeklyRecapId] = useState<string | null>(
    initialWeeklyRecapHistory[0]?.id ?? null,
  );
  const [referralInviteEmail, setReferralInviteEmail] = useState("");
  const [referralInviteFullName, setReferralInviteFullName] = useState("");
  const [referralInviteStageInterest, setReferralInviteStageInterest] =
    useState<MarketingLeadStageInterest>(
      initialProfile.student.programme === "DP"
        ? "DP"
        : initialProfile.student.programme === "MYP"
          ? "MYP"
          : "NOT_SURE",
    );
  const [referralData, setReferralData] = useState<DashboardReferralData>(
    EMPTY_DASHBOARD_REFERRAL_DATA,
  );
  const [isReferralDataLoading, setIsReferralDataLoading] = useState(
    Boolean(initialProfile.parent.firstBriefDeliveredAt),
  );
  const [referralErrorMessage, setReferralErrorMessage] = useState("");
  const [referralSuccessMessage, setReferralSuccessMessage] = useState("");
  const [isSendingReferralInvite, setIsSendingReferralInvite] = useState(false);
  const hasAppliedBrowserDeliveryDetection = useRef(false);
  const hasTrackedReferralPromptView = useRef(false);
  const [isPending, startTransition] = useTransition();
  const deferredNotebookSearchQuery = useDeferredValue(notebookSearchQuery);

  const billingSummary = getBillingSummary(initialProfile.parent);
  const weeklyPlan = getWeeklyPlan(programme, programmeYear);
  const programmeStageSummary = getProgrammeStageSummary(programme);
  const publicProgrammeOptions = getPublicProgrammeOptions();
  const interestOptions = getInterestTaxonomyForProgramme(programme);
  const isLegacyPypProfile = initialProfile.student.programme === "PYP";
  const stageLabel = programme;
  const hasSavedStudentName = hasMeaningfulStudentName(savedStudentName);
  const displayStudentName = hasSavedStudentName
    ? savedStudentName.trim()
    : "Your child";
  const hasSavedDeliveryPreferences =
    savedCountryCode !== DEFAULT_COUNTRY_CODE ||
    savedDeliveryTimeZone !== DEFAULT_DELIVERY_TIME_ZONE ||
    savedPreferredDeliveryLocalTime !== DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME;
  const notebookItems = notebookData.notebookItems;
  const weeklyRecapRecord = notebookData.weeklyRecapRecord;
  const weeklyRecapHistory = notebookData.weeklyRecapHistory;
  const notebookSuggestion = notebookData.notebookSuggestion;
  const canShowReferralCard = Boolean(initialProfile.parent.firstBriefDeliveredAt);
  const hasNotebookSuggestion = notebookSuggestion !== null;
  const notebookLibraryItems = notebookItems.slice(0, 40);
  const generatedWeeklyRecap = buildDailyBriefNotebookWeeklyRecap({
    entries: notebookItems,
    programme,
    asOf: notebookItems[0]?.updatedAt,
  });
  const activeWeeklyRecapRecord =
    weeklyRecapRecord &&
    (!generatedWeeklyRecap || weeklyRecapRecord.weekKey === generatedWeeklyRecap.weekKey)
      ? weeklyRecapRecord
      : null;
  const weeklyRecap = generatedWeeklyRecap ?? activeWeeklyRecapRecord;
  const persistedRetrievalResponseDrafts = Object.fromEntries(
    (activeWeeklyRecapRecord?.retrievalResponses ?? []).map((response) => [
      response.promptEntryId,
      response.response,
    ]),
  );
  const notebookFilterOptions = buildNotebookFilterOptions(notebookLibraryItems);
  const notebookTagOptions = buildNotebookTagOptions(notebookLibraryItems);
  const visibleNotebookItems = applyNotebookWorkspaceFilters(notebookLibraryItems, {
    entryTypeFilterId: notebookFilterId,
    searchQuery: deferredNotebookSearchQuery,
    tagFilter: notebookTagFilter,
    sortOrder: notebookSortOrder,
  });
  const selectedNotebookEntry = resolveSelectedNotebookEntry(
    visibleNotebookItems,
    selectedNotebookEntryId,
  );
  const authoredNotebookEntryTypes = getDailyBriefAuthoredEntryTypes(programme);
  const selectedWeeklyRecap = resolveSelectedWeeklyRecap(
    weeklyRecapHistory,
    selectedWeeklyRecapId,
  );
  const isNotebookBootstrapping =
    isNotebookDataLoading &&
    notebookItems.length === 0 &&
    weeklyRecapHistory.length === 0 &&
    weeklyRecapRecord === null &&
    notebookSuggestion === null;

  async function fetchNotebookData() {
    const response = await fetch(DASHBOARD_NOTEBOOK_DATA_ENDPOINT, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });

    const body = (await response.json().catch(() => null)) as
      | (DashboardNotebookData & { message?: string })
      | { message?: string }
      | null;

    if (!response.ok) {
      throw new Error(body?.message ?? "We could not load your notebook yet.");
    }

    return body as DashboardNotebookData;
  }

  async function refreshNotebookData() {
    setNotebookDataErrorMessage("");
    setNotebookData(await fetchNotebookData());
  }

  async function fetchReferralData() {
    const response = await fetch(DASHBOARD_REFERRALS_ENDPOINT, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });

    const body = (await response.json().catch(() => null)) as
      | (DashboardReferralData & { message?: string })
      | { message?: string }
      | null;

    if (!response.ok) {
      throw new Error(
        body?.message ?? "We could not load your referral activity yet.",
      );
    }

    return body as DashboardReferralData;
  }

  async function refreshReferralData() {
    setReferralErrorMessage("");
    setReferralData(await fetchReferralData());
  }

  useEffect(() => {
    if (hasAppliedBrowserDeliveryDetection.current) {
      return;
    }

    if (
      savedCountryCode !== DEFAULT_COUNTRY_CODE ||
      savedDeliveryTimeZone !== DEFAULT_DELIVERY_TIME_ZONE ||
      savedPreferredDeliveryLocalTime !== DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME
    ) {
      hasAppliedBrowserDeliveryDetection.current = true;
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const browserTimeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? DEFAULT_DELIVERY_TIME_ZONE;
    const primaryLanguage =
      typeof navigator !== "undefined"
        ? navigator.languages?.[0] ?? navigator.language
        : null;
    let region: string | null = null;

    try {
      region = primaryLanguage ? new Intl.Locale(primaryLanguage).region ?? null : null;
    } catch {
      region = null;
    }

    const detectedPreferences = resolveDeliveryPreferences({
      countryCode: inferCountryCodeFromBrowser({
        region,
        timeZone: browserTimeZone,
      }),
      deliveryTimeZone: browserTimeZone,
      preferredDeliveryLocalTime,
    });

    hasAppliedBrowserDeliveryDetection.current = true;

    const animationFrameId = window.requestAnimationFrame(() => {
      setCountryCode(detectedPreferences.countryCode);
      setDeliveryTimeZone(detectedPreferences.deliveryTimeZone);
      setPreferredDeliveryLocalTime(
        detectedPreferences.preferredDeliveryLocalTime,
      );
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [
    preferredDeliveryLocalTime,
    savedCountryCode,
    savedDeliveryTimeZone,
    savedPreferredDeliveryLocalTime,
  ]);

  useEffect(() => {
    let cancelled = false;

    if (!deferNotebookData) {
      return;
    }

    void fetchNotebookData()
      .then((data) => {
        if (!cancelled) {
          setNotebookData(data);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setNotebookDataErrorMessage(
          error instanceof Error
            ? error.message
            : "We could not load your notebook yet.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsNotebookDataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferNotebookData]);

  useEffect(() => {
    let cancelled = false;

    if (!canShowReferralCard) {
      return;
    }

    void fetchReferralData()
      .then((data) => {
        if (!cancelled) {
          setReferralData(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setReferralErrorMessage(
            error instanceof Error
              ? error.message
              : "We could not load your referral activity yet.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsReferralDataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canShowReferralCard]);

  useEffect(() => {
    if (!canShowReferralCard || hasTrackedReferralPromptView.current) {
      return;
    }

    hasTrackedReferralPromptView.current = true;
    trackMarketingEvent("referral_prompt_viewed", {
      location: "dashboard",
      programme,
    });
  }, [canShowReferralCard, programme]);

  function handleProgrammeChange(nextProgramme: Programme) {
    setSuccessMessage("");
    setErrorMessage("");
    setProgramme(nextProgramme);
    setProgrammeYear(getDefaultProgrammeYear(nextProgramme));
    setInterestTags((current) =>
      sanitizeInterestTagsForProgramme(nextProgramme, current),
    );
    setNotebookEntryType(
      getDailyBriefAuthoredEntryTypes(nextProgramme)[0] ?? "generic-note",
    );
    setReferralInviteStageInterest(
      nextProgramme === "DP"
        ? "DP"
        : nextProgramme === "MYP"
          ? "MYP"
          : "NOT_SURE",
    );
  }

  function handleInterestToggle(interestTag: string) {
    setSuccessMessage("");
    setErrorMessage("");
    setInterestTags((current) =>
      current.includes(interestTag)
        ? current.filter((tag) => tag !== interestTag)
        : [...current, interestTag],
    );
  }

  function handleCountryCodeChange(nextCountryCode: string) {
    setDeliveryErrorMessage("");
    setDeliverySuccessMessage("");
    setCountryCode(nextCountryCode);
    setDeliveryTimeZone(getDefaultDeliveryTimeZoneForCountry(nextCountryCode));
  }

  async function handleSave() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          studentName,
          programme,
          programmeYear,
          interestTags,
        }),
      });

      const body = (await response.json().catch(() => null)) as RouteMessage | null;

      if (!response.ok) {
        setErrorMessage(body?.message ?? "We could not save your preferences.");
        setIsSaving(false);
        return;
      }

      if (body?.student) {
        setStudentName(body.student.studentName);
        setSavedStudentName(body.student.studentName);
        setProgramme(body.student.programme);
        setProgrammeYear(body.student.programmeYear);
        setInterestTags(
          sanitizeInterestTagsForProgramme(
            body.student.programme,
            body.student.interestTags ?? [],
          ),
        );
      }

      setSuccessMessage("Preferences saved.");
      setIsSaving(false);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage("We could not reach the local API. Please try again.");
      setIsSaving(false);
    }
  }

  async function handleSaveDeliveryPreferences() {
    setDeliveryErrorMessage("");
    setDeliverySuccessMessage("");
    setIsSavingDeliveryPreferences(true);

    try {
      const response = await fetch("/api/profile/delivery-preferences", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          countryCode,
          deliveryTimeZone,
          preferredDeliveryLocalTime,
        }),
      });

      const body = (await response.json().catch(() => null)) as RouteMessage | null;

      if (!response.ok) {
        setDeliveryErrorMessage(
          body?.message ?? "We could not save your delivery schedule.",
        );
        setIsSavingDeliveryPreferences(false);
        return;
      }

      if (body?.parent) {
        setCountryCode(body.parent.countryCode);
        setDeliveryTimeZone(body.parent.deliveryTimeZone);
        setPreferredDeliveryLocalTime(body.parent.preferredDeliveryLocalTime);
        setSavedCountryCode(body.parent.countryCode);
        setSavedDeliveryTimeZone(body.parent.deliveryTimeZone);
        setSavedPreferredDeliveryLocalTime(
          body.parent.preferredDeliveryLocalTime,
        );
      }

      setDeliverySuccessMessage("Delivery schedule saved.");
      setIsSavingDeliveryPreferences(false);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setDeliveryErrorMessage(
        "We could not reach the local API. Please try again.",
      );
      setIsSavingDeliveryPreferences(false);
    }
  }

  async function handleSaveNotebook() {
    if (!notebookSuggestion) {
      return;
    }

    setNotebookErrorMessage("");
    setNotebookSuccessMessage("");
    setIsSavingNotebook(true);

    try {
      const response = await fetch("/api/notebook/save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          briefId: notebookSuggestion.briefId,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | {
            message?: string;
            savedCount?: number;
            dedupedCount?: number;
            notionSync?: {
              status?: string;
              message?: string;
            };
          }
        | null;

      if (!response.ok) {
        setNotebookErrorMessage(
          body?.message ?? "We could not save this brief to the notebook.",
        );
        setIsSavingNotebook(false);
        return;
      }

      if ((body?.savedCount ?? 0) > 0) {
        setNotebookSuccessMessage(
          body?.notionSync?.status === "synced"
            ? `Saved ${body?.savedCount} notebook ${
                body?.savedCount === 1 ? "entry" : "entries"
              } and synced them to Notion.`
            : `Saved ${body?.savedCount} notebook ${
                body?.savedCount === 1 ? "entry" : "entries"
              }.`,
        );
      } else {
        setNotebookSuccessMessage(
          body?.message ?? "This brief is already in the notebook.",
        );
      }

      await refreshNotebookData();
      setIsSavingNotebook(false);
    } catch {
      setNotebookErrorMessage("We could not reach the local API. Please try again.");
      setIsSavingNotebook(false);
    }
  }

  async function handleSaveNotebookEntry() {
    if (!notebookSuggestion) {
      return;
    }

    setNotebookEntryErrorMessage("");
    setNotebookEntrySuccessMessage("");
    setIsSavingNotebookEntry(true);

    try {
      const response = await fetch("/api/notebook/entry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          briefId: notebookSuggestion.briefId,
          entryType: notebookEntryType,
          body: notebookEntryBody,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | {
            message?: string;
            wasUpdate?: boolean;
            notionSync?: {
              status?: string;
              message?: string;
            };
          }
        | null;

      if (!response.ok) {
        setNotebookEntryErrorMessage(
          body?.message ?? "We could not save this notebook reflection.",
        );
        setIsSavingNotebookEntry(false);
        return;
      }

      setNotebookEntrySuccessMessage(
        body?.notionSync?.status === "synced"
          ? `${body?.message ?? "Notebook reflection saved."} Notion has been updated too.`
          : body?.message ?? "Notebook reflection saved.",
      );
      setNotebookEntryBody("");
      await refreshNotebookData();
      setIsSavingNotebookEntry(false);
    } catch {
      setNotebookEntryErrorMessage(
        "We could not reach the local API. Please try again.",
      );
      setIsSavingNotebookEntry(false);
    }
  }

  async function handleSyncWeeklyRecap() {
    if (!weeklyRecap) {
      return;
    }

    setWeeklyRecapErrorMessage("");
    setWeeklyRecapSuccessMessage("");
    setIsSyncingWeeklyRecap(true);

    try {
      const response = await fetch("/api/notebook/weekly-recap/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          asOf: notebookItems[0]?.updatedAt,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            message?: string;
            notionSync?: {
              status?: string;
              message?: string;
            };
          }
        | null;

      if (!response.ok) {
        setWeeklyRecapErrorMessage(
          body?.message ?? "We could not sync this weekly recap right now.",
        );
        setIsSyncingWeeklyRecap(false);
        return;
      }

      setWeeklyRecapSuccessMessage(
        body?.notionSync?.status === "synced"
          ? body?.message ?? "Weekly recap synced to Notion."
          : body?.notionSync?.message ?? body?.message ?? "Weekly recap is ready.",
      );
      await refreshNotebookData();
      setIsSyncingWeeklyRecap(false);
    } catch {
      setWeeklyRecapErrorMessage(
        "We could not reach the local API. Please try again.",
      );
      setIsSyncingWeeklyRecap(false);
    }
  }

  async function handleSaveWeeklyRecap() {
    if (!weeklyRecap) {
      return;
    }

    setWeeklyRecapErrorMessage("");
    setWeeklyRecapSuccessMessage("");
    setRetrievalResponseErrorMessage("");
    setRetrievalResponseSuccessMessage("");
    setIsSavingWeeklyRecap(true);

    try {
      const response = await fetch("/api/notebook/weekly-recap/save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          asOf: notebookItems[0]?.updatedAt,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            message?: string;
          }
        | null;

      if (!response.ok) {
        setWeeklyRecapErrorMessage(
          body?.message ?? "We could not save this weekly recap right now.",
        );
        setIsSavingWeeklyRecap(false);
        return;
      }

      setWeeklyRecapSuccessMessage(body?.message ?? "Weekly recap saved.");
      await refreshNotebookData();
      setIsSavingWeeklyRecap(false);
    } catch {
      setWeeklyRecapErrorMessage(
        "We could not reach the local API. Please try again.",
      );
      setIsSavingWeeklyRecap(false);
    }
  }

  async function handleSaveRetrievalResponse(promptEntryId: string) {
    const responseBody = retrievalResponseDrafts[promptEntryId]?.trim() ?? "";

    if (!responseBody) {
      setRetrievalResponseErrorMessage("Add a short response before saving.");
      setRetrievalResponseSuccessMessage("");
      return;
    }

    setRetrievalResponseErrorMessage("");
    setRetrievalResponseSuccessMessage("");
    setSavingRetrievalPromptId(promptEntryId);

    try {
      const response = await fetch("/api/notebook/weekly-recap/response", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          weekKey: weeklyRecap?.weekKey,
          asOf: notebookItems[0]?.updatedAt,
          promptEntryId,
          response: responseBody,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            message?: string;
          }
        | null;

      if (!response.ok) {
        setRetrievalResponseErrorMessage(
          body?.message ?? "We could not save that retrieval response right now.",
        );
        setSavingRetrievalPromptId(null);
        return;
      }

      setRetrievalResponseSuccessMessage(
        body?.message ?? "Retrieval response saved.",
      );
      await refreshNotebookData();
      setSavingRetrievalPromptId(null);
    } catch {
      setRetrievalResponseErrorMessage(
        "We could not reach the local API. Please try again.",
      );
      setSavingRetrievalPromptId(null);
    }
  }

  async function handleSendReferralInvite() {
    setReferralErrorMessage("");
    setReferralSuccessMessage("");
    setIsSendingReferralInvite(true);

    try {
      const response = await fetch("/api/referrals", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          inviteeEmail: referralInviteEmail,
          inviteeFullName: referralInviteFullName,
          inviteeStageInterest: referralInviteStageInterest,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            message?: string;
            deliveryStatus?: string;
          }
        | null;

      if (!response.ok) {
        setReferralErrorMessage(
          body?.message ?? "We could not send that referral invite right now.",
        );
        setIsSendingReferralInvite(false);
        return;
      }

      setReferralSuccessMessage(
        body?.message ?? "Your referral invite is on the way.",
      );
      setReferralInviteEmail("");
      setReferralInviteFullName("");
      trackMarketingEvent("referral_invite_sent", {
        stage_interest: referralInviteStageInterest,
        delivery_status: body?.deliveryStatus ?? "unknown",
      });
      await refreshReferralData();
      setIsSendingReferralInvite(false);
    } catch {
      setReferralErrorMessage(
        "We could not reach the local API. Please try again.",
      );
      setIsSendingReferralInvite(false);
    }
  }

  function renderWeeklyRecapHistory() {
    if (weeklyRecapHistory.length === 0) {
      return null;
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Recap history
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Revisit earlier weekly summaries, retrieval prompts, and sync evidence.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {weeklyRecapHistory.length} saved
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="space-y-3">
            {weeklyRecapHistory.map((record) => {
              const isSelected = selectedWeeklyRecap?.id === record.id;

              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedWeeklyRecapId(record.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-[#0f172a] bg-slate-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">
                        {record.weekLabel}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {record.title}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      View recap details
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {buildWeeklyRecapHistoryPreview(record)}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedWeeklyRecap ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">
                    {selectedWeeklyRecap.weekLabel}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {selectedWeeklyRecap.totalEntries} entries · {selectedWeeklyRecap.authoredCount} authored
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {selectedWeeklyRecap.generationSource === "scheduled"
                    ? "Scheduled"
                    : "Manual"}
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-white bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Week in review
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {selectedWeeklyRecap.summaryLines.map((line) => (
                    <li key={line}>- {line}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Email delivery
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {getWeeklyRecapEmailStatusLabel(selectedWeeklyRecap)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Notion sync
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {getWeeklyRecapNotionStatusLabel(selectedWeeklyRecap)}
                  </p>
                  {selectedWeeklyRecap.notionLastSyncPageUrl ? (
                    <a
                      href={selectedWeeklyRecap.notionLastSyncPageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-semibold text-[#0f172a] underline-offset-4 hover:underline"
                    >
                      Open in Notion
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Retrieval progress
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {selectedWeeklyRecap.retrievalResponses.length} of{" "}
                  {selectedWeeklyRecap.retrievalPrompts.length} prompts answered
                </p>
                {selectedWeeklyRecap.topTags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedWeeklyRecap.topTags.map((tag) => (
                      <span
                        key={`${selectedWeeklyRecap.id}-${tag}`}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderReferralCard() {
    if (!canShowReferralCard) {
      return null;
    }

    return (
      <>
        <div className="relative overflow-hidden rounded-[32px] border border-[#0f172a]/5 bg-[#f8fafc] p-8 lg:p-10">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#0f172a]/5 blur-3xl" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/10">
                <Send size={12} />
                <span>Parent-to-Parent Referral</span>
              </div>
              <h2 className="text-2xl font-black text-[#0f172a]">Share the Calm</h2>
              <p className="text-sm leading-relaxed text-slate-600 font-medium">
                Your family has established a stable {programme} reading rhythm. 
                Invite another family to join the Daily Sparks circle.
              </p>
            </div>
            
            <button
               type="button"
               onClick={() => {
                 const link = `${window.location.origin}/login?ref=${initialProfile.parent.id}`;
                 navigator.clipboard.writeText(link);
                 setReferralSuccessMessage("Referral link copied to clipboard!");
               }}
               className="group flex items-center gap-3 rounded-2xl bg-white border-2 border-slate-200 px-6 py-4 text-sm font-black text-[#0f172a] shadow-sm hover:border-[#0f172a] transition-all active:scale-95"
            >
              Copy Invitation Link
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Invites sent
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[#0f172a]">
              {referralData.summary.sentCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Starter kits accepted
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[#0f172a]">
              {referralData.summary.acceptedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Trials started
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[#0f172a]">
              {referralData.summary.trialStartedCount}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Parent email
              </span>
              <input
                type="email"
                value={referralInviteEmail}
                onChange={(event) => setReferralInviteEmail(event.target.value)}
                placeholder="friend@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0f172a]"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Stage
              </span>
              <select
                value={referralInviteStageInterest}
                onChange={(event) =>
                  setReferralInviteStageInterest(
                    event.target.value as MarketingLeadStageInterest,
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
              >
                <option value="MYP">MYP</option>
                <option value="DP">DP</option>
                <option value="NOT_SURE">Not sure yet</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Parent name
            </span>
            <input
              type="text"
              value={referralInviteFullName}
              onChange={(event) => setReferralInviteFullName(event.target.value)}
              placeholder="Optional"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0f172a]"
            />
          </label>

          {referralErrorMessage ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {referralErrorMessage}
            </p>
          ) : null}

          {referralSuccessMessage ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {referralSuccessMessage}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleSendReferralInvite}
            disabled={
              isSendingReferralInvite ||
              isPending ||
              referralInviteEmail.trim().length === 0
            }
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {isSendingReferralInvite || isPending
              ? "Sending invite..."
              : "Send referral invite"}
          </button>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Recent invite activity
          </p>
          {isReferralDataLoading ? (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              Loading your referral activity now.
            </div>
          ) : referralData.recentInvites.length > 0 ? (
            <div className="mt-3 space-y-3">
              {referralData.recentInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">
                        {invite.inviteeFullName || "Unnamed family"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {invite.inviteeEmail}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {invite.inviteeStageInterest === "NOT_SURE"
                        ? "Not sure yet"
                        : invite.inviteeStageInterest}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    delivery {invite.deliveryStatus} · accepted{" "}
                    {invite.acceptedAt ? "yes" : "no"} · trial started{" "}
                    {invite.trialStartedAt ? "yes" : "no"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              Once you send the first invite, Daily Sparks will keep the latest
              referral evidence here.
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <TrialStatusBanner parent={initialProfile.parent} />
      <header className="w-full rounded-b-[32px] bg-[#0f172a] px-6 py-6 text-white shadow-md">
        <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-4 sm:items-center sm:gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#fbbf24]">
              Parent dashboard
            </p>
            <h1 className="mt-2 text-2xl font-bold">
              {displayStudentName}&apos;s reading profile
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Logged in as {initialProfile.parent.email}
            </p>
          </div>
          <AccountMenu
            fullName={initialProfile.parent.fullName}
            email={initialProfile.parent.email}
          />
        </div>
      </header>

      <main className="mx-auto mt-6 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
           <AcademicGrowthVisual 
             briefsCount={notebookItems.length} 
             streakDays={initialProfile.parent.firstBriefDeliveredAt ? 3 : 0} 
             programme={programme}
           />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] lg:items-start">
          <div className="order-2 space-y-6 lg:order-1">
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:p-7">
              <div className="mb-4 flex items-center gap-2">
                <Send className="h-5 w-5 text-[#0f172a]" />
                <h2 className="text-lg font-bold text-[#0f172a]">Delivery channels</h2>
              </div>
              <p className="text-sm leading-6 text-slate-500">
                Connect the tools your family already uses. Goodnotes is live in this
                MVP flow, and Notion is positioned as the next integration layer.
              </p>

              <div className="mt-5 space-y-4">
                <GoodnotesDeliveryCard initialProfile={initialProfile} />

                <NotionSyncCard
                  initialProfile={initialProfile}
                  notionConfigured={notionConfigured}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:p-7">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#0f172a]" />
                <h2 className="text-lg font-bold text-[#0f172a]">Weekly reading plan</h2>
              </div>
              <p className="text-sm font-semibold text-slate-700">{weeklyPlan.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {weeklyPlan.description}
              </p>

              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                {weeklyPlan.weekdays.map((entry) => (
                  <div
                    key={entry.day}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {entry.day}
                        </p>
                        <p className="mt-2 text-sm font-bold text-[#0f172a]">
                          {entry.label}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                        {stageLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      {entry.theme}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{entry.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[#fbbf24]/40 bg-[#fef3c7]/40 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
                  {weeklyPlan.sunday.label}
                </p>
                <p className="mt-2 text-sm font-bold text-[#0f172a]">
                  {weeklyPlan.sunday.theme}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {weeklyPlan.sunday.note}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:p-7">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#0f172a]" />
                <h2 className="text-lg font-bold text-[#0f172a]">Notebook</h2>
              </div>
              <p className="text-sm leading-6 text-slate-500">
                Save reusable ideas from the latest brief into a growing MYP or DP
                notebook your family can return to later.
              </p>

              {notebookDataErrorMessage ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                  <p className="text-sm leading-6 text-red-700">
                    {notebookDataErrorMessage}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotebookDataLoading(true);
                      void refreshNotebookData()
                        .catch((error) => {
                          setNotebookDataErrorMessage(
                            error instanceof Error
                              ? error.message
                              : "We could not load your notebook yet.",
                          );
                        })
                        .finally(() => {
                          setIsNotebookDataLoading(false);
                        });
                    }}
                    className="mt-3 inline-flex rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300"
                  >
                    Retry notebook load
                  </button>
                </div>
              ) : null}

              {isNotebookBootstrapping ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Loading your notebook
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      We&apos;re preparing your latest brief notes and saved notebook entries.
                    </p>
                    <div className="mt-4 space-y-3">
                      <div className="h-16 animate-pulse rounded-2xl bg-white" />
                      <div className="h-16 animate-pulse rounded-2xl bg-white" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Preparing weekly recap
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="h-20 animate-pulse rounded-2xl bg-white" />
                      <div className="h-20 animate-pulse rounded-2xl bg-white" />
                      <div className="h-20 animate-pulse rounded-2xl bg-white" />
                    </div>
                  </div>
                </div>
              ) : null}

              {!isNotebookBootstrapping && hasNotebookSuggestion ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Latest brief
                      </p>
                      <p className="mt-2 text-sm font-bold text-[#0f172a]">
                        {notebookSuggestion.headline}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                      {notebookSuggestion.scheduledFor}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {notebookSuggestion.entries.map((entry) => (
                      <div
                        key={entry.title}
                        className="rounded-2xl border border-white bg-white px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-[#0f172a]">
                          {entry.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {entry.body}
                        </p>
                      </div>
                    ))}
                  </div>

                  {notebookErrorMessage ? (
                    <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {notebookErrorMessage}
                    </p>
                  ) : null}

                  {notebookSuccessMessage ? (
                    <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {notebookSuccessMessage}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSaveNotebook}
                    disabled={isSavingNotebook || isPending}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {isSavingNotebook || isPending
                      ? "Saving..."
                      : "Save today's notes"}
                  </button>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Write your own note
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Capture one short idea in your own words so this brief becomes something your family can revisit.
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {programme}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Notebook section
                        </span>
                        <select
                          value={notebookEntryType}
                          onChange={(event) => setNotebookEntryType(event.target.value as typeof notebookEntryType)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                        >
                          {authoredNotebookEntryTypes.map((entryType) => (
                            <option key={entryType} value={entryType}>
                              {getDailyBriefNotebookEntryLabel(entryType)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Your note
                        </span>
                        <textarea
                          value={notebookEntryBody}
                          onChange={(event) => setNotebookEntryBody(event.target.value)}
                          rows={4}
                          placeholder="Write 1–3 sentences you want to keep."
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0f172a]"
                        />
                      </label>
                    </div>

                    {notebookEntryErrorMessage ? (
                      <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {notebookEntryErrorMessage}
                      </p>
                    ) : null}

                    {notebookEntrySuccessMessage ? (
                      <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {notebookEntrySuccessMessage}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleSaveNotebookEntry}
                      disabled={isSavingNotebookEntry || isPending || notebookEntryBody.trim().length === 0}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {isSavingNotebookEntry || isPending ? "Saving..." : "Save reflection"}
                    </button>
                  </div>
                </div>
              ) : !isNotebookBootstrapping ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm leading-6 text-slate-600">
                    Once your latest published brief is ready, Daily Sparks will
                    surface structured notebook entries here for quick saving.
                  </p>
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Weekly notebook recap
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Turn this week&apos;s saved notes into a short recap and a few retrieval prompts worth revisiting.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {weeklyRecap?.weekLabel ?? "No active week yet"}
                  </span>
                </div>

                {isNotebookBootstrapping ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm leading-6 text-slate-600">
                      Your recap and retrieval prompts will appear as soon as the notebook finishes loading.
                    </p>
                  </div>
                ) : weeklyRecap ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Entries this week
                        </p>
                        <p className="mt-2 text-2xl font-bold text-[#0f172a]">
                          {weeklyRecap.totalEntries}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Your own notes
                        </p>
                        <p className="mt-2 text-2xl font-bold text-[#0f172a]">
                          {weeklyRecap.authoredCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Saved brief notes
                        </p>
                        <p className="mt-2 text-2xl font-bold text-[#0f172a]">
                          {weeklyRecap.systemCount}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Week in review
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                        {weeklyRecap.summaryLines.map((line) => (
                          <li key={line}>- {line}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Focus tags
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {weeklyRecap.topTags.length > 0 ? (
                            weeklyRecap.topTags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-slate-500">
                              Save a few more notes to build tag coverage.
                            </span>
                          )}
                        </div>

                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Entry mix
                        </p>
                        <div className="mt-3 space-y-2">
                          {weeklyRecap.entryTypeBreakdown.map((entry) => (
                            <div
                              key={entry.entryType}
                              className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-sm text-slate-700"
                            >
                              <span>{entry.label}</span>
                              <span className="font-semibold text-[#0f172a]">
                                {entry.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Notebook highlights
                        </p>
                        <div className="mt-3 space-y-3">
                          {weeklyRecap.highlights.map((highlight) => (
                            <div
                              key={highlight.entryId}
                              className="rounded-2xl border border-white bg-white px-4 py-3"
                            >
                              <p className="text-sm font-semibold text-[#0f172a]">
                                {highlight.title}
                              </p>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {highlight.sourceHeadline}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-700">
                                {highlight.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {weeklyRecapErrorMessage ? (
                      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {weeklyRecapErrorMessage}
                      </p>
                    ) : null}

                    {weeklyRecapSuccessMessage ? (
                      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {weeklyRecapSuccessMessage}
                      </p>
                    ) : null}

                    {retrievalResponseErrorMessage ? (
                      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {retrievalResponseErrorMessage}
                      </p>
                    ) : null}

                    {retrievalResponseSuccessMessage ? (
                      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {retrievalResponseSuccessMessage}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleSaveWeeklyRecap}
                      disabled={isSavingWeeklyRecap || isPending}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {isSavingWeeklyRecap || isPending
                        ? "Saving..."
                        : "Save weekly recap"}
                    </button>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Retrieval prompts
                      </p>
                      <div className="mt-3 space-y-3">
                        {weeklyRecap.retrievalPrompts.map((prompt) => (
                          <div
                            key={prompt.entryId}
                            className="rounded-2xl border border-white bg-white px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-[#0f172a]">
                              {prompt.title}
                            </p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              {prompt.sourceHeadline}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {prompt.prompt}
                            </p>
                            <label className="mt-3 block space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Your response
                              </span>
                              <textarea
                                rows={3}
                                value={
                                  retrievalResponseDrafts[prompt.entryId] ??
                                  persistedRetrievalResponseDrafts[prompt.entryId] ??
                                  ""
                                }
                                onChange={(event) =>
                                  setRetrievalResponseDrafts((current) => ({
                                    ...current,
                                    [prompt.entryId]: event.target.value,
                                  }))
                                }
                                placeholder="Write 1–3 sentences to revisit this prompt."
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0f172a]"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSaveRetrievalResponse(prompt.entryId)}
                              disabled={
                                savingRetrievalPromptId === prompt.entryId || isPending
                              }
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Save className="h-4 w-4" />
                              {savingRetrievalPromptId === prompt.entryId || isPending
                                ? "Saving..."
                                : "Save response"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSyncWeeklyRecap}
                      disabled={isSyncingWeeklyRecap || isPending || !notionConfigured}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {isSyncingWeeklyRecap || isPending
                        ? "Syncing..."
                        : "Sync weekly recap to Notion"}
                    </button>

                    {renderWeeklyRecapHistory()}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm leading-6 text-slate-600">
                      Save a few notebook entries this week and Daily Sparks will turn them into a recap with retrieval prompts here.
                    </p>
                  </div>
                )}

                {!isNotebookBootstrapping && !weeklyRecap ? renderWeeklyRecapHistory() : null}
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Saved notebook entries
                </p>
                {isNotebookBootstrapping ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm leading-6 text-slate-600">
                      Loading your saved notebook library now.
                    </p>
                  </div>
                ) : notebookLibraryItems.length > 0 ? (
                  <div className="mt-3 space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_220px_220px]">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Search notebook
                        </span>
                        <input
                          type="search"
                          value={notebookSearchQuery}
                          onChange={(event) => setNotebookSearchQuery(event.target.value)}
                          placeholder="Search notes, briefs, or tags"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0f172a]"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Sort by
                        </span>
                        <select
                          value={notebookSortOrder}
                          onChange={(event) =>
                            setNotebookSortOrder(event.target.value as NotebookSortOrder)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                        >
                          <option value="newest">Newest first</option>
                          <option value="oldest">Oldest first</option>
                          <option value="title">Title A–Z</option>
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Filter tags
                        </span>
                        <select
                          value={notebookTagFilter}
                          onChange={(event) => setNotebookTagFilter(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0f172a]"
                        >
                          <option value={ALL_NOTEBOOK_TAG_FILTER_ID}>All tags</option>
                          {notebookTagOptions.map((tag) => (
                            <option key={tag} value={tag}>
                              {tag}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Filter notebook
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {notebookFilterOptions.map((option) => {
                          const active = notebookFilterId === option.id;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setNotebookFilterId(option.id)}
                              className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                                active
                                  ? "border-[#0f172a] bg-[#0f172a] text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              {option.label} ({option.count})
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {visibleNotebookItems.length > 0 ? (
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                        <div className="space-y-3">
                          {visibleNotebookItems.map((entry) => {
                            const active = selectedNotebookEntry?.id === entry.id;

                            return (
                              <button
                                key={entry.id}
                                type="button"
                                onClick={() => setSelectedNotebookEntryId(entry.id)}
                                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                  active
                                    ? "border-[#0f172a] bg-slate-50 shadow-sm"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#0f172a]">
                                    {entry.title}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                      {entry.sourceScheduledFor} · {entry.programme} · {entry.entryOrigin === "authored" ? "Your note" : "Saved brief"}
                                  </p>
                                </div>
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                    {entry.knowledgeBankTitle}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  {buildNotebookEntryPreview(entry)}
                                </p>
                              </button>
                            );
                          })}
                        </div>

                        {selectedNotebookEntry ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                              Notebook detail
                            </p>
                            <h3 className="mt-2 text-base font-bold text-[#0f172a]">
                              {selectedNotebookEntry.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {selectedNotebookEntry.body}
                            </p>

                            <dl className="mt-4 grid gap-3 text-sm">
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  Source brief
                                </dt>
                                <dd className="mt-1 text-slate-700">
                                  {selectedNotebookEntry.sourceHeadline}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  Saved on
                                </dt>
                                <dd className="mt-1 text-slate-700">
                                  {selectedNotebookEntry.updatedAt}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  Topic tags
                                </dt>
                                <dd className="mt-2 flex flex-wrap gap-2">
                                  {selectedNotebookEntry.topicTags.length > 0 ? (
                                    selectedNotebookEntry.topicTags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                                      >
                                        {tag}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-500">No topic tags yet.</span>
                                  )}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  Interest tags
                                </dt>
                                <dd className="mt-2 flex flex-wrap gap-2">
                                  {selectedNotebookEntry.interestTags.length > 0 ? (
                                    selectedNotebookEntry.interestTags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                                      >
                                        {tag}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-500">No interest tags yet.</span>
                                  )}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-sm leading-6 text-slate-600">
                          No notebook entries match this filter yet.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Saved notebook entries will appear here after your first save.
                  </p>
                )}
              </div>
            </section>

            {renderReferralCard()}
          </div>

          <div className="order-1 space-y-6 lg:order-2">
            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:p-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-500">Current plan</h2>
                <p className="mt-1 text-lg font-bold text-[#0f172a]">
                  {billingSummary.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">{billingSummary.subtitle}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-slate-600">
                    {billingSummary.statusLabel}
                  </span>
                  <span className="rounded-full bg-[#fff7dd] px-3 py-1 text-xs font-semibold text-[#b45309]">
                    {stageLabel}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {billingSummary.detail}
                </p>
                {billingSummary.summaryRows.length > 0 ? (
                  <dl className="mt-4 grid gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                    {billingSummary.summaryRows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <dt className="text-slate-500">{row.label}</dt>
                        <dd className="text-right font-semibold text-[#0f172a]">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>

              <div className="mt-4 flex justify-center lg:justify-start">
                <Link
                  href="/billing"
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1e293b]"
                >
                  <CreditCard className="h-4 w-4" />
                  Manage subscription
                </Link>
              </div>
            </section>

            <section
              className={`rounded-3xl p-6 shadow-sm ${
                hasSavedStudentName
                  ? "border border-slate-100 bg-white"
                  : "border border-[#fbbf24]/30 bg-[#fff7dd]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.24em] ${
                      hasSavedStudentName ? "text-slate-400" : "text-[#b45309]"
                    }`}
                  >
                    {hasSavedStudentName ? "Child profile" : "One last setup detail"}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-[#0f172a]">
                    {hasSavedStudentName
                      ? "Keep your child's first name up to date"
                      : "Add your child's first name"}
                  </h2>
                </div>
                {hasSavedStudentName ? (
                  <span className="rounded-full bg-[#eefbf3] px-3 py-1 text-xs font-semibold text-[#15803d]">
                    Saved
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {hasSavedStudentName
                  ? "Update the name used across reading briefs, weekly plans, and delivery notes."
                  : "We use it across reading briefs, weekly plans, and delivery notes."}
              </p>

              <label className="mt-4 flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {hasSavedStudentName ? "Current child name" : "Child name"}
                </span>
                <input
                  className="rounded-2xl border border-[#fbbf24]/30 bg-white px-4 py-3 text-base text-[#0f172a] placeholder:text-slate-300 caret-[#0f172a] outline-none transition focus:border-[#f59e0b]"
                  type="text"
                  value={studentName}
                  onChange={(event) => setStudentName(event.target.value)}
                  placeholder="Katherine"
                />
              </label>

              <button
                type="button"
                onClick={handleSave}
                disabled={
                  isSaving ||
                  isPending ||
                  !hasMeaningfulStudentName(studentName)
                }
                className="mx-auto mt-4 flex w-fit items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60 lg:mx-0"
              >
                <Save className="h-4 w-4" />
                {isSaving || isPending
                  ? "Saving..."
                  : hasSavedStudentName
                    ? "Update child name"
                    : "Save child name"}
              </button>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Delivery timing
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-[#0f172a]">
                    Deliver daily briefs in your local time
                  </h2>
                </div>
                {hasSavedDeliveryPreferences ? (
                  <span className="rounded-full bg-[#eefbf3] px-3 py-1 text-xs font-semibold text-[#15803d]">
                    Saved
                  </span>
                ) : (
                  <span className="rounded-full bg-[#fff7dd] px-3 py-1 text-xs font-semibold text-[#b45309]">
                    Auto-detected
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Daily Sparks will use your selected country for a friendly setup
                flow, then schedule delivery by time zone. Right now this family is
                set to{" "}
                <span className="font-semibold text-[#0f172a]">
                  {formatPreferredDeliveryLocalTime(preferredDeliveryLocalTime)}
                </span>{" "}
                in{" "}
                <span className="font-semibold text-[#0f172a]">
                  {formatTimeZoneLabel(deliveryTimeZone)}
                </span>
                .
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Country / region
                  </span>
                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0f172a] outline-none transition focus:border-[#0f172a]"
                    value={countryCode}
                    onChange={(event) => handleCountryCodeChange(event.target.value)}
                  >
                    {DELIVERY_COUNTRY_OPTIONS.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Local delivery time
                  </span>
                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0f172a] outline-none transition focus:border-[#0f172a]"
                    value={preferredDeliveryLocalTime}
                    onChange={(event) => {
                      setDeliveryErrorMessage("");
                      setDeliverySuccessMessage("");
                      setPreferredDeliveryLocalTime(event.target.value);
                    }}
                  >
                    {DELIVERY_TIME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Time zone
                </span>
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0f172a] outline-none transition focus:border-[#0f172a]"
                  value={deliveryTimeZone}
                  onChange={(event) => {
                    setDeliveryErrorMessage("");
                    setDeliverySuccessMessage("");
                    setDeliveryTimeZone(event.target.value);
                  }}
                >
                  {DELIVERY_TIME_ZONE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatTimeZoneLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              {deliveryErrorMessage ? (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {deliveryErrorMessage}
                </p>
              ) : null}

              {deliverySuccessMessage ? (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {deliverySuccessMessage}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleSaveDeliveryPreferences}
                disabled={isSavingDeliveryPreferences || isPending}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Clock3 className="h-4 w-4" />
                {isSavingDeliveryPreferences || isPending
                  ? "Saving..."
                  : "Save delivery schedule"}
              </button>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#0f172a]">Learning stage</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose your child&apos;s current IB programme. Daily Sparks will adapt
                the weekly reading mode automatically.
              </p>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Programme
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {publicProgrammeOptions.map((option) => {
                    const active = programme === option;
                    const optionSummary = getProgrammeStageSummary(option);

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleProgrammeChange(option)}
                        className={`flex w-full flex-col items-center rounded-2xl border px-3 py-3 text-sm transition ${
                          active
                            ? "border-[#0f172a] bg-[#0f172a] text-white shadow-md shadow-[#0f172a]/20"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-base font-bold">{option}</span>
                        <span
                          className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            active ? "text-slate-200" : "text-slate-400"
                          }`}
                        >
                          {optionSummary.selectorLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isLegacyPypProfile ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                    PYP legacy mode
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    New public setup is now focused on MYP and DP. Existing PYP
                    records stay supported, but new public configuration follows
                    the MYP/DP track.
                  </p>
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {programmeStageSummary.badgeLabel}
                </p>
                <p className="mt-2 text-sm font-bold text-[#0f172a]">
                  {programmeStageSummary.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {programmeStageSummary.description}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Interest focus
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Choose a few areas to shape future MYP or DP reading picks.
                </p>
                {interestOptions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {interestOptions.map((option) => {
                      const active = interestTags.includes(option);

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleInterestToggle(option)}
                          className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                            active
                              ? "border-[#0f172a] bg-[#0f172a] text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Interest taxonomy is currently active for MYP and DP public
                    setup.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Dashboard actions
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Save any updates to your child&apos;s programme or onboarding setup.
              </p>

              {errorMessage ? (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}

              {successMessage ? (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isPending}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fbbf24] px-5 py-4 text-lg font-bold text-[#0f172a] shadow-lg shadow-[#fbbf24]/30 transition hover:bg-[#f59e0b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-5 w-5" />
                {isSaving || isPending ? "Saving..." : "Save preferences"}
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

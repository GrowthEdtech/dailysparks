import type {
  GoodnotesDeliveryStatus,
  OnboardingReminderStatus,
  ParentProfile,
  ParentRecord,
  StudentRecord,
  SubscriptionPlan,
  TrialConversionNurtureStatus,
  UpdateParentDeliveryPreferencesInput,
  UpdateParentGrowthMilestonesInput,
  UpdateParentNotificationEmailStateInput,
  UpdateParentOnboardingReminderInput,
  UpdateParentNotionInput,
  UpdateStudentGoodnotesInput,
} from "./mvp-types";
import {
  DEFAULT_PROGRAMME,
  getDefaultProgrammeYear,
  isSubscriptionPlan,
} from "./mvp-types";
import { normalizeMarketingAttributionSource } from "./marketing-attribution";
import {
  DEFAULT_COUNTRY_CODE,
  DEFAULT_DELIVERY_TIME_ZONE,
  DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME,
  resolveDeliveryPreferences,
} from "./delivery-locale";
import { getFirebaseAdminDb } from "./firebase-admin";
import type { ProfileStore } from "./profile-store";
import {
  DEFAULT_PUBLIC_PROGRAMME,
  getPublicProgrammeYear,
  sanitizeInterestTagsForProgramme,
} from "./student-interest-taxonomy";
import { hasAutomatedDeliverySubscription } from "./delivery-eligibility";
import { hasDispatchableDeliveryChannel } from "./delivery-readiness";
import {
  applyAutomaticGrowthMilestones,
  applySetOnceGrowthMilestones,
} from "./profile-growth-milestones";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeGoodnotesStatus(value: unknown): GoodnotesDeliveryStatus | null {
  return value === "idle" || value === "success" || value === "failed"
    ? value
    : null;
}

function normalizeOnboardingReminderStatus(
  value: unknown,
): OnboardingReminderStatus | null {
  return value === "sent" || value === "failed" ? value : null;
}

function normalizeTrialConversionNurtureStatus(
  value: unknown,
): TrialConversionNurtureStatus | null {
  return value === "sent" || value === "failed" ? value : null;
}

function addDays(timestamp: string, days: number) {
  const date = new Date(timestamp);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function normalizeParentRecord(
  id: string,
  raw: Partial<ParentRecord> | undefined,
): ParentRecord {
  const timestamp = new Date().toISOString();
  const subscriptionPlan =
    typeof raw?.subscriptionPlan === "string" && isSubscriptionPlan(raw.subscriptionPlan)
      ? raw.subscriptionPlan
      : null;
  const stripeCustomerId =
    typeof raw?.stripeCustomerId === "string" && raw.stripeCustomerId.trim()
      ? raw.stripeCustomerId.trim()
      : null;
  const stripeSubscriptionId =
    typeof raw?.stripeSubscriptionId === "string" && raw.stripeSubscriptionId.trim()
      ? raw.stripeSubscriptionId.trim()
      : null;
  const createdAt = raw?.createdAt || timestamp;
  const trialStartedAt =
    typeof raw?.trialStartedAt === "string" && raw.trialStartedAt
      ? raw.trialStartedAt
      : createdAt;
  const firstAuthenticatedAt =
    typeof raw?.firstAuthenticatedAt === "string" && raw.firstAuthenticatedAt
      ? raw.firstAuthenticatedAt
      : null;
  const childProfileCompletedAt =
    typeof raw?.childProfileCompletedAt === "string" && raw.childProfileCompletedAt
      ? raw.childProfileCompletedAt
      : null;
  const firstDispatchableChannelAt =
    typeof raw?.firstDispatchableChannelAt === "string" &&
    raw.firstDispatchableChannelAt
      ? raw.firstDispatchableChannelAt
      : null;
  const firstBriefDeliveredAt =
    typeof raw?.firstBriefDeliveredAt === "string" && raw.firstBriefDeliveredAt
      ? raw.firstBriefDeliveredAt
      : null;
  const firstPaidAt =
    typeof raw?.firstPaidAt === "string" && raw.firstPaidAt
      ? raw.firstPaidAt
      : null;
  const acquisitionSource = normalizeMarketingAttributionSource(
    raw?.acquisitionSource,
  );
  const acquisitionCapturedAt = normalizeNullableString(raw?.acquisitionCapturedAt);
  const acquisitionLeadId = normalizeNullableString(raw?.acquisitionLeadId);
  const acquisitionReferralInviteId = normalizeNullableString(
    raw?.acquisitionReferralInviteId,
  );
  const acquisitionPagePath = normalizeNullableString(raw?.acquisitionPagePath);
  const acquisitionReferrerUrl = normalizeNullableString(raw?.acquisitionReferrerUrl);
  const acquisitionUtmSource = normalizeNullableString(raw?.acquisitionUtmSource);
  const acquisitionUtmMedium = normalizeNullableString(raw?.acquisitionUtmMedium);
  const acquisitionUtmCampaign = normalizeNullableString(raw?.acquisitionUtmCampaign);
  const acquisitionUtmContent = normalizeNullableString(raw?.acquisitionUtmContent);
  const acquisitionUtmTerm = normalizeNullableString(raw?.acquisitionUtmTerm);
  const trialEndsAt =
    typeof raw?.trialEndsAt === "string" && raw.trialEndsAt
      ? raw.trialEndsAt
      : addDays(trialStartedAt, 7);
  const subscriptionActivatedAt =
    typeof raw?.subscriptionActivatedAt === "string" && raw.subscriptionActivatedAt
      ? raw.subscriptionActivatedAt
      : null;
  const subscriptionRenewalAt =
    typeof raw?.subscriptionRenewalAt === "string" && raw.subscriptionRenewalAt
      ? raw.subscriptionRenewalAt
      : null;
  const latestInvoiceId = normalizeNullableString(raw?.latestInvoiceId);
  const latestInvoiceNumber = normalizeNullableString(raw?.latestInvoiceNumber);
  const latestInvoiceStatus = normalizeNullableString(raw?.latestInvoiceStatus);
  const latestInvoiceHostedUrl = normalizeNullableString(raw?.latestInvoiceHostedUrl);
  const latestInvoicePdfUrl = normalizeNullableString(raw?.latestInvoicePdfUrl);
  const latestInvoiceAmountPaid = normalizeNullableNumber(raw?.latestInvoiceAmountPaid);
  const latestInvoiceCurrency = normalizeNullableString(raw?.latestInvoiceCurrency);
  const latestInvoicePaidAt = normalizeNullableString(raw?.latestInvoicePaidAt);
  const latestInvoicePeriodStart = normalizeNullableString(raw?.latestInvoicePeriodStart);
  const latestInvoicePeriodEnd = normalizeNullableString(raw?.latestInvoicePeriodEnd);
  const trialEndingReminderLastNotifiedAt = normalizeNullableString(
    raw?.trialEndingReminderLastNotifiedAt,
  );
  const trialEndingReminderLastTrialEndsAt = normalizeNullableString(
    raw?.trialEndingReminderLastTrialEndsAt,
  );
  const trialEndingReminderLastResolvedAt = normalizeNullableString(
    raw?.trialEndingReminderLastResolvedAt,
  );
  const trialEndingReminderLastResolvedTrialEndsAt = normalizeNullableString(
    raw?.trialEndingReminderLastResolvedTrialEndsAt,
  );
  const billingStatusNotificationLastSentAt = normalizeNullableString(
    raw?.billingStatusNotificationLastSentAt,
  );
  const billingStatusNotificationLastInvoiceId = normalizeNullableString(
    raw?.billingStatusNotificationLastInvoiceId,
  );
  const billingStatusNotificationLastInvoiceStatus = normalizeNullableString(
    raw?.billingStatusNotificationLastInvoiceStatus,
  );
  const billingStatusNotificationLastResolvedAt = normalizeNullableString(
    raw?.billingStatusNotificationLastResolvedAt,
  );
  const billingStatusNotificationLastResolvedInvoiceId = normalizeNullableString(
    raw?.billingStatusNotificationLastResolvedInvoiceId,
  );
  const billingStatusNotificationLastResolvedInvoiceStatus = normalizeNullableString(
    raw?.billingStatusNotificationLastResolvedInvoiceStatus,
  );
  const deliverySupportAlertLastNotifiedAt = normalizeNullableString(
    raw?.deliverySupportAlertLastNotifiedAt,
  );
  const deliverySupportAlertLastReasonKey = normalizeNullableString(
    raw?.deliverySupportAlertLastReasonKey,
  );
  const deliverySupportAlertLastResolvedAt = normalizeNullableString(
    raw?.deliverySupportAlertLastResolvedAt,
  );
  const deliverySupportAlertLastResolvedReasonKey = normalizeNullableString(
    raw?.deliverySupportAlertLastResolvedReasonKey,
  );
  const trialConversionNurtureCount =
    typeof raw?.trialConversionNurtureCount === "number" &&
    Number.isFinite(raw.trialConversionNurtureCount) &&
    raw.trialConversionNurtureCount >= 0
      ? raw.trialConversionNurtureCount
      : 0;
  const trialConversionNurtureLastAttemptAt = normalizeNullableString(
    raw?.trialConversionNurtureLastAttemptAt,
  );
  const trialConversionNurtureLastSentAt = normalizeNullableString(
    raw?.trialConversionNurtureLastSentAt,
  );
  const trialConversionNurtureLastStage =
    typeof raw?.trialConversionNurtureLastStage === "number" &&
    Number.isFinite(raw.trialConversionNurtureLastStage) &&
    raw.trialConversionNurtureLastStage > 0
      ? raw.trialConversionNurtureLastStage
      : null;
  const trialConversionNurtureLastStatus = normalizeTrialConversionNurtureStatus(
    raw?.trialConversionNurtureLastStatus,
  );
  const trialConversionNurtureLastMessageId = normalizeNullableString(
    raw?.trialConversionNurtureLastMessageId,
  );
  const trialConversionNurtureLastError = normalizeNullableString(
    raw?.trialConversionNurtureLastError,
  );
  const notionWorkspaceId = normalizeNullableString(raw?.notionWorkspaceId);
  const notionWorkspaceName = normalizeNullableString(raw?.notionWorkspaceName);
  const notionBotId = normalizeNullableString(raw?.notionBotId);
  const notionDatabaseId = normalizeNullableString(raw?.notionDatabaseId);
  const notionDatabaseName = normalizeNullableString(raw?.notionDatabaseName);
  const notionDataSourceId = normalizeNullableString(raw?.notionDataSourceId);
  const notionAuthorizedAt = normalizeNullableString(raw?.notionAuthorizedAt);
  const notionLastSyncedAt = normalizeNullableString(raw?.notionLastSyncedAt);
  const notionLastSyncStatus =
    raw?.notionLastSyncStatus === "idle" ||
    raw?.notionLastSyncStatus === "success" ||
    raw?.notionLastSyncStatus === "failed"
      ? raw.notionLastSyncStatus
      : null;
  const notionLastSyncMessage = normalizeNullableString(raw?.notionLastSyncMessage);
  const notionLastSyncPageId = normalizeNullableString(raw?.notionLastSyncPageId);
  const notionLastSyncPageUrl = normalizeNullableString(raw?.notionLastSyncPageUrl);
  const deliveryPreferences = resolveDeliveryPreferences({
    countryCode:
      typeof raw?.countryCode === "string" ? raw.countryCode : DEFAULT_COUNTRY_CODE,
    deliveryTimeZone:
      typeof raw?.deliveryTimeZone === "string"
        ? raw.deliveryTimeZone
        : DEFAULT_DELIVERY_TIME_ZONE,
    preferredDeliveryLocalTime:
      typeof raw?.preferredDeliveryLocalTime === "string"
        ? raw.preferredDeliveryLocalTime
        : DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME,
  });

  return {
    id,
    email: normalizeEmail(raw?.email ?? ""),
    fullName: raw?.fullName?.trim() || "Daily Sparks Parent",
    countryCode: deliveryPreferences.countryCode,
    deliveryTimeZone: deliveryPreferences.deliveryTimeZone,
    preferredDeliveryLocalTime: deliveryPreferences.preferredDeliveryLocalTime,
    firstAuthenticatedAt,
    childProfileCompletedAt,
    firstDispatchableChannelAt,
    firstBriefDeliveredAt,
    firstPaidAt,
    acquisitionSource,
    acquisitionCapturedAt,
    acquisitionLeadId,
    acquisitionReferralInviteId,
    acquisitionPagePath,
    acquisitionReferrerUrl,
    acquisitionUtmSource,
    acquisitionUtmMedium,
    acquisitionUtmCampaign,
    acquisitionUtmContent,
    acquisitionUtmTerm,
    onboardingReminderCount:
      typeof raw?.onboardingReminderCount === "number" &&
      Number.isFinite(raw.onboardingReminderCount) &&
      raw.onboardingReminderCount >= 0
        ? raw.onboardingReminderCount
        : 0,
    onboardingReminderLastAttemptAt: normalizeNullableString(
      raw?.onboardingReminderLastAttemptAt,
    ),
    onboardingReminderLastSentAt: normalizeNullableString(
      raw?.onboardingReminderLastSentAt,
    ),
    onboardingReminderLastStage:
      typeof raw?.onboardingReminderLastStage === "number" &&
      Number.isFinite(raw.onboardingReminderLastStage) &&
      raw.onboardingReminderLastStage > 0
        ? raw.onboardingReminderLastStage
        : null,
    onboardingReminderLastStatus: normalizeOnboardingReminderStatus(
      raw?.onboardingReminderLastStatus,
    ),
    onboardingReminderLastMessageId: normalizeNullableString(
      raw?.onboardingReminderLastMessageId,
    ),
    onboardingReminderLastError: normalizeNullableString(
      raw?.onboardingReminderLastError,
    ),
    subscriptionStatus:
      raw?.subscriptionStatus === "free" ||
      raw?.subscriptionStatus === "trial" ||
      raw?.subscriptionStatus === "active" ||
      raw?.subscriptionStatus === "canceled"
        ? raw.subscriptionStatus
        : "trial",
    subscriptionPlan,
    stripeCustomerId,
    stripeSubscriptionId,
    trialStartedAt,
    trialEndsAt,
    subscriptionActivatedAt,
    subscriptionRenewalAt,
    latestInvoiceId,
    latestInvoiceNumber,
    latestInvoiceStatus,
    latestInvoiceHostedUrl,
    latestInvoicePdfUrl,
    latestInvoiceAmountPaid,
    latestInvoiceCurrency,
    latestInvoicePaidAt,
    latestInvoicePeriodStart,
    latestInvoicePeriodEnd,
    trialEndingReminderLastNotifiedAt,
    trialEndingReminderLastTrialEndsAt,
    trialEndingReminderLastResolvedAt,
    trialEndingReminderLastResolvedTrialEndsAt,
    billingStatusNotificationLastSentAt,
    billingStatusNotificationLastInvoiceId,
    billingStatusNotificationLastInvoiceStatus,
    billingStatusNotificationLastResolvedAt,
    billingStatusNotificationLastResolvedInvoiceId,
    billingStatusNotificationLastResolvedInvoiceStatus,
    deliverySupportAlertLastNotifiedAt,
    deliverySupportAlertLastReasonKey,
    deliverySupportAlertLastResolvedAt,
    deliverySupportAlertLastResolvedReasonKey,
    trialConversionNurtureCount,
    trialConversionNurtureLastAttemptAt,
    trialConversionNurtureLastSentAt,
    trialConversionNurtureLastStage,
    trialConversionNurtureLastStatus,
    trialConversionNurtureLastMessageId,
    trialConversionNurtureLastError,
    notionWorkspaceId,
    notionWorkspaceName,
    notionBotId,
    notionDatabaseId,
    notionDatabaseName,
    notionDataSourceId,
    notionAuthorizedAt,
    notionLastSyncedAt,
    notionLastSyncStatus,
    notionLastSyncMessage,
    notionLastSyncPageId,
    notionLastSyncPageUrl,
    createdAt,
    updatedAt: raw?.updatedAt || timestamp,
  };
}

function normalizeStudentRecord(
  id: string,
  raw: Partial<StudentRecord> | undefined,
): StudentRecord {
  const timestamp = new Date().toISOString();
  const programme = raw?.programme || DEFAULT_PROGRAMME;
  const rawInterestTags = Array.isArray(raw?.interestTags)
    ? raw.interestTags.filter((value): value is string => typeof value === "string")
    : [];

  return {
    id,
    parentId: raw?.parentId || "",
    studentName: raw?.studentName?.trim() || "Student",
    programme,
    programmeYear: raw?.programmeYear || getDefaultProgrammeYear(programme),
    interestTags: sanitizeInterestTagsForProgramme(programme, rawInterestTags),
    goodnotesEmail: raw?.goodnotesEmail?.trim() || "",
    goodnotesConnected: raw?.goodnotesConnected === true,
    goodnotesVerifiedAt: normalizeNullableString(raw?.goodnotesVerifiedAt),
    goodnotesLastTestSentAt: normalizeNullableString(raw?.goodnotesLastTestSentAt),
    goodnotesLastDeliveryStatus: normalizeGoodnotesStatus(
      raw?.goodnotesLastDeliveryStatus,
    ),
    goodnotesLastDeliveryMessage: normalizeNullableString(
      raw?.goodnotesLastDeliveryMessage,
    ),
    notionConnected: raw?.notionConnected === true,
    createdAt: raw?.createdAt || timestamp,
    updatedAt: raw?.updatedAt || timestamp,
  };
}

function toProfile(parent: ParentRecord, student: StudentRecord): ParentProfile {
  return {
    parent,
    student,
  };
}

function compareProfilesByCreatedAtDesc(
  left: ParentProfile,
  right: ParentProfile,
) {
  const leftTimestamp = Date.parse(left.parent.createdAt);
  const rightTimestamp = Date.parse(right.parent.createdAt);

  if (!Number.isNaN(leftTimestamp) && !Number.isNaN(rightTimestamp)) {
    return rightTimestamp - leftTimestamp;
  }

  return right.parent.createdAt.localeCompare(left.parent.createdAt);
}

function isEligibleForAutomatedDelivery(profile: ParentProfile) {
  const hasReadyDeliveryChannel =
    profile.student.goodnotesConnected || profile.student.notionConnected;

  return (
    hasAutomatedDeliverySubscription(profile.parent) &&
    hasReadyDeliveryChannel
  );
}

function isDispatchableForAutomatedDelivery(profile: ParentProfile) {
  return (
    hasAutomatedDeliverySubscription(profile.parent) &&
    hasDispatchableDeliveryChannel(profile)
  );
}

async function findParentByEmail(email: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("parents")
    .where("email", "==", email)
    .limit(1)
    .get();

  const document = snapshot.docs[0];

  if (!document) {
    return null;
  }

  return normalizeParentRecord(
    document.id,
    document.data() as Partial<ParentRecord> | undefined,
  );
}

async function findStudentByParentId(parentId: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("students")
    .where("parentId", "==", parentId)
    .limit(1)
    .get();

  const document = snapshot.docs[0];

  if (!document) {
    return null;
  }

  return normalizeStudentRecord(
    document.id,
    document.data() as Partial<StudentRecord> | undefined,
  );
}

async function findParentById(parentId: string) {
  const db = getFirebaseAdminDb();
  const document = await db.collection("parents").doc(parentId).get();

  if (!document.exists) {
    return null;
  }

  return normalizeParentRecord(
    document.id,
    document.data() as Partial<ParentRecord> | undefined,
  );
}

async function listAllProfiles() {
  const db = getFirebaseAdminDb();
  const [parentSnapshot, studentSnapshot] = await Promise.all([
    db.collection("parents").get(),
    db.collection("students").get(),
  ]);
  const studentsByParentId = new Map<string, StudentRecord>();

  for (const document of studentSnapshot.docs) {
    const student = normalizeStudentRecord(
      document.id,
      document.data() as Partial<StudentRecord> | undefined,
    );

    if (student.parentId) {
      studentsByParentId.set(student.parentId, student);
    }
  }

  return parentSnapshot.docs
    .map((document) => {
      const parent = normalizeParentRecord(
        document.id,
        document.data() as Partial<ParentRecord> | undefined,
      );
      const student = studentsByParentId.get(parent.id);

      if (!student) {
        return null;
      }

      return toProfile(parent, student);
    })
    .filter((profile): profile is ParentProfile => Boolean(profile))
    .sort(compareProfilesByCreatedAtDesc);
}

function createParentRecord(email: string, fullName: string): ParentRecord {
  const db = getFirebaseAdminDb();
  const timestamp = new Date().toISOString();

  return {
    id: db.collection("parents").doc().id,
    email,
    fullName,
    countryCode: DEFAULT_COUNTRY_CODE,
    deliveryTimeZone: DEFAULT_DELIVERY_TIME_ZONE,
    preferredDeliveryLocalTime: DEFAULT_PREFERRED_DELIVERY_LOCAL_TIME,
    firstAuthenticatedAt: timestamp,
    childProfileCompletedAt: null,
    firstDispatchableChannelAt: null,
    firstBriefDeliveredAt: null,
    firstPaidAt: null,
    acquisitionSource: null,
    acquisitionCapturedAt: null,
    acquisitionLeadId: null,
    acquisitionReferralInviteId: null,
    acquisitionPagePath: null,
    acquisitionReferrerUrl: null,
    acquisitionUtmSource: null,
    acquisitionUtmMedium: null,
    acquisitionUtmCampaign: null,
    acquisitionUtmContent: null,
    acquisitionUtmTerm: null,
    onboardingReminderCount: 0,
    onboardingReminderLastAttemptAt: null,
    onboardingReminderLastSentAt: null,
    onboardingReminderLastStage: null,
    onboardingReminderLastStatus: null,
    onboardingReminderLastMessageId: null,
    onboardingReminderLastError: null,
    subscriptionStatus: "trial",
    subscriptionPlan: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialStartedAt: timestamp,
    trialEndsAt: addDays(timestamp, 7),
    subscriptionActivatedAt: null,
    subscriptionRenewalAt: null,
    latestInvoiceId: null,
    latestInvoiceNumber: null,
    latestInvoiceStatus: null,
    latestInvoiceHostedUrl: null,
    latestInvoicePdfUrl: null,
    latestInvoiceAmountPaid: null,
    latestInvoiceCurrency: null,
    latestInvoicePaidAt: null,
    latestInvoicePeriodStart: null,
    latestInvoicePeriodEnd: null,
    trialEndingReminderLastNotifiedAt: null,
    trialEndingReminderLastTrialEndsAt: null,
    trialEndingReminderLastResolvedAt: null,
    trialEndingReminderLastResolvedTrialEndsAt: null,
    billingStatusNotificationLastSentAt: null,
    billingStatusNotificationLastInvoiceId: null,
    billingStatusNotificationLastInvoiceStatus: null,
    billingStatusNotificationLastResolvedAt: null,
    billingStatusNotificationLastResolvedInvoiceId: null,
    billingStatusNotificationLastResolvedInvoiceStatus: null,
    deliverySupportAlertLastNotifiedAt: null,
    deliverySupportAlertLastReasonKey: null,
    deliverySupportAlertLastResolvedAt: null,
    deliverySupportAlertLastResolvedReasonKey: null,
    notionWorkspaceId: null,
    notionWorkspaceName: null,
    notionBotId: null,
    notionDatabaseId: null,
    notionDatabaseName: null,
    notionDataSourceId: null,
    notionAuthorizedAt: null,
    notionLastSyncedAt: null,
    notionLastSyncStatus: null,
    notionLastSyncMessage: null,
    notionLastSyncPageId: null,
    notionLastSyncPageUrl: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createStudentRecord(parentId: string, studentName: string): StudentRecord {
  const db = getFirebaseAdminDb();
  const timestamp = new Date().toISOString();

  return {
    id: db.collection("students").doc().id,
    parentId,
    studentName,
    programme: DEFAULT_PUBLIC_PROGRAMME,
    programmeYear: getPublicProgrammeYear(DEFAULT_PUBLIC_PROGRAMME),
    interestTags: [],
    goodnotesEmail: "",
    goodnotesConnected: false,
    goodnotesVerifiedAt: null,
    goodnotesLastTestSentAt: null,
    goodnotesLastDeliveryStatus: null,
    goodnotesLastDeliveryMessage: null,
    notionConnected: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const firestoreProfileStore: ProfileStore = {
  async getProfileByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    const parent = await findParentByEmail(normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = await findStudentByParentId(parent.id);

    if (!student) {
      return null;
    }

    return toProfile(parent, student);
  },

  async getProfileByParentId(parentId) {
    const parent = await findParentById(parentId);

    if (!parent) {
      return null;
    }

    const student = await findStudentByParentId(parent.id);

    if (!student) {
      return null;
    }

    return toProfile(parent, student);
  },

  async listParentProfiles() {
    return listAllProfiles();
  },

  async listEligibleDeliveryProfiles() {
    const profiles = await listAllProfiles();

    return profiles
      .filter((profile) => isEligibleForAutomatedDelivery(profile))
      .sort((left, right) =>
        left.parent.email.localeCompare(right.parent.email),
      );
  },

  async listDispatchableDeliveryProfiles() {
    const profiles = await listAllProfiles();

    return profiles
      .filter((profile) => isDispatchableForAutomatedDelivery(profile))
      .sort((left, right) =>
        left.parent.email.localeCompare(right.parent.email),
      );
  },

  async getOrCreateParentProfile(input) {
    const db = getFirebaseAdminDb();
    const normalizedEmail = normalizeEmail(input.email);
    const existingParent = await findParentByEmail(normalizedEmail);

    if (existingParent) {
      const maybeStudent = await findStudentByParentId(existingParent.id);
      const nextFullName = input.fullName?.trim() ?? existingParent.fullName;
      const nowIso = new Date().toISOString();
      let shouldPersistParent = false;

      if (nextFullName !== existingParent.fullName) {
        existingParent.fullName = nextFullName;
        existingParent.updatedAt = nowIso;
        shouldPersistParent = true;
      }

      if (!existingParent.firstAuthenticatedAt) {
        existingParent.firstAuthenticatedAt = nowIso;
        existingParent.updatedAt = nowIso;
        shouldPersistParent = true;
      }

      if (shouldPersistParent) {
        await db.collection("parents").doc(existingParent.id).set(existingParent);
      }

      if (maybeStudent) {
        const automaticMilestones = applyAutomaticGrowthMilestones({
          parent: existingParent,
          student: maybeStudent,
          now: nowIso,
        });

        if (automaticMilestones.changed) {
          Object.assign(existingParent, automaticMilestones.parent);
          existingParent.updatedAt = nowIso;
          await db.collection("parents").doc(existingParent.id).set(existingParent);
        }

        return toProfile(existingParent, maybeStudent);
      }

      const createdStudent = createStudentRecord(
        existingParent.id,
        input.studentName?.trim() || "Student",
      );

      await db.collection("students").doc(createdStudent.id).set(createdStudent);

      return toProfile(existingParent, createdStudent);
    }

    const createdParent = createParentRecord(
      normalizedEmail,
      input.fullName?.trim() || "Daily Sparks Parent",
    );
    const createdStudent = createStudentRecord(
      createdParent.id,
      input.studentName?.trim() || "Student",
    );
    const createdParentWithMilestones = applyAutomaticGrowthMilestones({
      parent: createdParent,
      student: createdStudent,
      now: createdParent.createdAt,
    }).parent;

    await db.collection("parents").doc(createdParent.id).set(createdParentWithMilestones);
    await db.collection("students").doc(createdStudent.id).set(createdStudent);

    return toProfile(createdParentWithMilestones, createdStudent);
  },

  async updateStudentPreferences(email, input) {
    const db = getFirebaseAdminDb();
    const normalizedEmail = normalizeEmail(email);
    const parent = await findParentByEmail(normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = await findStudentByParentId(parent.id);

    if (!student) {
      return null;
    }

    const nextInterestTags = sanitizeInterestTagsForProgramme(
      input.programme,
      input.interestTags ?? [],
    );

    student.studentName = input.studentName.trim() || student.studentName;
    student.programme = input.programme;
    student.programmeYear = input.programmeYear;
    student.interestTags = nextInterestTags;

    if (input.goodnotesEmail !== undefined) {
      const nextGoodnotesEmail = input.goodnotesEmail.trim().toLowerCase();

      if (student.goodnotesEmail !== nextGoodnotesEmail) {
        student.goodnotesEmail = nextGoodnotesEmail;
        student.goodnotesConnected = false;
        student.goodnotesVerifiedAt = null;
        student.goodnotesLastTestSentAt = null;
        student.goodnotesLastDeliveryStatus = nextGoodnotesEmail ? "idle" : null;
        student.goodnotesLastDeliveryMessage = nextGoodnotesEmail
          ? "Goodnotes destination saved. Send a welcome note to confirm this destination."
          : null;
      }
    }

    const now = new Date().toISOString();
    const automaticMilestones = applyAutomaticGrowthMilestones({
      parent,
      student,
      now,
    });

    if (automaticMilestones.changed) {
      Object.assign(parent, automaticMilestones.parent);
    }

    student.updatedAt = now;
    parent.updatedAt = now;

    await db.collection("students").doc(student.id).set(student);
    await db.collection("parents").doc(parent.id).set(parent);

    return toProfile(parent, student);
  },

  async updateStudentGoodnotesDelivery(email, input: UpdateStudentGoodnotesInput) {
    const db = getFirebaseAdminDb();
    const normalizedEmail = normalizeEmail(email);
    const parent = await findParentByEmail(normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = await findStudentByParentId(parent.id);

    if (!student) {
      return null;
    }

    if (input.goodnotesEmail !== undefined) {
      student.goodnotesEmail = input.goodnotesEmail.trim().toLowerCase();
    }

    if (input.goodnotesConnected !== undefined) {
      student.goodnotesConnected = input.goodnotesConnected;
    }

    if (input.goodnotesVerifiedAt !== undefined) {
      student.goodnotesVerifiedAt =
        typeof input.goodnotesVerifiedAt === "string" &&
        input.goodnotesVerifiedAt.trim()
          ? input.goodnotesVerifiedAt
          : null;
    }

    if (input.goodnotesLastTestSentAt !== undefined) {
      student.goodnotesLastTestSentAt =
        typeof input.goodnotesLastTestSentAt === "string" &&
        input.goodnotesLastTestSentAt.trim()
          ? input.goodnotesLastTestSentAt
          : null;
    }

    if (input.goodnotesLastDeliveryStatus !== undefined) {
      student.goodnotesLastDeliveryStatus = input.goodnotesLastDeliveryStatus;
    }

    if (input.goodnotesLastDeliveryMessage !== undefined) {
      student.goodnotesLastDeliveryMessage =
        typeof input.goodnotesLastDeliveryMessage === "string" &&
        input.goodnotesLastDeliveryMessage.trim()
          ? input.goodnotesLastDeliveryMessage.trim()
          : null;
    }

    const now = new Date().toISOString();
    const automaticMilestones = applyAutomaticGrowthMilestones({
      parent,
      student,
      now,
    });

    if (automaticMilestones.changed) {
      Object.assign(parent, automaticMilestones.parent);
    }

    student.updatedAt = now;
    parent.updatedAt = now;

    await db.collection("students").doc(student.id).set(student);
    await db.collection("parents").doc(parent.id).set(parent);

    return toProfile(parent, student);
  },

  async updateParentSubscription(email, input) {
    const db = getFirebaseAdminDb();
    const normalizedEmail = normalizeEmail(email);
    const parent = await findParentByEmail(normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = await findStudentByParentId(parent.id);

    if (!student) {
      return null;
    }

    if (input.subscriptionPlan !== undefined) {
      parent.subscriptionPlan = input.subscriptionPlan as SubscriptionPlan;
    }

    if (input.subscriptionStatus !== undefined) {
      parent.subscriptionStatus = input.subscriptionStatus;
    }

    if (input.stripeCustomerId !== undefined) {
      parent.stripeCustomerId =
        typeof input.stripeCustomerId === "string" && input.stripeCustomerId.trim()
          ? input.stripeCustomerId.trim()
          : null;
    }

    if (input.stripeSubscriptionId !== undefined) {
      parent.stripeSubscriptionId =
        typeof input.stripeSubscriptionId === "string" &&
        input.stripeSubscriptionId.trim()
          ? input.stripeSubscriptionId.trim()
          : null;
    }

    if (input.trialStartedAt !== undefined) {
      parent.trialStartedAt = input.trialStartedAt;
    }

    if (input.trialEndsAt !== undefined) {
      parent.trialEndsAt = input.trialEndsAt;
    }

    if (input.subscriptionActivatedAt !== undefined) {
      parent.subscriptionActivatedAt =
        typeof input.subscriptionActivatedAt === "string" &&
        input.subscriptionActivatedAt.trim()
          ? input.subscriptionActivatedAt
          : null;
    }

    if (input.subscriptionRenewalAt !== undefined) {
      parent.subscriptionRenewalAt =
        typeof input.subscriptionRenewalAt === "string" &&
        input.subscriptionRenewalAt.trim()
          ? input.subscriptionRenewalAt
          : null;
    }

    if (input.latestInvoiceId !== undefined) {
      parent.latestInvoiceId =
        typeof input.latestInvoiceId === "string" && input.latestInvoiceId.trim()
          ? input.latestInvoiceId.trim()
          : null;
    }

    if (input.latestInvoiceNumber !== undefined) {
      parent.latestInvoiceNumber =
        typeof input.latestInvoiceNumber === "string" &&
        input.latestInvoiceNumber.trim()
          ? input.latestInvoiceNumber.trim()
          : null;
    }

    if (input.latestInvoiceStatus !== undefined) {
      parent.latestInvoiceStatus =
        typeof input.latestInvoiceStatus === "string" &&
        input.latestInvoiceStatus.trim()
          ? input.latestInvoiceStatus.trim()
          : null;
    }

    if (input.latestInvoiceHostedUrl !== undefined) {
      parent.latestInvoiceHostedUrl =
        typeof input.latestInvoiceHostedUrl === "string" &&
        input.latestInvoiceHostedUrl.trim()
          ? input.latestInvoiceHostedUrl.trim()
          : null;
    }

    if (input.latestInvoicePdfUrl !== undefined) {
      parent.latestInvoicePdfUrl =
        typeof input.latestInvoicePdfUrl === "string" &&
        input.latestInvoicePdfUrl.trim()
          ? input.latestInvoicePdfUrl.trim()
          : null;
    }

    if (input.latestInvoiceAmountPaid !== undefined) {
      parent.latestInvoiceAmountPaid =
        typeof input.latestInvoiceAmountPaid === "number" &&
        Number.isFinite(input.latestInvoiceAmountPaid)
          ? input.latestInvoiceAmountPaid
          : null;
    }

    if (input.latestInvoiceCurrency !== undefined) {
      parent.latestInvoiceCurrency =
        typeof input.latestInvoiceCurrency === "string" &&
        input.latestInvoiceCurrency.trim()
          ? input.latestInvoiceCurrency.trim().toLowerCase()
          : null;
    }

    if (input.latestInvoicePaidAt !== undefined) {
      parent.latestInvoicePaidAt =
        typeof input.latestInvoicePaidAt === "string" &&
        input.latestInvoicePaidAt.trim()
          ? input.latestInvoicePaidAt
          : null;
    }

    if (input.latestInvoicePeriodStart !== undefined) {
      parent.latestInvoicePeriodStart =
        typeof input.latestInvoicePeriodStart === "string" &&
        input.latestInvoicePeriodStart.trim()
          ? input.latestInvoicePeriodStart
          : null;
    }

    if (input.latestInvoicePeriodEnd !== undefined) {
      parent.latestInvoicePeriodEnd =
        typeof input.latestInvoicePeriodEnd === "string" &&
        input.latestInvoicePeriodEnd.trim()
          ? input.latestInvoicePeriodEnd
          : null;
    }

    const now = new Date().toISOString();
    const automaticMilestones = applyAutomaticGrowthMilestones({
      parent,
      student,
      now,
    });

    if (automaticMilestones.changed) {
      Object.assign(parent, automaticMilestones.parent);
    }

    parent.updatedAt = now;

    await db.collection("parents").doc(parent.id).set(parent);

    return toProfile(parent, student);
  },

  async updateParentNotionConnection(email, input: UpdateParentNotionInput) {
    const db = getFirebaseAdminDb();
    const normalizedEmail = normalizeEmail(email);
    const parent = await findParentByEmail(normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = await findStudentByParentId(parent.id);

    if (!student) {
      return null;
    }

    if (input.notionWorkspaceId !== undefined) {
      parent.notionWorkspaceId = normalizeNullableString(input.notionWorkspaceId);
    }

    if (input.notionWorkspaceName !== undefined) {
      parent.notionWorkspaceName = normalizeNullableString(input.notionWorkspaceName);
    }

    if (input.notionBotId !== undefined) {
      parent.notionBotId = normalizeNullableString(input.notionBotId);
    }

    if (input.notionDatabaseId !== undefined) {
      parent.notionDatabaseId = normalizeNullableString(input.notionDatabaseId);
    }

    if (input.notionDatabaseName !== undefined) {
      parent.notionDatabaseName = normalizeNullableString(input.notionDatabaseName);
    }

    if (input.notionDataSourceId !== undefined) {
      parent.notionDataSourceId = normalizeNullableString(input.notionDataSourceId);
    }

    if (input.notionAuthorizedAt !== undefined) {
      parent.notionAuthorizedAt = normalizeNullableString(input.notionAuthorizedAt);
    }

    if (input.notionLastSyncedAt !== undefined) {
      parent.notionLastSyncedAt = normalizeNullableString(input.notionLastSyncedAt);
    }

    if (input.notionLastSyncStatus !== undefined) {
      parent.notionLastSyncStatus =
        input.notionLastSyncStatus === "idle" ||
        input.notionLastSyncStatus === "success" ||
        input.notionLastSyncStatus === "failed"
          ? input.notionLastSyncStatus
          : null;
    }

    if (input.notionLastSyncMessage !== undefined) {
      parent.notionLastSyncMessage = normalizeNullableString(input.notionLastSyncMessage);
    }

    if (input.notionLastSyncPageId !== undefined) {
      parent.notionLastSyncPageId = normalizeNullableString(input.notionLastSyncPageId);
    }

    if (input.notionLastSyncPageUrl !== undefined) {
      parent.notionLastSyncPageUrl = normalizeNullableString(input.notionLastSyncPageUrl);
    }

    if (input.notionConnected !== undefined) {
      student.notionConnected = input.notionConnected === true;
    }

    const now = new Date().toISOString();

    const automaticMilestones = applyAutomaticGrowthMilestones({
      parent,
      student,
      now,
    });

    if (automaticMilestones.changed) {
      Object.assign(parent, automaticMilestones.parent);
    }

    parent.updatedAt = now;
    student.updatedAt = now;

    await db.collection("parents").doc(parent.id).set(parent);
    await db.collection("students").doc(student.id).set(student);

    return toProfile(parent, student);
  },

  async updateParentDeliveryPreferences(
    email,
    input: UpdateParentDeliveryPreferencesInput,
  ) {
    const db = getFirebaseAdminDb();
    const normalizedEmail = normalizeEmail(email);
    const parent = await findParentByEmail(normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = await findStudentByParentId(parent.id);

    if (!student) {
      return null;
    }

    const nextPreferences = resolveDeliveryPreferences(input);
    const now = new Date().toISOString();

    parent.countryCode = nextPreferences.countryCode;
    parent.deliveryTimeZone = nextPreferences.deliveryTimeZone;
    parent.preferredDeliveryLocalTime =
      nextPreferences.preferredDeliveryLocalTime;
    parent.updatedAt = now;
    student.updatedAt = now;

    await db.collection("parents").doc(parent.id).set(parent);
    await db.collection("students").doc(student.id).set(student);

    return toProfile(parent, student);
  },

  async updateParentGrowthMilestones(
    email,
    input: UpdateParentGrowthMilestonesInput,
  ) {
    const db = getFirebaseAdminDb();
    const normalizedEmail = normalizeEmail(email);
    const parent = await findParentByEmail(normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = await findStudentByParentId(parent.id);

    if (!student) {
      return null;
    }

    const explicitMilestones = applySetOnceGrowthMilestones(parent, input);

    if (explicitMilestones.changed) {
      Object.assign(parent, explicitMilestones.parent);
      parent.updatedAt = new Date().toISOString();
      await db.collection("parents").doc(parent.id).set(parent);
    }

    return toProfile(parent, student);
  },

  async updateParentAcquisitionSnapshot(email, input) {
    const db = getFirebaseAdminDb();
    const normalizedEmail = normalizeEmail(email);
    const parent = await findParentByEmail(normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = await findStudentByParentId(parent.id);

    if (!student) {
      return null;
    }

    if (input.acquisitionSource !== undefined) {
      parent.acquisitionSource = normalizeMarketingAttributionSource(
        input.acquisitionSource,
      );
    }

    if (input.acquisitionCapturedAt !== undefined) {
      parent.acquisitionCapturedAt =
        typeof input.acquisitionCapturedAt === "string" &&
        input.acquisitionCapturedAt.trim()
          ? input.acquisitionCapturedAt
          : null;
    }

    if (input.acquisitionLeadId !== undefined) {
      parent.acquisitionLeadId =
        typeof input.acquisitionLeadId === "string" && input.acquisitionLeadId.trim()
          ? input.acquisitionLeadId
          : null;
    }

    if (input.acquisitionReferralInviteId !== undefined) {
      parent.acquisitionReferralInviteId =
        typeof input.acquisitionReferralInviteId === "string" &&
        input.acquisitionReferralInviteId.trim()
          ? input.acquisitionReferralInviteId
          : null;
    }

    if (input.acquisitionPagePath !== undefined) {
      parent.acquisitionPagePath =
        typeof input.acquisitionPagePath === "string" &&
        input.acquisitionPagePath.trim()
          ? input.acquisitionPagePath
          : null;
    }

    if (input.acquisitionReferrerUrl !== undefined) {
      parent.acquisitionReferrerUrl =
        typeof input.acquisitionReferrerUrl === "string" &&
        input.acquisitionReferrerUrl.trim()
          ? input.acquisitionReferrerUrl
          : null;
    }

    if (input.acquisitionUtmSource !== undefined) {
      parent.acquisitionUtmSource =
        typeof input.acquisitionUtmSource === "string" &&
        input.acquisitionUtmSource.trim()
          ? input.acquisitionUtmSource
          : null;
    }

    if (input.acquisitionUtmMedium !== undefined) {
      parent.acquisitionUtmMedium =
        typeof input.acquisitionUtmMedium === "string" &&
        input.acquisitionUtmMedium.trim()
          ? input.acquisitionUtmMedium
          : null;
    }

    if (input.acquisitionUtmCampaign !== undefined) {
      parent.acquisitionUtmCampaign =
        typeof input.acquisitionUtmCampaign === "string" &&
        input.acquisitionUtmCampaign.trim()
          ? input.acquisitionUtmCampaign
          : null;
    }

    if (input.acquisitionUtmContent !== undefined) {
      parent.acquisitionUtmContent =
        typeof input.acquisitionUtmContent === "string" &&
        input.acquisitionUtmContent.trim()
          ? input.acquisitionUtmContent
          : null;
    }

    if (input.acquisitionUtmTerm !== undefined) {
      parent.acquisitionUtmTerm =
        typeof input.acquisitionUtmTerm === "string" &&
        input.acquisitionUtmTerm.trim()
          ? input.acquisitionUtmTerm
          : null;
    }

    parent.updatedAt = new Date().toISOString();
    await db.collection("parents").doc(parent.id).set(parent);

    return toProfile(parent, student);
  },

  async updateParentNotificationEmailState(
    email,
    input: UpdateParentNotificationEmailStateInput,
  ) {
    const db = getFirebaseAdminDb();
    const normalizedEmail = normalizeEmail(email);
    const parent = await findParentByEmail(normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = await findStudentByParentId(parent.id);

    if (!student) {
      return null;
    }

    if (input.trialEndingReminderLastNotifiedAt !== undefined) {
      parent.trialEndingReminderLastNotifiedAt =
        typeof input.trialEndingReminderLastNotifiedAt === "string" &&
        input.trialEndingReminderLastNotifiedAt.trim()
          ? input.trialEndingReminderLastNotifiedAt
          : null;
    }

    if (input.trialEndingReminderLastTrialEndsAt !== undefined) {
      parent.trialEndingReminderLastTrialEndsAt =
        typeof input.trialEndingReminderLastTrialEndsAt === "string" &&
        input.trialEndingReminderLastTrialEndsAt.trim()
          ? input.trialEndingReminderLastTrialEndsAt
          : null;
    }

    if (input.trialEndingReminderLastResolvedAt !== undefined) {
      parent.trialEndingReminderLastResolvedAt =
        typeof input.trialEndingReminderLastResolvedAt === "string" &&
        input.trialEndingReminderLastResolvedAt.trim()
          ? input.trialEndingReminderLastResolvedAt
          : null;
    }

    if (input.trialEndingReminderLastResolvedTrialEndsAt !== undefined) {
      parent.trialEndingReminderLastResolvedTrialEndsAt =
        typeof input.trialEndingReminderLastResolvedTrialEndsAt === "string" &&
        input.trialEndingReminderLastResolvedTrialEndsAt.trim()
          ? input.trialEndingReminderLastResolvedTrialEndsAt
          : null;
    }

    if (input.billingStatusNotificationLastSentAt !== undefined) {
      parent.billingStatusNotificationLastSentAt =
        typeof input.billingStatusNotificationLastSentAt === "string" &&
        input.billingStatusNotificationLastSentAt.trim()
          ? input.billingStatusNotificationLastSentAt
          : null;
    }

    if (input.billingStatusNotificationLastInvoiceId !== undefined) {
      parent.billingStatusNotificationLastInvoiceId =
        typeof input.billingStatusNotificationLastInvoiceId === "string" &&
        input.billingStatusNotificationLastInvoiceId.trim()
          ? input.billingStatusNotificationLastInvoiceId
          : null;
    }

    if (input.billingStatusNotificationLastInvoiceStatus !== undefined) {
      parent.billingStatusNotificationLastInvoiceStatus =
        typeof input.billingStatusNotificationLastInvoiceStatus === "string" &&
        input.billingStatusNotificationLastInvoiceStatus.trim()
          ? input.billingStatusNotificationLastInvoiceStatus
          : null;
    }

    if (input.billingStatusNotificationLastResolvedAt !== undefined) {
      parent.billingStatusNotificationLastResolvedAt =
        typeof input.billingStatusNotificationLastResolvedAt === "string" &&
        input.billingStatusNotificationLastResolvedAt.trim()
          ? input.billingStatusNotificationLastResolvedAt
          : null;
    }

    if (input.billingStatusNotificationLastResolvedInvoiceId !== undefined) {
      parent.billingStatusNotificationLastResolvedInvoiceId =
        typeof input.billingStatusNotificationLastResolvedInvoiceId === "string" &&
        input.billingStatusNotificationLastResolvedInvoiceId.trim()
          ? input.billingStatusNotificationLastResolvedInvoiceId
          : null;
    }

    if (input.billingStatusNotificationLastResolvedInvoiceStatus !== undefined) {
      parent.billingStatusNotificationLastResolvedInvoiceStatus =
        typeof input.billingStatusNotificationLastResolvedInvoiceStatus === "string" &&
        input.billingStatusNotificationLastResolvedInvoiceStatus.trim()
          ? input.billingStatusNotificationLastResolvedInvoiceStatus
          : null;
    }

    if (input.deliverySupportAlertLastNotifiedAt !== undefined) {
      parent.deliverySupportAlertLastNotifiedAt =
        typeof input.deliverySupportAlertLastNotifiedAt === "string" &&
        input.deliverySupportAlertLastNotifiedAt.trim()
          ? input.deliverySupportAlertLastNotifiedAt
          : null;
    }

    if (input.deliverySupportAlertLastReasonKey !== undefined) {
      parent.deliverySupportAlertLastReasonKey =
        typeof input.deliverySupportAlertLastReasonKey === "string" &&
        input.deliverySupportAlertLastReasonKey.trim()
          ? input.deliverySupportAlertLastReasonKey
          : null;
    }

    if (input.deliverySupportAlertLastResolvedAt !== undefined) {
      parent.deliverySupportAlertLastResolvedAt =
        typeof input.deliverySupportAlertLastResolvedAt === "string" &&
        input.deliverySupportAlertLastResolvedAt.trim()
          ? input.deliverySupportAlertLastResolvedAt
          : null;
    }

    if (input.deliverySupportAlertLastResolvedReasonKey !== undefined) {
      parent.deliverySupportAlertLastResolvedReasonKey =
        typeof input.deliverySupportAlertLastResolvedReasonKey === "string" &&
        input.deliverySupportAlertLastResolvedReasonKey.trim()
          ? input.deliverySupportAlertLastResolvedReasonKey
          : null;
    }

    if (input.trialConversionNurtureCount !== undefined) {
      parent.trialConversionNurtureCount =
        typeof input.trialConversionNurtureCount === "number" &&
        Number.isFinite(input.trialConversionNurtureCount) &&
        input.trialConversionNurtureCount >= 0
          ? input.trialConversionNurtureCount
          : 0;
    }

    if (input.trialConversionNurtureLastAttemptAt !== undefined) {
      parent.trialConversionNurtureLastAttemptAt =
        typeof input.trialConversionNurtureLastAttemptAt === "string" &&
        input.trialConversionNurtureLastAttemptAt.trim()
          ? input.trialConversionNurtureLastAttemptAt
          : null;
    }

    if (input.trialConversionNurtureLastSentAt !== undefined) {
      parent.trialConversionNurtureLastSentAt =
        typeof input.trialConversionNurtureLastSentAt === "string" &&
        input.trialConversionNurtureLastSentAt.trim()
          ? input.trialConversionNurtureLastSentAt
          : null;
    }

    if (input.trialConversionNurtureLastStage !== undefined) {
      parent.trialConversionNurtureLastStage =
        typeof input.trialConversionNurtureLastStage === "number" &&
        Number.isFinite(input.trialConversionNurtureLastStage) &&
        input.trialConversionNurtureLastStage > 0
          ? input.trialConversionNurtureLastStage
          : null;
    }

    if (input.trialConversionNurtureLastStatus !== undefined) {
      parent.trialConversionNurtureLastStatus =
        input.trialConversionNurtureLastStatus === "sent" ||
        input.trialConversionNurtureLastStatus === "failed"
          ? input.trialConversionNurtureLastStatus
          : null;
    }

    if (input.trialConversionNurtureLastMessageId !== undefined) {
      parent.trialConversionNurtureLastMessageId =
        typeof input.trialConversionNurtureLastMessageId === "string" &&
        input.trialConversionNurtureLastMessageId.trim()
          ? input.trialConversionNurtureLastMessageId
          : null;
    }

    if (input.trialConversionNurtureLastError !== undefined) {
      parent.trialConversionNurtureLastError =
        typeof input.trialConversionNurtureLastError === "string" &&
        input.trialConversionNurtureLastError.trim()
          ? input.trialConversionNurtureLastError
          : null;
    }

    parent.updatedAt = new Date().toISOString();
    await db.collection("parents").doc(parent.id).set(parent);

    return toProfile(parent, student);
  },

  async updateParentOnboardingReminder(
    email,
    input: UpdateParentOnboardingReminderInput,
  ) {
    const db = getFirebaseAdminDb();
    const normalizedEmail = normalizeEmail(email);
    const parent = await findParentByEmail(normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = await findStudentByParentId(parent.id);

    if (!student) {
      return null;
    }

    if (input.onboardingReminderCount !== undefined) {
      parent.onboardingReminderCount = Math.max(
        0,
        Number.isFinite(input.onboardingReminderCount)
          ? Math.trunc(input.onboardingReminderCount)
          : 0,
      );
    }

    if (input.onboardingReminderLastAttemptAt !== undefined) {
      parent.onboardingReminderLastAttemptAt =
        typeof input.onboardingReminderLastAttemptAt === "string" &&
        input.onboardingReminderLastAttemptAt.trim()
          ? input.onboardingReminderLastAttemptAt
          : null;
    }

    if (input.onboardingReminderLastSentAt !== undefined) {
      parent.onboardingReminderLastSentAt =
        typeof input.onboardingReminderLastSentAt === "string" &&
        input.onboardingReminderLastSentAt.trim()
          ? input.onboardingReminderLastSentAt
          : null;
    }

    if (input.onboardingReminderLastStage !== undefined) {
      parent.onboardingReminderLastStage =
        typeof input.onboardingReminderLastStage === "number" &&
        Number.isFinite(input.onboardingReminderLastStage) &&
        input.onboardingReminderLastStage > 0
          ? Math.trunc(input.onboardingReminderLastStage)
          : null;
    }

    if (input.onboardingReminderLastStatus !== undefined) {
      parent.onboardingReminderLastStatus = input.onboardingReminderLastStatus;
    }

    if (input.onboardingReminderLastMessageId !== undefined) {
      parent.onboardingReminderLastMessageId =
        typeof input.onboardingReminderLastMessageId === "string" &&
        input.onboardingReminderLastMessageId.trim()
          ? input.onboardingReminderLastMessageId.trim()
          : null;
    }

    if (input.onboardingReminderLastError !== undefined) {
      parent.onboardingReminderLastError =
        typeof input.onboardingReminderLastError === "string" &&
        input.onboardingReminderLastError.trim()
          ? input.onboardingReminderLastError.trim()
          : null;
    }

    parent.updatedAt = new Date().toISOString();

    await db.collection("parents").doc(parent.id).set(parent);

    return toProfile(parent, student);
  },
};

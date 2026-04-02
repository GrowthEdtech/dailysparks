import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  GoodnotesDeliveryStatus,
  MvpStoreData,
  NotionConnectionSecretRecord,
  ParentProfile,
  ParentRecord,
  Programme,
  StudentRecord,
  SubscriptionPlan,
  UpdateParentNotionInput,
  UpdateStudentGoodnotesInput,
} from "./mvp-types";
import {
  DEFAULT_PROGRAMME,
  getDefaultProgrammeYear,
  isProgramme,
  isSubscriptionPlan,
  isValidProgrammeYear,
} from "./mvp-types";
import type { ProfileStore } from "./profile-store";

function getStoreFilePath() {
  return (
    process.env.DAILY_SPARKS_STORE_PATH ??
    path.join(/* turbopackIgnore: true */ process.cwd(), "data", "mvp-store.json")
  );
}

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

function addDays(timestamp: string, days: number) {
  const date = new Date(timestamp);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function createEmptyStore(): MvpStoreData {
  return {
    parents: [],
    students: [],
    notionConnections: [],
  };
}

function normalizeParentRecord(raw: Record<string, unknown>): ParentRecord {
  const timestamp = new Date().toISOString();
  const subscriptionPlan =
    typeof raw.subscriptionPlan === "string" &&
    isSubscriptionPlan(raw.subscriptionPlan)
      ? raw.subscriptionPlan
      : null;
  const stripeCustomerId =
    typeof raw.stripeCustomerId === "string" && raw.stripeCustomerId.trim()
      ? raw.stripeCustomerId.trim()
      : null;
  const stripeSubscriptionId =
    typeof raw.stripeSubscriptionId === "string" && raw.stripeSubscriptionId.trim()
      ? raw.stripeSubscriptionId.trim()
      : null;
  const createdAt =
    typeof raw.createdAt === "string" && raw.createdAt
      ? raw.createdAt
      : timestamp;
  const trialStartedAt =
    typeof raw.trialStartedAt === "string" && raw.trialStartedAt
      ? raw.trialStartedAt
      : createdAt;
  const trialEndsAt =
    typeof raw.trialEndsAt === "string" && raw.trialEndsAt
      ? raw.trialEndsAt
      : addDays(trialStartedAt, 7);
  const subscriptionActivatedAt =
    typeof raw.subscriptionActivatedAt === "string" && raw.subscriptionActivatedAt
      ? raw.subscriptionActivatedAt
      : null;
  const subscriptionRenewalAt =
    typeof raw.subscriptionRenewalAt === "string" && raw.subscriptionRenewalAt
      ? raw.subscriptionRenewalAt
      : null;
  const latestInvoiceId = normalizeNullableString(raw.latestInvoiceId);
  const latestInvoiceNumber = normalizeNullableString(raw.latestInvoiceNumber);
  const latestInvoiceStatus = normalizeNullableString(raw.latestInvoiceStatus);
  const latestInvoiceHostedUrl = normalizeNullableString(raw.latestInvoiceHostedUrl);
  const latestInvoicePdfUrl = normalizeNullableString(raw.latestInvoicePdfUrl);
  const latestInvoiceAmountPaid = normalizeNullableNumber(raw.latestInvoiceAmountPaid);
  const latestInvoiceCurrency = normalizeNullableString(raw.latestInvoiceCurrency);
  const latestInvoicePaidAt = normalizeNullableString(raw.latestInvoicePaidAt);
  const latestInvoicePeriodStart = normalizeNullableString(raw.latestInvoicePeriodStart);
  const latestInvoicePeriodEnd = normalizeNullableString(raw.latestInvoicePeriodEnd);
  const notionWorkspaceId = normalizeNullableString(raw.notionWorkspaceId);
  const notionWorkspaceName = normalizeNullableString(raw.notionWorkspaceName);
  const notionBotId = normalizeNullableString(raw.notionBotId);
  const notionDatabaseId = normalizeNullableString(raw.notionDatabaseId);
  const notionDatabaseName = normalizeNullableString(raw.notionDatabaseName);
  const notionDataSourceId = normalizeNullableString(raw.notionDataSourceId);
  const notionAuthorizedAt = normalizeNullableString(raw.notionAuthorizedAt);
  const notionLastSyncedAt = normalizeNullableString(raw.notionLastSyncedAt);
  const notionLastSyncStatus =
    raw.notionLastSyncStatus === "idle" ||
    raw.notionLastSyncStatus === "success" ||
    raw.notionLastSyncStatus === "failed"
      ? raw.notionLastSyncStatus
      : null;
  const notionLastSyncMessage = normalizeNullableString(raw.notionLastSyncMessage);
  const notionLastSyncPageId = normalizeNullableString(raw.notionLastSyncPageId);
  const notionLastSyncPageUrl = normalizeNullableString(raw.notionLastSyncPageUrl);

  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    email: normalizeEmail(typeof raw.email === "string" ? raw.email : ""),
    fullName:
      typeof raw.fullName === "string" && raw.fullName.trim()
        ? raw.fullName.trim()
        : "Daily Sparks Parent",
    subscriptionStatus:
      raw.subscriptionStatus === "free" ||
      raw.subscriptionStatus === "trial" ||
      raw.subscriptionStatus === "active" ||
      raw.subscriptionStatus === "canceled"
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
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : timestamp,
  };
}

function normalizeNotionConnectionRecord(
  raw: Record<string, unknown>,
): NotionConnectionSecretRecord | null {
  const timestamp = new Date().toISOString();
  const parentId =
    typeof raw.parentId === "string" && raw.parentId.trim() ? raw.parentId.trim() : "";
  const accessTokenCiphertext =
    typeof raw.accessTokenCiphertext === "string" && raw.accessTokenCiphertext.trim()
      ? raw.accessTokenCiphertext.trim()
      : "";
  const workspaceId =
    typeof raw.workspaceId === "string" && raw.workspaceId.trim()
      ? raw.workspaceId.trim()
      : "";
  const botId =
    typeof raw.botId === "string" && raw.botId.trim() ? raw.botId.trim() : "";

  if (!parentId || !accessTokenCiphertext || !workspaceId || !botId) {
    return null;
  }

  return {
    parentId,
    accessTokenCiphertext,
    refreshTokenCiphertext: normalizeNullableString(raw.refreshTokenCiphertext),
    workspaceId,
    botId,
    expiresAt: normalizeNullableString(raw.expiresAt),
    createdAt:
      typeof raw.createdAt === "string" && raw.createdAt.trim()
        ? raw.createdAt
        : timestamp,
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt.trim()
        ? raw.updatedAt
        : timestamp,
  };
}

function inferProgramme(raw: Record<string, unknown>): Programme {
  if (typeof raw.programme === "string" && isProgramme(raw.programme)) {
    return raw.programme;
  }

  const curriculumLevel =
    typeof raw.curriculumLevel === "string"
      ? raw.curriculumLevel.toUpperCase()
      : DEFAULT_PROGRAMME;

  if (curriculumLevel.includes("DP")) {
    return "DP";
  }

  if (curriculumLevel.includes("MYP")) {
    return "MYP";
  }

  return DEFAULT_PROGRAMME;
}

function inferProgrammeYear(programme: Programme, rawProgrammeYear: unknown) {
  const parsedYear =
    typeof rawProgrammeYear === "number"
      ? rawProgrammeYear
      : typeof rawProgrammeYear === "string"
        ? Number.parseInt(rawProgrammeYear, 10)
        : Number.NaN;

  if (Number.isInteger(parsedYear) && isValidProgrammeYear(programme, parsedYear)) {
    return parsedYear;
  }

  return getDefaultProgrammeYear(programme);
}

function normalizeStudentRecord(raw: Record<string, unknown>): StudentRecord {
  const timestamp = new Date().toISOString();
  const programme = inferProgramme(raw);

  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    parentId: typeof raw.parentId === "string" ? raw.parentId : "",
    studentName:
      typeof raw.studentName === "string" && raw.studentName.trim()
        ? raw.studentName.trim()
        : "Student",
    programme,
    programmeYear: inferProgrammeYear(programme, raw.programmeYear),
    goodnotesEmail:
      typeof raw.goodnotesEmail === "string" ? raw.goodnotesEmail.trim() : "",
    goodnotesConnected: raw.goodnotesConnected === true,
    goodnotesVerifiedAt: normalizeNullableString(raw.goodnotesVerifiedAt),
    goodnotesLastTestSentAt: normalizeNullableString(raw.goodnotesLastTestSentAt),
    goodnotesLastDeliveryStatus: normalizeGoodnotesStatus(
      raw.goodnotesLastDeliveryStatus,
    ),
    goodnotesLastDeliveryMessage: normalizeNullableString(
      raw.goodnotesLastDeliveryMessage,
    ),
    notionConnected: raw.notionConnected === true,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : timestamp,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : timestamp,
  };
}

function normalizeStore(store: unknown) {
  const rawStore =
    typeof store === "object" && store !== null ? (store as Record<string, unknown>) : {};

  const parents = Array.isArray(rawStore.parents)
    ? rawStore.parents.map((parent) =>
        normalizeParentRecord((parent ?? {}) as Record<string, unknown>),
      )
    : [];

  const students = Array.isArray(rawStore.students)
    ? rawStore.students.map((student) =>
        normalizeStudentRecord((student ?? {}) as Record<string, unknown>),
      )
    : [];
  const notionConnections = Array.isArray(rawStore.notionConnections)
    ? rawStore.notionConnections
        .map((record) =>
          normalizeNotionConnectionRecord((record ?? {}) as Record<string, unknown>),
        )
        .filter((record): record is NotionConnectionSecretRecord => record !== null)
    : [];

  const normalizedStore: MvpStoreData = { parents, students, notionConnections };

  return {
    store: normalizedStore,
    didChange: JSON.stringify(store) !== JSON.stringify(normalizedStore),
  };
}

async function readStore(): Promise<MvpStoreData> {
  const filePath = getStoreFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as unknown;
    const normalized = normalizeStore(parsed);

    if (normalized.didChange) {
      await writeStore(normalized.store);
    }

    return normalized.store;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyStore();
    }

    throw error;
  }
}

async function writeStore(store: MvpStoreData) {
  const filePath = getStoreFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

function findStudentForParent(store: MvpStoreData, parentId: string) {
  return store.students.find((student) => student.parentId === parentId) ?? null;
}

function createParentRecord(email: string, fullName: string): ParentRecord {
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    email,
    fullName,
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
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    parentId,
    studentName,
    programme: DEFAULT_PROGRAMME,
    programmeYear: getDefaultProgrammeYear(DEFAULT_PROGRAMME),
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

function toProfile(parent: ParentRecord, student: StudentRecord): ParentProfile {
  return {
    parent,
    student,
  };
}

function isEligibleForAutomatedDelivery(profile: ParentProfile) {
  const hasActiveSubscription =
    profile.parent.subscriptionStatus === "trial" ||
    profile.parent.subscriptionStatus === "active";
  const hasReadyDeliveryChannel =
    profile.student.goodnotesConnected || profile.student.notionConnected;

  return hasActiveSubscription && hasReadyDeliveryChannel;
}

export const localProfileStore: ProfileStore = {
  async getProfileByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    const store = await readStore();
    const parent = store.parents.find((record) => record.email === normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = findStudentForParent(store, parent.id);

    if (!student) {
      return null;
    }

    return toProfile(parent, student);
  },

  async listEligibleDeliveryProfiles() {
    const store = await readStore();

    return store.parents
      .map((parent) => {
        const student = findStudentForParent(store, parent.id);

        if (!student) {
          return null;
        }

        return toProfile(parent, student);
      })
      .filter((profile): profile is ParentProfile => Boolean(profile))
      .filter((profile) => isEligibleForAutomatedDelivery(profile))
      .sort((left, right) =>
        left.parent.email.localeCompare(right.parent.email),
      );
  },

  async getOrCreateParentProfile(input) {
    const normalizedEmail = normalizeEmail(input.email);
    const store = await readStore();
    const existingParent = store.parents.find(
      (record) => record.email === normalizedEmail,
    );

    if (existingParent) {
      const maybeStudent = findStudentForParent(store, existingParent.id);
      const nextFullName = input.fullName?.trim() ?? existingParent.fullName;

      if (nextFullName !== existingParent.fullName) {
        existingParent.fullName = nextFullName;
        existingParent.updatedAt = new Date().toISOString();
        await writeStore(store);
      }

      if (maybeStudent) {
        return toProfile(existingParent, maybeStudent);
      }

      const createdStudent = createStudentRecord(
        existingParent.id,
        input.studentName?.trim() || "Student",
      );

      store.students.push(createdStudent);
      await writeStore(store);

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

    store.parents.push(createdParent);
    store.students.push(createdStudent);

    await writeStore(store);

    return toProfile(createdParent, createdStudent);
  },

  async updateStudentPreferences(email, input) {
    const normalizedEmail = normalizeEmail(email);
    const store = await readStore();
    const parent = store.parents.find((record) => record.email === normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = findStudentForParent(store, parent.id);

    if (!student) {
      return null;
    }

    const nextGoodnotesEmail = input.goodnotesEmail.trim().toLowerCase();

    student.studentName = input.studentName.trim() || student.studentName;
    student.programme = input.programme;
    student.programmeYear = input.programmeYear;

    if (student.goodnotesEmail !== nextGoodnotesEmail) {
      student.goodnotesEmail = nextGoodnotesEmail;
      student.goodnotesConnected = false;
      student.goodnotesVerifiedAt = null;
      student.goodnotesLastTestSentAt = null;
      student.goodnotesLastDeliveryStatus = nextGoodnotesEmail ? "idle" : null;
      student.goodnotesLastDeliveryMessage = nextGoodnotesEmail
        ? "Goodnotes destination saved. Send a test brief to confirm this destination."
        : null;
    }

    student.updatedAt = new Date().toISOString();
    parent.updatedAt = student.updatedAt;

    await writeStore(store);

    return toProfile(parent, student);
  },

  async updateStudentGoodnotesDelivery(email, input: UpdateStudentGoodnotesInput) {
    const normalizedEmail = normalizeEmail(email);
    const store = await readStore();
    const parent = store.parents.find((record) => record.email === normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = findStudentForParent(store, parent.id);

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

    student.updatedAt = new Date().toISOString();
    parent.updatedAt = student.updatedAt;

    await writeStore(store);

    return toProfile(parent, student);
  },

  async updateParentSubscription(email, input) {
    const normalizedEmail = normalizeEmail(email);
    const store = await readStore();
    const parent = store.parents.find((record) => record.email === normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = findStudentForParent(store, parent.id);

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

    parent.updatedAt = new Date().toISOString();

    await writeStore(store);

    return toProfile(parent, student);
  },

  async updateParentNotionConnection(email, input: UpdateParentNotionInput) {
    const normalizedEmail = normalizeEmail(email);
    const store = await readStore();
    const parent = store.parents.find((record) => record.email === normalizedEmail);

    if (!parent) {
      return null;
    }

    const student = findStudentForParent(store, parent.id);

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
    parent.updatedAt = now;
    student.updatedAt = now;

    await writeStore(store);

    return toProfile(parent, student);
  },
};

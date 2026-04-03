import type {
  GoodnotesDeliveryStatus,
  ParentProfile,
  ParentRecord,
  StudentRecord,
  SubscriptionPlan,
  UpdateParentNotionInput,
  UpdateStudentGoodnotesInput,
} from "./mvp-types";
import {
  DEFAULT_PROGRAMME,
  getDefaultProgrammeYear,
  isSubscriptionPlan,
} from "./mvp-types";
import { getFirebaseAdminDb } from "./firebase-admin";
import type { ProfileStore } from "./profile-store";

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

  return {
    id,
    email: normalizeEmail(raw?.email ?? ""),
    fullName: raw?.fullName?.trim() || "Daily Sparks Parent",
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

  return {
    id,
    parentId: raw?.parentId || "",
    studentName: raw?.studentName?.trim() || "Student",
    programme: raw?.programme || DEFAULT_PROGRAMME,
    programmeYear: raw?.programmeYear || getDefaultProgrammeYear(DEFAULT_PROGRAMME),
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
  const hasActiveSubscription =
    profile.parent.subscriptionStatus === "trial" ||
    profile.parent.subscriptionStatus === "active";
  const hasReadyDeliveryChannel =
    profile.student.goodnotesConnected || profile.student.notionConnected;

  return hasActiveSubscription && hasReadyDeliveryChannel;
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
  const db = getFirebaseAdminDb();
  const timestamp = new Date().toISOString();

  return {
    id: db.collection("students").doc().id,
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

  async getOrCreateParentProfile(input) {
    const db = getFirebaseAdminDb();
    const normalizedEmail = normalizeEmail(input.email);
    const existingParent = await findParentByEmail(normalizedEmail);

    if (existingParent) {
      const maybeStudent = await findStudentByParentId(existingParent.id);
      const nextFullName = input.fullName?.trim() ?? existingParent.fullName;

      if (nextFullName !== existingParent.fullName) {
        existingParent.fullName = nextFullName;
        existingParent.updatedAt = new Date().toISOString();

        await db.collection("parents").doc(existingParent.id).set(existingParent);
      }

      if (maybeStudent) {
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

    await db.collection("parents").doc(createdParent.id).set(createdParent);
    await db.collection("students").doc(createdStudent.id).set(createdStudent);

    return toProfile(createdParent, createdStudent);
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
        ? "Goodnotes destination saved. Send a welcome note to confirm this destination."
        : null;
    }

    student.updatedAt = new Date().toISOString();
    parent.updatedAt = student.updatedAt;

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

    student.updatedAt = new Date().toISOString();
    parent.updatedAt = student.updatedAt;

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

    parent.updatedAt = new Date().toISOString();

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
    parent.updatedAt = now;
    student.updatedAt = now;

    await db.collection("parents").doc(parent.id).set(parent);
    await db.collection("students").doc(student.id).set(student);

    return toProfile(parent, student);
  },
};

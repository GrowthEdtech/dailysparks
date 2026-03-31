import type {
  ParentProfile,
  ParentRecord,
  StudentRecord,
  SubscriptionPlan,
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

    student.studentName = input.studentName.trim() || student.studentName;
    student.programme = input.programme;
    student.programmeYear = input.programmeYear;
    student.goodnotesEmail = input.goodnotesEmail.trim();
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

    parent.updatedAt = new Date().toISOString();

    await db.collection("parents").doc(parent.id).set(parent);

    return toProfile(parent, student);
  },
};

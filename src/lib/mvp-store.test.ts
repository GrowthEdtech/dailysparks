import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  getOrCreateParentProfile,
  getProfileByEmail,
  updateParentSubscription,
  updateStudentPreferences,
} from "./mvp-store";

let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-store-"));
  process.env.DAILY_SPARKS_STORE_PATH = path.join(tempDirectory, "mvp-store.json");
});

afterEach(async () => {
  delete process.env.DAILY_SPARKS_STORE_PATH;

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("mvp store", () => {
  test("creates a parent profile and default student on first login", async () => {
    const profile = await getOrCreateParentProfile({
      email: " Parent@Example.com ",
      fullName: "Parent Example",
      studentName: "Katherine",
    });

    expect(profile.parent.email).toBe("parent@example.com");
    expect(profile.parent.fullName).toBe("Parent Example");
    expect(profile.parent.subscriptionPlan).toBeNull();
    expect(profile.student.studentName).toBe("Katherine");
    expect(profile.student.programme).toBe("PYP");
    expect(profile.student.programmeYear).toBe(5);
    expect(profile.student.parentId).toBe(profile.parent.id);
  });

  test("returns the saved profile by email", async () => {
    await getOrCreateParentProfile({
      email: "parent@example.com",
      fullName: "Parent Example",
      studentName: "Katherine",
    });

    const profile = await getProfileByEmail("PARENT@example.com");

    expect(profile?.parent.email).toBe("parent@example.com");
    expect(profile?.student.studentName).toBe("Katherine");
    expect(profile?.student.programme).toBe("PYP");
    expect(profile?.student.programmeYear).toBe(5);
  });

  test("updates student preferences and persists them", async () => {
    await getOrCreateParentProfile({
      email: "parent@example.com",
      fullName: "Parent Example",
      studentName: "Katherine",
    });

    const updated = await updateStudentPreferences("parent@example.com", {
      studentName: "Katherine Sparks",
      goodnotesEmail: "katherine@goodnotes.email",
      programme: "MYP",
      programmeYear: 3,
    });

    expect(updated?.student.studentName).toBe("Katherine Sparks");
    expect(updated?.student.goodnotesEmail).toBe("katherine@goodnotes.email");
    expect(updated?.student.programme).toBe("MYP");
    expect(updated?.student.programmeYear).toBe(3);

    const reloaded = await getProfileByEmail("parent@example.com");

    expect(reloaded?.student.studentName).toBe("Katherine Sparks");
    expect(reloaded?.student.goodnotesEmail).toBe("katherine@goodnotes.email");
    expect(reloaded?.student.programme).toBe("MYP");
    expect(reloaded?.student.programmeYear).toBe(3);
  });

  test("updates parent billing selection and persists it", async () => {
    await getOrCreateParentProfile({
      email: "parent@example.com",
      fullName: "Parent Example",
      studentName: "Katherine",
    });

    const updated = await updateParentSubscription("parent@example.com", {
      subscriptionPlan: "yearly",
      subscriptionStatus: "active",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
    });

    expect(updated?.parent.subscriptionPlan).toBe("yearly");
    expect(updated?.parent.subscriptionStatus).toBe("active");
    expect(updated?.parent.stripeCustomerId).toBe("cus_123");
    expect(updated?.parent.stripeSubscriptionId).toBe("sub_123");

    const reloaded = await getProfileByEmail("parent@example.com");

    expect(reloaded?.parent.subscriptionPlan).toBe("yearly");
    expect(reloaded?.parent.subscriptionStatus).toBe("active");
    expect(reloaded?.parent.stripeCustomerId).toBe("cus_123");
    expect(reloaded?.parent.stripeSubscriptionId).toBe("sub_123");
  });

  test("normalizes legacy student records without programme fields", async () => {
    const storePath = process.env.DAILY_SPARKS_STORE_PATH as string;

    await writeFile(
      storePath,
      JSON.stringify({
        parents: [
          {
            id: "parent-1",
            email: "parent@example.com",
            fullName: "Parent Example",
            subscriptionStatus: "trial",
            createdAt: "2026-03-30T00:00:00.000Z",
            updatedAt: "2026-03-30T00:00:00.000Z",
          },
        ],
        students: [
          {
            id: "student-1",
            parentId: "parent-1",
            studentName: "Katherine",
            curriculumLevel: "PYP",
            ibSubjects: ["Sciences"],
            goodnotesEmail: "",
            notionConnected: false,
            createdAt: "2026-03-30T00:00:00.000Z",
            updatedAt: "2026-03-30T00:00:00.000Z",
          },
        ],
      }),
    );

    const profile = await getProfileByEmail("parent@example.com");

    expect(profile?.student.programme).toBe("PYP");
    expect(profile?.student.programmeYear).toBe(5);

    const persisted = JSON.parse(await readFile(storePath, "utf8")) as {
      students: Array<{ programme?: string; programmeYear?: number }>;
    };

    expect(persisted.students[0]?.programme).toBe("PYP");
    expect(persisted.students[0]?.programmeYear).toBe(5);
  });
});

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  getOrCreateParentProfile,
  getProfileByParentId,
  getProfileByEmail,
  listParentProfiles,
  listEligibleDeliveryProfiles,
  updateParentSubscription,
  updateStudentGoodnotesDelivery,
  updateParentNotionConnection,
  updateStudentPreferences,
} from "./mvp-store";
import { getBillingSummary } from "./billing";

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
    expect(profile.parent.trialStartedAt).toBeTruthy();
    expect(profile.parent.trialEndsAt).toBeTruthy();
    expect(profile.parent.subscriptionActivatedAt).toBeNull();
    expect(profile.parent.subscriptionRenewalAt).toBeNull();
    expect(profile.parent.latestInvoiceId).toBeNull();
    expect(profile.parent.latestInvoiceHostedUrl).toBeNull();
    expect(profile.student.studentName).toBe("Katherine");
    expect(profile.student.programme).toBe("PYP");
    expect(profile.student.programmeYear).toBe(5);
    expect(profile.student.parentId).toBe(profile.parent.id);
    expect(profile.student.goodnotesConnected).toBe(false);
    expect(profile.student.goodnotesVerifiedAt).toBeNull();
    expect(profile.student.goodnotesLastTestSentAt).toBeNull();
    expect(profile.student.goodnotesLastDeliveryStatus).toBeNull();
    expect(profile.student.goodnotesLastDeliveryMessage).toBeNull();
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
    expect(updated?.student.goodnotesConnected).toBe(false);
    expect(updated?.student.goodnotesVerifiedAt).toBeNull();
    expect(updated?.student.goodnotesLastTestSentAt).toBeNull();
    expect(updated?.student.goodnotesLastDeliveryStatus).toBe("idle");
    expect(updated?.student.goodnotesLastDeliveryMessage).toMatch(/saved/i);
    expect(updated?.student.programme).toBe("MYP");
    expect(updated?.student.programmeYear).toBe(3);

    const reloaded = await getProfileByEmail("parent@example.com");

    expect(reloaded?.student.studentName).toBe("Katherine Sparks");
    expect(reloaded?.student.goodnotesEmail).toBe("katherine@goodnotes.email");
    expect(reloaded?.student.goodnotesConnected).toBe(false);
    expect(reloaded?.student.goodnotesVerifiedAt).toBeNull();
    expect(reloaded?.student.goodnotesLastTestSentAt).toBeNull();
    expect(reloaded?.student.goodnotesLastDeliveryStatus).toBe("idle");
    expect(reloaded?.student.goodnotesLastDeliveryMessage).toMatch(/saved/i);
    expect(reloaded?.student.programme).toBe("MYP");
    expect(reloaded?.student.programmeYear).toBe(3);
  });

  test("updates Goodnotes delivery status and resets it when the destination changes", async () => {
    await getOrCreateParentProfile({
      email: "parent@example.com",
      fullName: "Parent Example",
      studentName: "Katherine",
    });

    await updateStudentPreferences("parent@example.com", {
      studentName: "Katherine",
      goodnotesEmail: "katherine@goodnotes.email",
      programme: "PYP",
      programmeYear: 5,
    });

    const connected = await updateStudentGoodnotesDelivery("parent@example.com", {
      goodnotesConnected: true,
      goodnotesVerifiedAt: "2026-04-01T00:00:00.000Z",
      goodnotesLastTestSentAt: "2026-04-01T00:05:00.000Z",
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Goodnotes delivery is ready.",
    });

    expect(connected?.student.goodnotesConnected).toBe(true);
    expect(connected?.student.goodnotesVerifiedAt).toBe("2026-04-01T00:00:00.000Z");
    expect(connected?.student.goodnotesLastTestSentAt).toBe(
      "2026-04-01T00:05:00.000Z",
    );
    expect(connected?.student.goodnotesLastDeliveryStatus).toBe("success");
    expect(connected?.student.goodnotesLastDeliveryMessage).toBe(
      "Goodnotes delivery is ready.",
    );

    const reset = await updateStudentPreferences("parent@example.com", {
      studentName: "Katherine",
      goodnotesEmail: "katherine-updated@goodnotes.email",
      programme: "PYP",
      programmeYear: 5,
    });

    expect(reset?.student.goodnotesEmail).toBe("katherine-updated@goodnotes.email");
    expect(reset?.student.goodnotesConnected).toBe(false);
    expect(reset?.student.goodnotesVerifiedAt).toBeNull();
    expect(reset?.student.goodnotesLastTestSentAt).toBeNull();
    expect(reset?.student.goodnotesLastDeliveryStatus).toBe("idle");
    expect(reset?.student.goodnotesLastDeliveryMessage).toMatch(/saved/i);
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
      subscriptionActivatedAt: "2026-03-31T00:00:00.000Z",
      subscriptionRenewalAt: "2026-04-30T00:00:00.000Z",
      latestInvoiceId: "in_123",
      latestInvoiceNumber: "DS-2026-0001",
      latestInvoiceStatus: "paid",
      latestInvoiceHostedUrl: "https://invoice.stripe.com/i/in_123",
      latestInvoicePdfUrl: "https://pay.stripe.com/invoice/in_123/pdf",
      latestInvoiceAmountPaid: 29999,
      latestInvoiceCurrency: "hkd",
      latestInvoicePaidAt: "2026-03-31T00:01:00.000Z",
      latestInvoicePeriodStart: "2026-03-31T00:00:00.000Z",
      latestInvoicePeriodEnd: "2026-04-30T00:00:00.000Z",
    });

    expect(updated?.parent.subscriptionPlan).toBe("yearly");
    expect(updated?.parent.subscriptionStatus).toBe("active");
    expect(updated?.parent.stripeCustomerId).toBe("cus_123");
    expect(updated?.parent.stripeSubscriptionId).toBe("sub_123");
    expect(updated?.parent.subscriptionActivatedAt).toBe(
      "2026-03-31T00:00:00.000Z",
    );
    expect(updated?.parent.subscriptionRenewalAt).toBe(
      "2026-04-30T00:00:00.000Z",
    );
    expect(updated?.parent.latestInvoiceId).toBe("in_123");
    expect(updated?.parent.latestInvoiceNumber).toBe("DS-2026-0001");
    expect(updated?.parent.latestInvoiceStatus).toBe("paid");
    expect(updated?.parent.latestInvoiceHostedUrl).toBe(
      "https://invoice.stripe.com/i/in_123",
    );
    expect(updated?.parent.latestInvoicePdfUrl).toBe(
      "https://pay.stripe.com/invoice/in_123/pdf",
    );
    expect(updated?.parent.latestInvoiceAmountPaid).toBe(29999);
    expect(updated?.parent.latestInvoiceCurrency).toBe("hkd");
    expect(updated?.parent.latestInvoicePaidAt).toBe(
      "2026-03-31T00:01:00.000Z",
    );
    expect(updated?.parent.latestInvoicePeriodStart).toBe(
      "2026-03-31T00:00:00.000Z",
    );
    expect(updated?.parent.latestInvoicePeriodEnd).toBe(
      "2026-04-30T00:00:00.000Z",
    );

    const reloaded = await getProfileByEmail("parent@example.com");

    expect(reloaded?.parent.subscriptionPlan).toBe("yearly");
    expect(reloaded?.parent.subscriptionStatus).toBe("active");
    expect(reloaded?.parent.stripeCustomerId).toBe("cus_123");
    expect(reloaded?.parent.stripeSubscriptionId).toBe("sub_123");
    expect(reloaded?.parent.subscriptionActivatedAt).toBe(
      "2026-03-31T00:00:00.000Z",
    );
    expect(reloaded?.parent.subscriptionRenewalAt).toBe(
      "2026-04-30T00:00:00.000Z",
    );
    expect(reloaded?.parent.latestInvoiceId).toBe("in_123");
    expect(reloaded?.parent.latestInvoiceNumber).toBe("DS-2026-0001");
    expect(reloaded?.parent.latestInvoiceStatus).toBe("paid");
    expect(reloaded?.parent.latestInvoiceHostedUrl).toBe(
      "https://invoice.stripe.com/i/in_123",
    );
    expect(reloaded?.parent.latestInvoicePdfUrl).toBe(
      "https://pay.stripe.com/invoice/in_123/pdf",
    );
    expect(reloaded?.parent.latestInvoiceAmountPaid).toBe(29999);
    expect(reloaded?.parent.latestInvoiceCurrency).toBe("hkd");
    expect(reloaded?.parent.latestInvoicePaidAt).toBe(
      "2026-03-31T00:01:00.000Z",
    );
    expect(reloaded?.parent.latestInvoicePeriodStart).toBe(
      "2026-03-31T00:00:00.000Z",
    );
    expect(reloaded?.parent.latestInvoicePeriodEnd).toBe(
      "2026-04-30T00:00:00.000Z",
    );
  });

  test("lists only subscribed profiles with at least one ready delivery channel", async () => {
    await getOrCreateParentProfile({
      email: "goodnotes@example.com",
      fullName: "Goodnotes Parent",
      studentName: "Ava",
    });
    await updateStudentPreferences("goodnotes@example.com", {
      studentName: "Ava",
      goodnotesEmail: "ava@goodnotes.email",
      programme: "PYP",
      programmeYear: 5,
    });
    await updateStudentGoodnotesDelivery("goodnotes@example.com", {
      goodnotesConnected: true,
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Ready.",
    });

    await getOrCreateParentProfile({
      email: "notion@example.com",
      fullName: "Notion Parent",
      studentName: "Milo",
    });
    await updateStudentPreferences("notion@example.com", {
      studentName: "Milo",
      goodnotesEmail: "",
      programme: "MYP",
      programmeYear: 3,
    });
    await updateParentSubscription("notion@example.com", {
      subscriptionStatus: "active",
    });
    await updateParentNotionConnection("notion@example.com", {
      notionConnected: true,
      notionDatabaseId: "db-123",
      notionDatabaseName: "Daily Sparks",
    });

    await getOrCreateParentProfile({
      email: "no-delivery@example.com",
      fullName: "No Delivery Parent",
      studentName: "Kai",
    });
    await updateParentSubscription("no-delivery@example.com", {
      subscriptionStatus: "active",
    });

    await getOrCreateParentProfile({
      email: "canceled@example.com",
      fullName: "Canceled Parent",
      studentName: "June",
    });
    await updateStudentPreferences("canceled@example.com", {
      studentName: "June",
      goodnotesEmail: "june@goodnotes.email",
      programme: "DP",
      programmeYear: 1,
    });
    await updateStudentGoodnotesDelivery("canceled@example.com", {
      goodnotesConnected: true,
      goodnotesLastDeliveryStatus: "success",
      goodnotesLastDeliveryMessage: "Ready.",
    });
    await updateParentSubscription("canceled@example.com", {
      subscriptionStatus: "canceled",
    });

    const eligibleProfiles = await listEligibleDeliveryProfiles();

    expect(eligibleProfiles.map((profile) => profile.parent.email)).toEqual([
      "goodnotes@example.com",
      "notion@example.com",
    ]);
    expect(eligibleProfiles.map((profile) => profile.student.programme)).toEqual([
      "PYP",
      "MYP",
    ]);
  });

  test("lists all parent profiles sorted by newest registration first", async () => {
    const storePath = process.env.DAILY_SPARKS_STORE_PATH as string;

    await writeFile(
      storePath,
      JSON.stringify({
        parents: [
          {
            id: "parent-older",
            email: "older@example.com",
            fullName: "Older Parent",
            subscriptionStatus: "trial",
            subscriptionPlan: null,
            createdAt: "2026-03-30T00:00:00.000Z",
            updatedAt: "2026-03-30T00:00:00.000Z",
          },
          {
            id: "parent-newer",
            email: "newer@example.com",
            fullName: "Newer Parent",
            subscriptionStatus: "active",
            subscriptionPlan: "yearly",
            createdAt: "2026-04-02T00:00:00.000Z",
            updatedAt: "2026-04-02T00:00:00.000Z",
          },
        ],
        students: [
          {
            id: "student-older",
            parentId: "parent-older",
            studentName: "Ava",
            programme: "PYP",
            programmeYear: 5,
            goodnotesEmail: "",
            notionConnected: false,
            goodnotesConnected: false,
            createdAt: "2026-03-30T00:00:00.000Z",
            updatedAt: "2026-03-30T00:00:00.000Z",
          },
          {
            id: "student-newer",
            parentId: "parent-newer",
            studentName: "Milo",
            programme: "MYP",
            programmeYear: 3,
            goodnotesEmail: "",
            notionConnected: true,
            goodnotesConnected: false,
            createdAt: "2026-04-02T00:00:00.000Z",
            updatedAt: "2026-04-02T00:00:00.000Z",
          },
        ],
        notionConnections: [],
      }),
      "utf8",
    );

    const profiles = await listParentProfiles();

    expect(profiles.map((profile) => profile.parent.id)).toEqual([
      "parent-newer",
      "parent-older",
    ]);
    expect(profiles.map((profile) => profile.student.studentName)).toEqual([
      "Milo",
      "Ava",
    ]);
  });

  test("returns a profile by parent id when it exists", async () => {
    const profile = await getOrCreateParentProfile({
      email: "parent@example.com",
      fullName: "Parent Example",
      studentName: "Katherine",
    });

    const loaded = await getProfileByParentId(profile.parent.id);

    expect(loaded?.parent.email).toBe("parent@example.com");
    expect(loaded?.student.studentName).toBe("Katherine");
  });

  test("returns null when loading an unknown parent id", async () => {
    const loaded = await getProfileByParentId("missing-parent-id");

    expect(loaded).toBeNull();
  });

  test("formats trial and renewal timing in the billing summary", async () => {
    await getOrCreateParentProfile({
      email: "parent@example.com",
      fullName: "Parent Example",
      studentName: "Katherine",
    });

    const trialProfile = await getProfileByEmail("parent@example.com");
    const trialSummary = getBillingSummary(trialProfile!.parent);

    expect(trialSummary.summaryRows.some((row) => row.label === "Trial started on")).toBe(
      true,
    );
    expect(trialSummary.summaryRows.some((row) => row.label === "Trial ends on")).toBe(
      true,
    );
    expect(
      trialSummary.summaryRows.find((row) => row.label === "Trial ends on")?.value,
    ).toMatch(
      /2026|March|April|May|June|July|August|September|October|November|December|January|February/i,
    );

    await updateParentSubscription("parent@example.com", {
      subscriptionPlan: "monthly",
      subscriptionStatus: "trial",
    });

    const pendingProfile = await getProfileByEmail("parent@example.com");
    const pendingSummary = getBillingSummary(pendingProfile!.parent);

    expect(pendingSummary.title).toBe("Trial access");
    expect(pendingSummary.subtitle).toBe(
      "Monthly plan chosen for your account.",
    );
    expect(pendingSummary.detail).toBe(
      "Complete Stripe checkout before trial ends to activate this subscription.",
    );
    expect(
      pendingSummary.summaryRows.some((row) => row.label === "Selected next plan"),
    ).toBe(false);

    await updateParentSubscription("parent@example.com", {
      subscriptionPlan: "monthly",
      subscriptionStatus: "active",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionActivatedAt: "2026-03-31T00:00:00.000Z",
      subscriptionRenewalAt: "2026-04-30T00:00:00.000Z",
    });

    const activeProfile = await getProfileByEmail("parent@example.com");
    const activeSummary = getBillingSummary(activeProfile!.parent);

    expect(activeSummary.summaryRows.some((row) => row.label === "Renews on")).toBe(
      true,
    );
    expect(
      activeSummary.summaryRows.find((row) => row.label === "Renews on")?.value,
    ).toMatch(
      /2026|March|April|May|June|July|August|September|October|November|December|January|February/i,
    );
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

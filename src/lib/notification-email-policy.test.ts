import { describe, expect, test } from "vitest";

import {
  getNotificationEmailPolicy,
  listLiveNotificationEmailPolicies,
} from "./notification-email-policy";

describe("notification email policy", () => {
  test("classifies onboarding reminders as live HTML notifications", () => {
    const policy = getNotificationEmailPolicy("onboarding-reminder");

    expect(policy).toMatchObject({
      id: "onboarding-reminder",
      lifecycle: "live",
      renderMode: "html-notification",
      assetMode: "html-only",
      audience: "parent-inbox",
    });
  });

  test("keeps goodnotes welcome note and daily brief delivery as PDF transports", () => {
    expect(
      getNotificationEmailPolicy("goodnotes-welcome-note-delivery"),
    ).toMatchObject({
      renderMode: "pdf-attachment-transport",
      assetMode: "pdf-attachment",
      audience: "goodnotes-destination",
    });

    expect(getNotificationEmailPolicy("daily-brief-delivery")).toMatchObject({
      renderMode: "pdf-attachment-transport",
      assetMode: "pdf-attachment",
      audience: "goodnotes-destination",
    });
  });

  test("lists live policies without mixing in planned notification families", () => {
    expect(listLiveNotificationEmailPolicies().map((policy) => policy.id)).toEqual([
      "onboarding-reminder",
      "goodnotes-welcome-note-delivery",
      "daily-brief-delivery",
    ]);
  });
});


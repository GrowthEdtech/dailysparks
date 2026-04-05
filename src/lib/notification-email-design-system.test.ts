import { describe, expect, test } from "vitest";

import { buildNotificationEmail } from "./notification-email-design-system";

describe("notification email design system", () => {
  test("builds an email-safe HTML shell with preview text, panels, CTA, and text fallback", () => {
    const email = buildNotificationEmail({
      previewText: "Preview copy",
      eyebrow: "Growth Education Limited",
      title: "Your setup is almost ready",
      intro: "Connect Goodnotes to begin receiving Daily Sparks.",
      panels: [
        {
          eyebrow: "Recommended first step",
          body: "Connect Goodnotes first for the simplest setup.",
          tone: "primary",
        },
        {
          eyebrow: "Delivery window",
          body: "Your current delivery window is 9:00 AM · Asia/Hong_Kong.",
          tone: "accent",
        },
      ],
      bodyParagraphs: ["Notion is optional if you would also like an archive workspace."],
      bulletSections: [
        {
          title: "Next steps",
          items: ["Connect Goodnotes", "Confirm your preferred delivery time"],
        },
      ],
      primaryAction: {
        label: "Connect Goodnotes",
        href: "https://dailysparks.geledtech.com/dashboard",
      },
      supportingNote: "You can update your timezone from the dashboard at any time.",
      signature: "Growth Education Limited",
    });

    expect(email.html).toContain("<table role=\"presentation\"");
    expect(email.html).toContain("Preview copy");
    expect(email.html).toContain("Connect Goodnotes");
    expect(email.html).toContain("#fffdfa");
    expect(email.html).toContain("#eef6ff");
    expect(email.html).toContain("#fff7e8");
    expect(email.text).toContain("Your setup is almost ready");
    expect(email.text).toContain("Recommended first step");
    expect(email.text).toContain("Connect Goodnotes: https://dailysparks.geledtech.com/dashboard");
  });
});

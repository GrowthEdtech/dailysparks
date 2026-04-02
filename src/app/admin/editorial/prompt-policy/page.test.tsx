import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { listPromptPoliciesMock } = vi.hoisted(() => ({
  listPromptPoliciesMock: vi.fn(),
}));

vi.mock("../../../../lib/prompt-policy-store", () => ({
  listPromptPolicies: listPromptPoliciesMock,
}));

import PromptPolicyAdminPage from "./page";

describe("PromptPolicyAdminPage", () => {
  beforeEach(() => {
    listPromptPoliciesMock.mockReset();
  });

  test("renders an honest empty state when no prompt policies exist", async () => {
    listPromptPoliciesMock.mockResolvedValue([]);

    const markup = renderToStaticMarkup(await PromptPolicyAdminPage());

    expect(markup).toContain("No prompt policies yet");
    expect(markup).toContain("Create the first active policy");
  });

  test("renders the active prompt policy summary when records exist", async () => {
    listPromptPoliciesMock.mockResolvedValue([
      {
        id: "policy-1",
        name: "Family Daily Sparks Core",
        versionLabel: "v1.0.0",
        status: "active",
        sharedInstructions: "Shared",
        antiRepetitionInstructions: "Anti repetition",
        outputContractInstructions: "Output contract",
        pypInstructions: "PYP",
        mypInstructions: "MYP",
        dpInstructions: "DP",
        notes: "Live policy",
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
        activatedAt: "2026-04-02T00:00:00.000Z",
      },
    ]);

    const markup = renderToStaticMarkup(await PromptPolicyAdminPage());

    expect(markup).toContain("Active prompt policy");
    expect(markup).toContain("Family Daily Sparks Core");
    expect(markup).toContain("v1.0.0");
    expect(markup).toContain("/admin/editorial/prompt-policy/policy-1");
    expect(markup).toContain("Open active policy");
    expect(markup).toContain("text-slate-700");
    expect(markup).toContain("border-slate-300");
  });
});

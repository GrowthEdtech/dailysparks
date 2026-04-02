import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { getPromptPolicyMock, notFoundMock } = vi.hoisted(() => ({
  getPromptPolicyMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("../../../../../lib/prompt-policy-store", () => ({
  getPromptPolicy: getPromptPolicyMock,
  buildResolvedPromptPreviewByProgramme: vi.fn((policy) => ({
    PYP: `PYP:${policy.sharedInstructions}`,
    MYP: `MYP:${policy.sharedInstructions}`,
    DP: `DP:${policy.sharedInstructions}`,
  })),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import PromptPolicyDetailPage from "./page";

describe("PromptPolicyDetailPage", () => {
  beforeEach(() => {
    getPromptPolicyMock.mockReset();
    notFoundMock.mockClear();
  });

  test("renders a prompt policy detail page with resolved preview", async () => {
    getPromptPolicyMock.mockResolvedValue({
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
    });

    const markup = renderToStaticMarkup(
      await PromptPolicyDetailPage({
        params: Promise.resolve({ policyId: "policy-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Family Daily Sparks Core");
    expect(markup).toContain("Resolved prompt preview");
    expect(markup).toContain("PYP:Shared");
  });

  test("triggers the not-found flow when the policy does not exist", async () => {
    getPromptPolicyMock.mockResolvedValue(null);

    await expect(
      PromptPolicyDetailPage({
        params: Promise.resolve({ policyId: "missing-policy" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });
});

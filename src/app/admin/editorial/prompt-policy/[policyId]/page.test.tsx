import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { buildDefaultPromptPolicyInputMock, getPromptPolicyMock, notFoundMock } =
  vi.hoisted(() => ({
    buildDefaultPromptPolicyInputMock: vi.fn(() => ({
      name: "Family Daily Sparks Core",
      versionLabel: "v1.1.0",
      sharedInstructions: "Shared v1.1.0",
      antiRepetitionInstructions: "Anti repetition v1.1.0",
      outputContractInstructions: "Output contract v1.1.0",
      pypInstructions: "PYP v1.1.0",
      mypInstructions: "MYP v1.1.0",
      dpInstructions: "DP v1.1.0",
      notes: "Richer operating draft.",
    })),
  getPromptPolicyMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  }));

vi.mock("../../../../../lib/prompt-policy-store", () => ({
  buildDefaultPromptPolicyInput: buildDefaultPromptPolicyInputMock,
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
    buildDefaultPromptPolicyInputMock.mockClear();
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

  test("renders the richer default draft template for a new policy", async () => {
    const markup = renderToStaticMarkup(
      await PromptPolicyDetailPage({
        params: Promise.resolve({ policyId: "new" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(buildDefaultPromptPolicyInputMock).toHaveBeenCalled();
    expect(markup).toContain("Family Daily Sparks Core");
    expect(markup).toContain("Version v1.1.0");
    expect(markup).toContain("Richer operating draft.");
    expect(markup).toContain("PYP:Shared v1.1.0");
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

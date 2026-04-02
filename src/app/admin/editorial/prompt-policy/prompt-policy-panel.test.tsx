import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import PromptPolicyPanel from "./prompt-policy-panel";

describe("PromptPolicyPanel", () => {
  test("renders draft editing controls and resolved previews", () => {
    const markup = renderToStaticMarkup(
      <PromptPolicyPanel
        policy={{
          id: "policy-1",
          name: "Family Daily Sparks Core",
          versionLabel: "v1.0.0",
          status: "draft",
          sharedInstructions: "Shared",
          antiRepetitionInstructions: "Anti repetition",
          outputContractInstructions: "Output contract",
          pypInstructions: "PYP",
          mypInstructions: "MYP",
          dpInstructions: "DP",
          notes: "Draft policy",
          createdAt: "2026-04-02T00:00:00.000Z",
          updatedAt: "2026-04-02T00:00:00.000Z",
          activatedAt: null,
        }}
        resolvedPreviewByProgramme={{
          PYP: "PYP:Shared",
          MYP: "MYP:Shared",
          DP: "DP:Shared",
        }}
      />,
    );

    expect(markup).toContain("Save draft");
    expect(markup).toContain("Activate");
    expect(markup).toContain("Resolved prompt preview");
    expect(markup).toContain("Shared instructions");
  });

  test("renders duplicate-only controls for an active policy", () => {
    const markup = renderToStaticMarkup(
      <PromptPolicyPanel
        policy={{
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
          notes: "Active policy",
          createdAt: "2026-04-02T00:00:00.000Z",
          updatedAt: "2026-04-02T00:00:00.000Z",
          activatedAt: "2026-04-02T00:00:00.000Z",
        }}
        resolvedPreviewByProgramme={{
          PYP: "PYP:Shared",
          MYP: "MYP:Shared",
          DP: "DP:Shared",
        }}
      />,
    );

    expect(markup).toContain("Duplicate as new draft");
    expect(markup).not.toContain("Save draft");
  });
});

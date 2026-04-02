import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import EditorialAdminPanel from "./editorial-admin-panel";
import type { EditorialSourceRecord } from "../../../lib/editorial-source-store";
import { DAILY_SPARKS_REPETITION_POLICY } from "../../../lib/editorial-policy";

const initialSources: EditorialSourceRecord[] = [
  {
    id: "reuters",
    name: "Reuters",
    domain: "reuters.com",
    homepage: "https://www.reuters.com/",
    roles: ["daily-news"],
    usageTiers: ["primary-selection", "background-context"],
    recommendedProgrammes: ["MYP", "DP"],
    sections: ["world", "science"],
    ingestionMode: "metadata-only",
    active: true,
    notes: "Fast baseline reporting for major global developments.",
    seededFromPolicy: true,
    createdAt: "2026-04-02T00:00:00.000Z",
    updatedAt: "2026-04-02T00:00:00.000Z",
  },
];

describe("EditorialAdminPanel", () => {
  test("renders the source registry, creation form, and repetition policy summary", () => {
    const markup = renderToStaticMarkup(
      <EditorialAdminPanel
        initialSources={initialSources}
        repetitionPolicy={DAILY_SPARKS_REPETITION_POLICY}
      />,
    );

    expect(markup).toContain("Editorial source registry");
    expect(markup).toContain("Add source");
    expect(markup).toContain("Reuters");
    expect(markup).toContain("14-day topic reset");
    expect(markup).toContain("30-day prompt memory");
  });
});

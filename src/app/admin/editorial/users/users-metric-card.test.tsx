import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import UsersMetricCard from "./users-metric-card";

describe("UsersMetricCard", () => {
  test("renders metric values with tabular alignment inside a fixed-height card", () => {
    const markup = renderToStaticMarkup(
      <UsersMetricCard
        label="Needs activation reminder"
        value={12}
        detail="3 deduped"
      />,
    );

    expect(markup).toContain("Needs activation reminder");
    expect(markup).toContain(">12<");
    expect(markup).toContain("3 deduped");
    expect(markup).toContain("tabular-nums");
    expect(markup).toContain("justify-between");
    expect(markup).toContain("min-h-[9.5rem]");
    expect(markup).toContain("min-h-[3.25rem]");
    expect(markup).toContain("min-h-[4.25rem]");
    expect(markup).toContain("min-h-[1.25rem]");
  });

  test("reserves the detail row even when a metric has no secondary text", () => {
    const markup = renderToStaticMarkup(
      <UsersMetricCard label="Total families" value={5} />,
    );

    expect(markup).toContain(">5<");
    expect(markup).toContain("min-h-[1.25rem]");
  });
});

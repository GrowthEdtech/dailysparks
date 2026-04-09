import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import UsersSectionHeader from "./users-section-header";

describe("UsersSectionHeader", () => {
  test("renders a shared users dashboard section header rhythm", () => {
    const markup = renderToStaticMarkup(
      <UsersSectionHeader
        eyebrow="Growth reconciliation"
        description="A once-daily ops view of revenue and first-delivery gaps that still need intervention."
        aside={
          <>
            <span className="font-semibold text-[#0f172a]">5</span> families checked
          </>
        }
      />,
    );

    expect(markup).toContain("Growth reconciliation");
    expect(markup).toContain("families checked");
    expect(markup).toContain("min-h-[6.5rem]");
    expect(markup).toContain("max-w-3xl");
    expect(markup).toContain("text-right");
    expect(markup).toContain("leading-6");
  });
});

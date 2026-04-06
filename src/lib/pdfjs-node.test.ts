import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, test } from "vitest";

import { configurePdfJsNodeRuntime } from "./pdfjs-node";

describe("configurePdfJsNodeRuntime", () => {
  test("configures worker and standard fonts for server-side pdfjs usage", () => {
    const config = configurePdfJsNodeRuntime();

    expect(config.workerSrc).toMatch(/^file:/);
    expect(config.workerSrc).toMatch(/pdf\.worker(\.min)?\.mjs$/);
    expect(config.standardFontDataUrl).toMatch(/^file:/);
    expect(config.standardFontDataUrl).toContain("/standard_fonts/");
    expect(GlobalWorkerOptions.workerSrc).toBe(config.workerSrc);
  });
});

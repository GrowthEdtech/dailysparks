import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { configurePdfJsNodeRuntime } from "./pdfjs-node";

export async function countPdfPages(pdfBytes: Uint8Array) {
  const { standardFontDataUrl } = configurePdfJsNodeRuntime();
  const loadingTask = getDocument({
    data: new Uint8Array(pdfBytes),
    useWorkerFetch: false,
    isEvalSupported: false,
    standardFontDataUrl: standardFontDataUrl ?? undefined,
  });
  const document = await loadingTask.promise;

  try {
    return document.numPages;
  } finally {
    await document.destroy();
  }
}

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function countPdfPages(pdfBytes: Uint8Array) {
  const loadingTask = getDocument({
    data: new Uint8Array(pdfBytes),
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const document = await loadingTask.promise;

  try {
    return document.numPages;
  } finally {
    await document.destroy();
  }
}

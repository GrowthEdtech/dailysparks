import {
  DOMMatrix,
  ImageData,
  Path2D,
  createCanvas,
} from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import type { DailyBriefHistoryRecord } from "./daily-brief-history-schema";
import { createOutboundDailyBriefPdf } from "./goodnotes-delivery";
import { renderOutboundDailyBriefTypstPrototype } from "./outbound-daily-brief-typst";
import { configurePdfJsNodeRuntime } from "./pdfjs-node";

function ensurePdfRenderGlobals() {
  if (!("DOMMatrix" in globalThis)) {
    Object.assign(globalThis, { DOMMatrix });
  }

  if (!("ImageData" in globalThis)) {
    Object.assign(globalThis, { ImageData });
  }

  if (!("Path2D" in globalThis)) {
    Object.assign(globalThis, { Path2D });
  }
}

async function renderPdfFirstPageThumbnailPng(pdfBytes: Uint8Array) {
  ensurePdfRenderGlobals();
  const { standardFontDataUrl } = configurePdfJsNodeRuntime();

  const loadingTask = getDocument({
    data: new Uint8Array(pdfBytes),
    useWorkerFetch: false,
    isEvalSupported: false,
    standardFontDataUrl: standardFontDataUrl ?? undefined,
  });

  const document = await loadingTask.promise;

  try {
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: 1.35 });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    const context = canvas.getContext("2d");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    page.cleanup();

    return Buffer.from(await canvas.encode("png"));
  } finally {
    await document.destroy();
  }
}

export async function renderDailyBriefThumbnailPng(
  brief: DailyBriefHistoryRecord,
) {
  const pdfBytes = await createOutboundDailyBriefPdf(brief);

  return renderPdfFirstPageThumbnailPng(pdfBytes);
}

export async function renderDailyBriefTypstThumbnailPng(
  brief: DailyBriefHistoryRecord,
) {
  const prototype = await renderOutboundDailyBriefTypstPrototype(brief);

  return renderPdfFirstPageThumbnailPng(new Uint8Array(prototype.pdf));
}

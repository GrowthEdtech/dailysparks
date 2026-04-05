import path from "node:path";
import { pathToFileURL } from "node:url";

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

function getStandardFontDataUrl() {
  try {
    const packagePath = require.resolve("pdfjs-dist/package.json");
    const fontsDirectory = path.join(path.dirname(packagePath), "standard_fonts");

    return pathToFileURL(`${fontsDirectory}${path.sep}`).href;
  } catch {
    return undefined;
  }
}

async function renderPdfFirstPageThumbnailPng(pdfBytes: Uint8Array) {
  ensurePdfRenderGlobals();

  const loadingTask = getDocument({
    data: pdfBytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    standardFontDataUrl: getStandardFontDataUrl(),
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

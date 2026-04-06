import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

function getPdfJsPackageDirectory() {
  const packagePath = require.resolve("pdfjs-dist/package.json");

  return path.dirname(packagePath);
}

function toDirectoryUrl(directoryPath: string) {
  return pathToFileURL(`${directoryPath}${path.sep}`).href;
}

function findExistingPdfJsPath(candidates: string[]) {
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export function getPdfJsStandardFontDataUrl() {
  const packageDirectory = getPdfJsPackageDirectory();
  const fontsDirectory = path.join(packageDirectory, "standard_fonts");

  return fs.existsSync(fontsDirectory) ? toDirectoryUrl(fontsDirectory) : null;
}

export function getPdfJsWorkerSrc() {
  const packageDirectory = getPdfJsPackageDirectory();
  const workerPath = findExistingPdfJsPath([
    path.join(packageDirectory, "legacy", "build", "pdf.worker.mjs"),
    path.join(packageDirectory, "legacy", "build", "pdf.worker.min.mjs"),
    path.join(packageDirectory, "build", "pdf.worker.mjs"),
    path.join(packageDirectory, "build", "pdf.worker.min.mjs"),
  ]);

  return workerPath ? pathToFileURL(workerPath).href : null;
}

export function configurePdfJsNodeRuntime() {
  const standardFontDataUrl = getPdfJsStandardFontDataUrl();
  const workerSrc = getPdfJsWorkerSrc();

  if (workerSrc) {
    GlobalWorkerOptions.workerSrc = workerSrc;
  }

  return {
    standardFontDataUrl,
    workerSrc,
  };
}

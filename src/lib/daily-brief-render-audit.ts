import { PDFDocument } from "pdf-lib";

import type { DailyBriefRenderAudit } from "./daily-brief-history-schema";
import type { DailyBriefPdfRenderer } from "./goodnotes-delivery";
import type { OutboundDailyBriefPacketInput } from "./outbound-daily-brief-packet";
import { buildOutboundDailyBriefPacket } from "./outbound-daily-brief-packet";

export async function buildDailyBriefRenderAudit({
  brief,
  pdfBytes,
  renderer,
  auditedAt = new Date().toISOString(),
}: {
  brief: OutboundDailyBriefPacketInput;
  pdfBytes: Uint8Array;
  renderer: DailyBriefPdfRenderer;
  auditedAt?: string;
}): Promise<DailyBriefRenderAudit> {
  const packet = buildOutboundDailyBriefPacket(brief);
  const pdfDocument = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDocument.getPageCount();
  const onePageCompliant =
    packet.layoutVariant === "pyp-one-page" ? pageCount === 1 : null;

  return {
    renderer,
    layoutVariant: packet.layoutVariant,
    pageCount,
    onePageCompliant,
    auditedAt,
  };
}
